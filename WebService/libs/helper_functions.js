//-------------------------------------------------------------------------
//-       Helper functions for the Cryptography and UUID                 -
//-------------------------------------------------------------------------

var crypto = require('crypto');     //Crypto functions for storing passwords

//Generates a random String as uid
exports.generateUUID = function(){
  var uuid = '';
  var symbolList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz'
  for(var i = 0; i < 32; i++){
    uuid = uuid + symbolList[parseInt(Math.random() * symbolList.length)];
  }
  return uuid;
}

//Hash the password, so it does not get safed in clear text. Im not Facebook, so i dont have any money to pay the lawyers
//Im using the UUID as the salt
exports.hashPWData = function(password, UUID){
  return crypto.createHash('md5').update(password + UUID).digest("hex"); 
};