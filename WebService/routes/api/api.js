var express = require('express');
var helper = require('./../../libs/helper_functions');

var router = express.Router();

const { check, validationResult } = require('express-validator'); //used for validating e-Mail adresses and other parameters

var pool = require('./../../libs/dbpool').pool; //db connection
var mailSender = require('./../../libs/mail'); 

var serviceUrl = "http://127.0.0.1:3000";



//API call for posting a new Measurement
router.all('/post', 
[  //Check the input for valid values
   check('cno2').exists({ checkFalsy: true }).isNumeric(),
   check('rawno2').exists({ checkFalsy: true }).isNumeric(),
   check('temperature').exists({ checkFalsy: true }).isNumeric(),
   check('humidity').exists({ checkFalsy: true }).isNumeric(),
   check('uuid').exists({ checkFalsy: true }).isLength({ min: 32, max: 32 })
],
function(req, res){
   var postdata = req.body;

   //Check if the posted values are valid
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      res.status(406).render('http_err', { code: '406', message: "Not Acceptable"})
      return
   }   

   if (typeof postdata.cno2 == 'undefined'){
      postdata = req.query;
   }
  
   //check if the user exists
   pool.query('SELECT * FROM users WHERE uuid = $1', [postdata.uuid], (err, userResult) => {
      if (err) {
         console.log(err);
         res.status(406).render('http_err', { code: '406', message: "Not Acceptable"})
      } else {
         //the UUID exists, write the data
         if(userResult['rowCount'] == 1){
            if(userResult.rows[0].activated == true){ //Only accept data from activated users
               pool.query('INSERT INTO measurements (stationid, cno2, rawno2, humidity, temperature, timestamp) VALUES ($1,$2,$3,$4,$5,$6)', [userResult.rows[0].stationid, postdata.cno2, postdata.rawno2, postdata.humidity, postdata.temperature, new Date()], (insertErr, result) => {
                  if (insertErr) {
                       console.log(insertErr);
                       res.status(406).render('http_err', { code: '406', message: "Not Acceptable"})
                  } else {
                   // console.log( new Date() + " Station " + userResult.rows[0].stationid + ": " + postdata.cno2 )
                     res.status(402).render('http_err', { code: '402', message: "Accepted"})
                  }
               })
            } else {
                 res.status(406).render('http_err', { code: '406', message: "Not Acceptable"})
            }
         } else {
             res.status(406).render('http_err', { code: '406', message: "Not Acceptable"})
         }
      }//if err else
    })//UUID Select
});


