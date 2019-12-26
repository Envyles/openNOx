//-------------------------------------------------------------------------
//-       Reads the measured NOx data of all NRW Stations                 -
//-------------------------------------------------------------------------
var CronJob = require('cron').CronJob;
var https = require('https');
var csv = require('csv-parse');   //CSV parsing functions
var pool = require('./../dbpool').pool; //db connection


const job = new CronJob('10 * * * * *', function() {

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
      try {
        for(var i = 0; i<output[output.length-1].length; i++){
          if(output[0][i].indexOf("NO2") != -1){
            (function() {
              var j = i;
              //Search the stationid of the Station
              pool.query('SELECT * FROM stations WHERE useruuid = $1', [output[0][j].substr(0,4)], (err, userResult) => {
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
                    pool.query('INSERT INTO measurements (stationid, cno2, timestamp) VALUES ($1,$2,$3)', [userResult.rows[0].stationid, measuredValue, output[output.length-1][0] +" "+ output[output.length-1][1]], (insertErr, result) => {
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
      }
      catch (e) {
        console.log(e);
      } //Catch if the Data is currently not availible
    })
  }); //csv(data, 

  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });
  
});

module.exports = { job };
