//TODO Lizenz Open Source 
// Variablebennung 
// Funktionen mit mehreren aufrufen zu Transaktionen umbauen
// Mergen von Date + Time beim posten
// Anlegen der Datenbank wenn nicht vorhanden
// Comments schöner machen
//TODO Lizenzen der bibliotheken sammeln und verweise hinzufügen
// TODO Make a propper Registration mail

/*Web Service for the open source NO2 station.
/ This webservice provides the following API functions:
/ /api/register       - Registers a new User
/ /api/unregister     - Deletes a registerd User
/ /api/verifymail     - Verifys the E-Mail used for registration
/ /api/requestpw      - requests a new Password
/ /api/post           - Posts a new Measurement
/ /api/setsensorpos   - Sets the coordinates of the Sensor
/ /api/getmeasurements- Returns the current value of all Sensors
/ /api/gethistoric    - Reurns all historic data of a given station
*/



var https = require('https');
var http = require('http');         //TODO: change login to https
var url = require('url');
var fs = require('fs');             //Filesystem commands
var pg = require("pg");             //PostgreSQL
var mailer = require('nodemailer'); //e-mail functions
var crypto = require('crypto');     //Crypto functions dor storing passwords
const csv = require('csv-parse');   //CSV parsing functions

var serviceUrl = '127.0.0.1:8080';  //The url where the webservice runs. Its needed for the e-mail verification procedure


//Configuration for the PostgreSQL Connection
var dbConfig = {
  user: 'postgres',
  database: 'postgres', 
  password: 'postgres', 
  port: 5432, 
  idleTimeoutMillis: 60000,
  max: 20
};

//Configuration for the eMail Service
var mailSender = mailer.createTransport({
  service: 'hotmail',
  auth: {
    user: '',
    pass: ''
  }
});


//Pool is the prefered way for the pg Connection, since there will be a lot of simultanious, short requests and everyone of these woud need some time to reconnect.
var pool = new pg.Pool(dbConfig);

//HTTP request handler
http.createServer(function (request, response) {
  var q = url.parse(request.url, true);

  //Check if the request is a api command or a web request
  if (!q.pathname.includes('/api/')){
     
    //handle it like a basic Webserver request
      var filePath;
      if (q.pathname == '/') {
        filePath  = 'html/index.html';
      } else {
        filePath  = 'html'+ q.pathname;
      };
      
      //Replace .. to remove the posibility for someone to get a file from the parent directory of the html folder
      //so, as a example, /../main.js is not possible
      filePath = filePath.replace('..','')
      sendResponse(filePath, response);

  } else {
    //Handle the API call
    switch (q.pathname) {
      case '/api/post':
          postValue(q.query['UID'], q.query['cno2'], q.query['rawno2'], q.query['humidity'], q.query['temperature'], response);
        break;
      case '/api/register':
          register(q.query['mail'], q.query['password'], q.query['coordinates'], response);
        break;
      case '/api/unregister':
          unregister(q.query['mail'], q.query['password'],response);
        break;
      case '/api/verifymail':
          verifyMail(q.query['transactioncode'], response);
        break;
      case '/api/requestpw':
          requestPassword(q.query['mail'], response)
        break;
      case '/api/changepassword':
          changePassword(q.query['mail'], q.query['oldpassword'], q.query['newpassword'], response)
        break;
      case '/api/setsensorpos':
          changeSensorPos(q.query['mail'], q.query['password'], q.query['coordinates'], response)
        break;
      case '/api/getmeasurements':
          getmeasurements(response);
        break;
      case '/api/gethistoric':
          getHistoricData(q.query['stationid'], response);
        break;
      default: //no valid API call
          sendResponse('api_pages/error.html', response);
        break;
    };
  };
}).listen(8080); 