//Registers a user with a combination of a E-Mail address and a password.
router.post('/register', 
[
   check('mailAdress').normalizeEmail().isEmail(),
   check('password').isLength({ min: 6 }),
   check('passwordrepeat').isLength({ min: 6 }),
   check('latitude').isFloat(),
   check('longitude').isFloat()
],
function(req, res){
   var postdata = req.body;

   //Check if the posted values are valid
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      res.status(406).render('http_err', { code: '406', message: "Not Acceptable"})
      return
   }

   if (postdata.password != postdata.passwordrepeat){
      res.status(406).render('http_err', { code: '406', message: "Passwörter stimmen nicht überein!"})
      return
   }

   pool.connect((err, client, done) => {
      const shouldAbort = err => {
         if (err) {
            res.status(406).render('http_err', { code: '406', message: "Not Acceptable"});

            console.error('Error in transaction', err.stack)
            client.query('ROLLBACK', err => {
               if (err) {
                  console.error('Error rolling back client', err.stack)
               }
               // release the client back to the pool
               done()
            })
         }
         return !!err
      }
      
      //Successfull registration
      const success = err => {
         if (err) {
            res.status(402).render('registersuccess', { code: '402', message: "Ok"});
         }
      }

      //Begin transaction
      client.query('BEGIN', err => {
         if (shouldAbort(err)) return
            //Check if there is no user with the given E-Mail adress
            client.query('SELECT * FROM users WHERE mailaddress = $1', [postdata.mailAdress], (err, userResult) => {
            
               if (shouldAbort(err)) return
               if(userResult['rowCount'] == 0 ){  
                  var newUserUUID = helper.generateUUID();
                  //Insert station into stations
                  client.query('INSERT INTO stations (useruuid, latitude, longitude) VALUES ($1,$2,$3)', [newUserUUID, parseFloat(postdata.latitude).toFixed(4) ,parseFloat(postdata.longitude).toFixed(4)], (err, res) => {
                     if (shouldAbort(err)) return
                     
                     //Get the ID of the new Station
                     client.query('SELECT * FROM stations WHERE useruuid = $1', [newUserUUID], (err, getStationIDResult) => {
                        if (shouldAbort(err)) return

                        stationID = getStationIDResult.rows[0].stationid;

                        client.query('INSERT INTO users (uuid, mailaddress, hashedpassword, activated, stationID) VALUES ($1,$2,$3,$4,$5)', [newUserUUID, postdata.mailAdress, helper.hashPWData(postdata.password,newUserUUID), false, stationID], (err, insertUserResult) => {
                           if (shouldAbort(err)) return

                           var transactioncode = helper.generateUUID() + helper.generateUUID();
                           client.query( 'INSERT INTO transactions (transactioncode, query, responsepage) VALUES ($1,$2,$3)', [transactioncode,"UPDATE users SET activated = true WHERE uuid='" + newUserUUID + "'", 'successactivation'], (err, insertTransactionResult) => {
                              if (shouldAbort(err)) return
 
                              //Send the registration mail
                              var mailContent = {
                                 from: mailSender.mailSettings.options.auth.user,
                                 to: postdata.mailAdress,
                                 subject: 'Registration',
                                 text:"Hallo! \n\n Schön dass du dich bei openNOx registriert hast! Dein Aktivierungslink lautet wie folgt: \n" + serviceUrl + '/api/verifymail?transactioncode=' + transactioncode + "\n\n Danke für deine Teilnahme!"
                              };
                              
                              mailSender.sendMail(mailContent)

                              success();

                              client.query('COMMIT', err => {
                                 if (err) {
                                    console.error('Error committing transaction', err.stack);
                                 }
                                 done();
                              })//COMMIT
                           })//'INSERT INTO transactions (transactioncode, query, responsepage) VALUES ($1,$2,$3)'
                        })
                     })//'SELECT * FROM stations WHERE useruuid = $1'

                  })//'INSERT INTO stations (useruuid, coordinates) VALUES ($1,$2)'
               } else {
                  
                  //TODO Send activation email again
                  res.status(406).render('http_err', { code: '406', message: "User exists"})
                  client.query('ROLLBACK', err => {
                     if (err) {
                        console.error('Error rolling back client', err.stack)
                     }
                     // release the client back to the pool
                     done()
                  })
               }
            })//'SELECT * FROM users WHERE mailaddress = $1'
         })
      })//BEGIN
});


//Veryfies the account with a activtion link which was send to the User per Mail
router.all('/verifymail', 
[
   check('transactioncode'),
],
function(req, res){
   var postdata = req.body;

   //Check if the posted values are valid
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      res.status(406).render('http_err', { code: '406', message: "Not Acceptable"})
      return
   }

   if (typeof postdata.transactioncode == 'undefined'){
      postdata = req.query;
   }

   pool.query('SELECT * FROM transactions WHERE transactioncode = $1', [postdata.transactioncode], (transactioncodeErr, transactionResult) => {
       if (transactioncodeErr) {
         console.log(transactioncodeErr);
         res.status(406).render('http_err', { code: '406', message: "Not Acceptable"});
       } else {
         if(transactionResult.rowCount != 0){
           pool.query(transactionResult.rows[0].query, (queryErr, queryResult) => {
             if (queryErr) {
               console.log(queryErr);
               res.status(406).render('http_err', { code: '406', message: "Not Acceptable"});
             } else {
               pool.query('DELETE FROM transactions WHERE transactioncode = $1', [postdata.transactioncode], (delErr, deleteResult) => {
                 if (delErr) {
                   console.log(delErr);
                   res.status(406).render('http_err', { code: '406', message: "Not Acceptable"});
                 } else {
                  //Okay Response
                  res.status(402).render('http_err', { code: '402', message: "Registrierung erfolgreich!", sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID});
                 }
               }) // DELETE FROM transactions WHERE transactioncode 
             }
           }) // transactionResult.rows[0].query
         }
       } //if err else
     }) // SELECT * FROM transactions WHERE transactioncode
 });


 //Returns the historic data for a given station to the client
