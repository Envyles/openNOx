#include "memory_manager.h"


void memoryManager::init(){
  EEPROM.begin(250);
}

//Loads the SSID from the EEPROM
//it stops after 32 chars or when it reads a 0
String memoryManager::loadSSID(){
  String tmpStr;
  tmpStr = "";
  byte read;
      
  for(int i = 0; i<32; i++){
    read = EEPROM.read(i +32);
    if (read == 0){ return tmpStr; } //0 is the end marker for the String
      tmpStr = tmpStr + (char) read;
    }
  return tmpStr;
}

//Stores the SSID into the EEPROM
boolean memoryManager::storeSSID(String SSID){
  //Wifi Passwords have a maximum length of 32 an a minimum length of 8
  if (SSID.length() > 32){
    return false;
  } else {
    for(int i = 0; i<32; i++){
      if (SSID.length() == i){
        EEPROM.write(32 + i,0 );
        EEPROM.commit();
        return true; 
      } else {
        EEPROM.write(32 + i, SSID[i]);
      }//Password length 
    }// for
  }
  EEPROM.commit();
  return true;
}

//Loads the Password from the EEPROM
//it stops after 32 chars or when it reads a 0
String memoryManager::loadWLanPassword(){
  String tmpStr;
  tmpStr = "";
  byte read;
      
  for(int i = 0; i<32; i++){
    read = EEPROM.read(i);
    if (read == 0){ return tmpStr; } //0 is the end marker for the String
    tmpStr = tmpStr + (char) read;
  }
  return tmpStr;
}

//Stores the Password on the EEPROM
//Checks for minimum and maximum length
boolean memoryManager::storeWLanPassword(String password){
//Wifi Passwords have a maximum length of 32 an a minimum length of 8
  if (password.length() > 32 || password.length() < 8){
    return false;
  } else {
    for(int i = 0; i<32; i++){
      if (password.length() == i){
        EEPROM.write(i ,0 );
        EEPROM.commit();
        return true; 
      } else {
        EEPROM.write(i, password[i]);
      }//Password length 
    }// for
  }
  EEPROM.commit();
  return true;
 }

//Loads the UserID from the EEPROM
//it stops after 32 chars or when it reads a 0
String memoryManager::loadUserID(){
  String tmpStr;
  tmpStr = "";
  byte read;
      
  for(int i = 0; i<32; i++){
    read = EEPROM.read(i + 64);
    if (read == 0){ return tmpStr; } //0 is the end marker for the String
      tmpStr = tmpStr + (char) read;
    }
  return tmpStr;
 }

//Stores the UserID on the EEPROM
//Checks for minimum and maximum length
boolean memoryManager::storeUserID(String password){
  //Wifi Passwords have a maximum length of 32 an a minimum length of 8
  if (password.length() > 32 || password.length() < 8){
    return false;
  } else {
    for(int i = 0; i<32; i++){
      if (password.length() == i){
        EEPROM.write(i + 64,0 );
        EEPROM.commit();
        return true; 
      } else {
        EEPROM.write(i + 64, password[i]);
      }//Password length 
    }// for
  }
  EEPROM.commit();
  return true;
}


//Safes which Type the DHT sensor has
void memoryManager::storeDHTType(byte sensorNr){
  EEPROM.put( 97 , sensorNr );
}
    
//Loads the type of the DHT sensor
byte memoryManager::loadDHTType(){
  byte b = 0;
  EEPROM.get( 97, b );
  //Check if its a valid dht number
  if (b != 11 && b != 12 && b != 22){
    b = 11;
  }
  return b;
}


//Safes up to three floats per sensor
void memoryManager::safeCalibrationData(int sensorNr,int valueNr, float value){
  EEPROM.put(98 + sizeof(float)*sensorNr*3 + sizeof(float)*valueNr , value);
}
    
//Loads the calibration data
float memoryManager::loadCalibrationData(int sensorNr,int valueNr){
  float f = 0.00f;
  EEPROM.get( 98 + sizeof(float)*sensorNr*3 + sizeof(float)*valueNr, f);
  return f;
}