//Posts a measurement to the database
function postValue(UUID, cNO2, rawNO2 ,humidity, temperature, response) {
  //Check the input for valid values
  if(isNaN(cNO2) || isNaN(rawNO2) || isNaN(temperature) || isNaN(humidity) || UUID === null) {
    sendResponse('api_pages/not_accepted.html', response);
  } else {
    //Generating Timestamp, needs to get prepared, so the case: Day is generated at 1.1.19 23:59:59, time is generatet at 2.1.19 00:00:00 clock cant happen
    var curentDate = new Date();
    var today = curentDate.getDate() + '.' + curentDate.getMonth() + '.' + curentDate.getFullYear();
    var timeNow = curentDate.getHours() + ':' + curentDate.getMinutes() + ':' + curentDate.getSeconds();
    
    //Check the UUID Length //TODO 
   // if (UUID.length != 32){
   //   sendResponse('api_pages/not_accepted.html', response);
   // }

    //check if the user exists
    pool.query('SELECT * FROM users WHERE uuid = $1', [UUID], (err, userResult) => {
      if (err) {
        console.log(err);
        sendResponse('api_pages/not_accepted.html', response);
      } else {
        //the UUID exists, write the data
        if(userResult['rowCount'] == 1){
          if(userResult.rows[0].activated == true){ //Only accept data from activated users
            console.log( new Date() + userResult.rows[0].stationid + ":" +cNO2 )
            pool.query('INSERT INTO measurements (stationid, cno2, rawno2, humidity, temperature, date, time) VALUES ($1,$2,$3,$4,$5,$6,$7)', [userResult.rows[0].stationid, cNO2, rawNO2, humidity, temperature, today, timeNow], (insertErr, result) => {
              if (insertErr) {
                console.log(insertErr);
                sendResponse('api_pages/not_accepted.html', response);
              } else {
                sendResponse('api_pages/ok.html', response);
              }
            })
          }
        }
      }//if err else
    })//UUID Select
  } //Input value check
}//postValue


function register(mailAdress, password, coordinates, response){
  //check the input for valid values
  if(!(validMailAddress(mailAdress) && checkCorrectPassword(password) && checkCoordinates(coordinates))) { //todo
    sendResponse('api_pages/not_accepted.html', response);
    return false;
  } else {

    //check if the user exists //TODO resultpage
    pool.query('SELECT * FROM users WHERE mailaddress = $1', [mailAdress], (err, userResult) => {
      if (err) {
        console.log(err);
      } else {
        var newUserUUID = generateUUID();
        var checkedCoordinates = checkCoordinates(coordinates); //Try to format the input coordinates
        //TODO check Coordinates
        if(userResult['rowCount'] == 0 ){// && !isNaN(checkedCoordinates)){ //TODO When user.Result length not 0 -> check if the user is not activated if this is the case, resent the veryfication e-mail, else: give him the opporturnity to request a new Password
          //TODO Check PW Length
          //TODO E-Mail valid format?

          //if there is no usere registerd with this E-mail, start the registration. Insert The user
          //Insert a new Station
          pool.query('INSERT INTO stations (uuid, coordinates) VALUES ($1,$2)', [newUserUUID, '10.10,20.20'], (insertErr, insertStationResult) => {
            if (insertErr) {
              console.log(insertErr);
              sendResponse('api_pages/not_accepted.html', response);
              return false;
            }

            var stationID = 0;
            //get the ID of the new Station
            pool.query('SELECT * FROM stations WHERE uuid = $1', [newUserUUID], (err, getStationIDResult) => {
              if (err) {
                console.log(err);
                sendResponse('api_pages/not_accepted.html', response);
                return false;
              } else {
                stationID = getStationIDResult.rows[0].stationid;

                //Insert the new user
                pool.query('INSERT INTO users (uuid, mailaddress, hashedpassword, activated, stationID) VALUES ($1,$2,$3,$4,$5)', [newUserUUID, mailAdress, hashPWData(password,newUserUID), false, stationID], (insertErr, insertUserResult) => {
                  if (insertErr) {
                    console.log(insertErr);
                    sendResponse('api_pages/not_accepted.html', response);
                    return false;
                  }

                  var transactioncode = generateUUID() + generateUUID();
                  //Generate and send the registration link
                  pool.query('INSERT INTO transactions (transactioncode, query, responsepage) VALUES ($1,$2,$3)', [transactioncode,"UPDATE users SET activated = true WHERE uuid='" + newUserUUID + "'", 'ActivationSuccess.html'], (insertErr, insertTransactionResult) => {
                    if (insertErr) {
                      console.log(insertErr);
                      sendResponse('api_pages/not_accepted.html', response);
                      return false;
                    }

                    //Send the registration mail
                    var mailContent = {
                      from: mailSender.user,
                      to: mailAdress,
                      subject: 'Registration',
                      text: serviceUrl + '/api/verifymail?transactioncode=' + transactioncode
                    };
                    
                    mailSender.sendMail(mailContent, function(error, info){
                      if (error) {
                        console.log(error);
                        sendResponse('api_pages/not_accepted.html', response);
                      } else {
                        console.log('Email sent: ' + info.response);
                        sendResponse('api_pages/ok.html', response);
                      }
                    }); // Send mail
                  }) // INSERT INTO transactions
                }) // INSERT INTO users 
              }
            }) // SELECT * FROM stations 
          }) // INSERT INTO stations
        }
      } 
    }) //'SELECT * FROM users WHERE mailaddress 
  } 
  return false;
}