router.get('/gethistoric/:stationID', 
function(req, res){
   var stationID = req.params.stationID;

   pool.query('SELECT * FROM measurements WHERE  stationid  = $1', [stationID], (err, historicResult) => {
      if (err) {
         console.log(err);
         res.status(406).render('http_err', { code: '404', message: "Station not found"});
      } else {
         res.writeHead(200, {'Content-Type': 'application/json'});
         res.end(JSON.stringify(historicResult.rows));
      }
   })
});
 


 //Returns the last measurement of all Stations
router.get('/getmeasurements', 
[],
function(req, res){
   pool.query('SELECT stations.stationid, stations.official, latitude, longitude, timestamp, cno2, humidity, temperature FROM measurements AS t1 INNER JOIN (SELECT stationid, MAX(measurementid) as measurementid FROM measurements GROUP BY stationid) AS t2 ON t2.measurementid = t1.measurementid INNER JOIN stations ON t1.stationid = stations.stationid;', (err, result) => {
      if (err) {
         console.log(err);
         res.status(406).render('http_err', { code: '406', message: "Not Acceptable"});
      } else {
         res.writeHead(200, {'Content-Type': 'application/json'});
         res.end(JSON.stringify(result.rows));
      }
   })
 });
 

 //Login a client
 router.post('/login', 
 [
   check('mailAdress').normalizeEmail().isEmail(),
   check('password').isLength({ min: 6 })
 ],
 function(req, res){

   var postdata = req.body;
   //Check if the posted values are valid
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      res.status(406).render('http_err', { code: '406', message: "Not Acceptable"});
      return
   }

   //Query the user and check if the transmited, hashed password is equal to the stored passwordhash 
   pool.query('SELECT * FROM users WHERE mailaddress = $1', [postdata.mailAdress], (insertErr, result) => {
      if(result['rowCount'] == 1){
         if(helper.hashPWData(postdata.password, result.rows[0].uuid) == result.rows[0].hashedpassword){
            if (req.session.logedIn) {
               res.end('woop!')
             } else {
               req.session.logedIn = true;
               req.session.UserID = result.rows[0].uuid;
               req.session.StationID = result.rows[0].stationid
               req.session.activated = result.rows[0].activated
               res.redirect('/');
             }
         } else {//Password not correct
            res.status(406).render('http_err', { code: '406', message: "Not Acceptable"});
         }
      }
   });//'SELECT * FROM users WHERE mailaddress = $1'
 });


//Logs a client out
router.get('/logout', function(req, res){
   req.session.destroy();
   res.redirect('/');
});


//Changes the geographical position of the Sensor
router.post('/setsensorpos', 
[
   check('latitude').isFloat(),
   check('longitude').isFloat()
],
function(req, res){
   var postdata = req.body;
   //Check if the posted values are valid
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      res.status(406).render('http_err', { code: '406', message: "Not Acceptable"});
      return
   }

  //check if the user exists
   pool.query('SELECT * FROM users WHERE uuid = $1', [req.session.UserID], (err, userResult) => {
      if (err) {
         console.log(err);
         res.status(406).render('http_err', { code: '406', message: "Not Acceptable"})
      } else {
         //the UUID exists, write the data
         if(userResult['rowCount'] == 1){
            pool.query('UPDATE stations SET latitude = ($1), longitude = ($2) WHERE stationid = ($3)', [parseFloat(postdata.latitude).toFixed(4) ,parseFloat(postdata.longitude).toFixed(4), userResult.rows[0].stationid], (insertErr, result) => {
               res.redirect('../mystation');
            })
         } else {
            res.status(406).render('http_err', { code: '406', message: "Not Acceptable", sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID})
         }
      }//if err else
   })//UUID Select
}); 

 //changes the userpassword to a new one.
 //The user must be logged in to perform this action