//Generates a random String as uid
function generateUUID(){
  var uuid = '';
  var symbolList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz'
  for(var i = 0; i < 32; i++){
    uuid = uuid + symbolList[parseInt(Math.random() * symbolList.length)];
  }
  return uuid;
}
 
//Hash the password, so it does not get safed in clear text. Im not Facebook, so i dont have any money to pay the lawyers
//Im using the UUID as the salt
function hashPWData(password, UUID) {
  return crypto.createHash('md5').update(password + UUID).digest("hex"); 
};

function verifyMail(transactioncode, response){
  if(false){
//TODO Check valid inputs
  } else {
    pool.query('SELECT * FROM transactions WHERE transactioncode = $1', [transactioncode], (transactioncodeErr, transactionResult) => {
      if (transactioncodeErr) {
        console.log(transactioncodeErr);
        sendResponse('api_pages/error.html', response);
      } else {
        if(transactionResult.length != 0){
          pool.query(transactionResult.rows[0].query, (queryErr, queryResult) => {
            if (queryErr) {
              console.log(queryErr);
              sendResponse('api_pages/error.html', response);
            } else {
              pool.query('DELETE FROM transactions WHERE transactioncode = $1', [transactioncode], (delErr, deleteResult) => {
                if (delErr) {
                  console.log(delErr);
                  sendResponse('api_pages/error.html', response);
                } else {
                  sendResponse('api_pages/' + transactionResult.rows[0].responsepage, response);
                }
              }) // DELETE FROM transactions WHERE transactioncode 
            }
          }) // transactionResult.rows[0].query
        }
      } //if err else
    }) // SELECT * FROM transactions WHERE transactioncode
  }
}

//Send a response to the client
function sendResponse(filePath, response){
  fs.readFile(filePath, function(err, data) { 
    if (err) {
      //File Not Found
      response.writeHead(404, {'Content-Type': 'text/html'});
      response.end("404 File Not Found");
    } else {
       //TODO Pictures etc ( https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types )
      response.writeHead(200, {'Content-Type': 'text/html'});
      response.end(data);
    }
  });
}

//Returns the historic data for a given station to the client
function getHistoricData(stationID, response){
  //check the input
  if(isNaN(stationID)){
    sendResponse('api_pages/error.html', response);
    return;
  }
  pool.query('SELECT * FROM measurements WHERE  stationid  = $1', [stationID], (err, historicResult) => {
    if (err) {
      console.log(err);
      sendResponse('api_pages/error.html', response);
    } else {
      response.writeHead(200, {'Content-Type': 'application/json'});
      response.end(JSON.stringify(historicResult.rows));
    }
  })
}

//TODO no old stations without measurements
function getmeasurements(response){
  pool.query('SELECT * FROM measurements AS t1 INNER JOIN (SELECT stationid, MAX(measurementid) as measurementid FROM measurements GROUP BY stationid) AS t2 ON t2.measurementid = t1.measurementid INNER JOIN stations ON t1.stationid = stations.stationid;', (err, result) => {
    if (err) {
      console.log(err);
      sendResponse('api_pages/error.html', response);
    } else {
      response.writeHead(200, {'Content-Type': 'application/json'});
      response.end(JSON.stringify(result.rows));
    }
  })
}


function unregister(eMail, password, response){
  return true; //TODO
}

//TODO https://tylermcginnis.com/validate-email-address-javascript/
function validMailAddress(eMailAddress){
  return true; //TODO
}

function checkCoordinates(coordinates){
  return true; // TODO
}

function checkCorrectPassword(password){
  return true; //TODO
}

function requestPassword(eMailAddress, response){
  return true; //TODO
}

function changePassword(eMailAddress, oldPassword, newPassword, response){
  return true; //TODO
}

function changeSensorPos(eMailAddress, password, coordinates, response){
  return true; //TODO
}

//-------------------------------------------------------------------------
//Reads the measured NOx data of all NRW Stations
//-------------------------------------------------------------------------
const CronJob = require('cron').CronJob;
const job = new CronJob('10,40 * * * * *', function() {

  //Request the CSV with the NOx Data
  https.get('https://www.opengeodata.nrw.de/produkte/umwelt_klima/luftqualitaet/luqs/aktuelle_luftqualitaet/OpenKontiLUQS_aktuelle-messwerte-24h.csv', (resp) => {
  var data = '';

  //called when some data has been recived
  resp.on('data', (chunk) => {
    data += chunk;
  });

  //Everything is recived, parse the CSV
  resp.on('end', () => {
    //Remove the first two lines of comments
    data = data.substr(data.indexOf('\n',data.indexOf('\n')+1 )+1); 
    
    //Parse the CSV
    csv(data, {
      skip_lines_with_error: true,
      delimiter: ';'
    }, function(err, output){
      //Search rows with NO2 Data
      for(var i = 0; i<output[output.length-1].length; i++){
        if(output[0][i].indexOf("NO2") != -1){
          (function() {
            var j = i;
            //Search the stationid of the Station
            pool.query('SELECT * FROM users WHERE uuid = $1', [output[0][j].substr(0,4)], (err, userResult) => {
              if (err) {
                console.log(err);
              } else {
                //A UUID exists, write the data
                if(userResult['rowCount'] == 1){

                  //Check if the values are under or over the detection level and format em
                  var measuredValue = output[output.length-1][j];
                  if(measuredValue.indexOf("<") != -1){
                    measuredValue = 0;
                  } else if (measuredValue.indexOf(">") != -1){
                    measuredValue = measuredValue.replace(">","");
                  }
                  //Insert the measured Data into the Database
                  pool.query('INSERT INTO measurements (stationid, cno2, date, time) VALUES ($1,$2,$3,$4)', [userResult.rows[0].stationid, measuredValue, output[output.length-1][0], output[output.length-1][1]], (insertErr, result) => {
                    if (insertErr) {
                      console.log(insertErr);
                    } 
                  })
                }//if(userResult['rowCount'] == 1)
              }
            })//'SELECT * FROM users WHERE uuid = $1'
          })();//var j = i;
        }//output[0][i].indexOf("NO2") != -1
      }
    })
  }); //csv(data, 

  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });
  
});
job.start();