router.post('/changepassword', 
[
  check('oldpassword').isLength({ min: 6 }),
  check('newpassword').isLength({ min: 6 }),
  check('newpasswordrepeat').isLength({ min: 6 })
],
function(req, res){

   var postdata = req.body;
   //Check if the posted values are valid
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      res.status(406).render('http_err', { code: '406', message: "Not Acceptable"});
      return
   }
   
   if(req.session.newpassword == req.session.newpasswordrepeat) {
      //Select user from Database
      pool.query('SELECT * FROM users WHERE uuid = $1', [req.session.UserID], (insertErr, result) => {
         if(result['rowCount'] == 1){
            //Check if the Old password is correct
            if(helper.hashPWData(postdata.oldpassword, result.rows[0].uuid) == result.rows[0].hashedpassword){
               
               //Update the Password
               pool.query('UPDATE users SET hashedpassword = ($1) WHERE uuid = ($2)', [helper.hashPWData(postdata.newpassword, result.rows[0].uuid), result.rows[0].uuid], (insertErr, result) => {
                  res.status(406).render('http_err', { code: '400', message: "Password changed successfully!", sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID});
               })

            } else {//Password not correct
               res.status(406).render('http_err', { code: '406', message: "The old Password is not correct!", sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID});
            }
         }
      });//'SELECT * FROM users WHERE mailaddress = $1'
   }else {
      res.status(406).render('http_err', { code: '406', message: "The Password and repeat Password Field do not match!", sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID});
   }//password == passwordrepead
});


//Removes a user and his station from the Database
router.post('/unregister', 
[
   check('password').isLength({ min: 6 }),
],
function(req, res){
  
   var postdata = req.body;
   //Check if the posted values are valid
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      res.status(406).render('http_err', { code: '406', message: "Not Acceptable",  sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID});
      return;
   }

   if(req.session.logedIn == true){
      pool.query('SELECT * FROM users WHERE uuid = $1', [req.session.UserID], (Err, result) => {
         if(result['rowCount'] == 1){
         if(helper.hashPWData(postdata.password, result.rows[0].uuid) == result.rows[0].hashedpassword){
             pool.query('DELETE FROM users WHERE uuid = $1', [req.session.UserID], (Err, result) => {
                  pool.query('DELETE FROM stations WHERE uuid = $1', [req.session.UserID], (Err, result) => {
                     req.session.destroy();
                     res.status(406).render('http_err', { code: 'Löschung erfolgreich!', message: "Account und Messstation erfolgreich gelöscht!"});
                  });
               });//Delete the user and his station
            } else {
               res.status(406).render('http_err', { code: '406', message: "The password is not correct!", sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID});
            } //Check password
         }
      }); //Select user
   } else {
      res.status(406).render('http_err', { code: '406', message: "Not logged in!"});
   }
});


//--------------TODO
 //Requests a reset email 
router.post('/requestpw', 
[
  check('mailAdress').normalizeEmail().isEmail(),
],
function(req, res){

   var postdata = req.body;
   //Check if the posted values are valid
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      res.status(406).render('http_err', { code: '406', message: "Not Acceptable"});
      return
   }

   pool.query('SELECT * FROM users WHERE uuid = $1', [req.session.UserID], (insertErr, result) => {
      if(result['rowCount'] == 1){
         
      }
   });

//TODO
});


//Default route back if a wrong request is send
router.get('/:route', function(req, res){
   res.redirect('/' + req.params.route);
});

//export this router to use in our index.js
module.exports = router;