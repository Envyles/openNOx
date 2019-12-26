#ifndef MEMORYMANAGER_H
#define MEMORYMANAGER_H
#include <EEPROM.h>

/********************************************************
 * Manages the Memory of the EEPROM for the             *
 * NOx Measurement Station                              *
 ********************************************************/

//Manages the memory of the ESP32
class memoryManager {  
  public:  

    void init();

    //Loads the SSID from the EEPROM
    //it stops after 32 chars or when it reads a 0
    String loadSSID();

    //Stores the SSID into the EEPROM
    boolean storeSSID(String SSID);
  
    //Loads the Password from the EEPROM
    //it stops after 32 chars or when it reads a 0
    String loadWLanPassword();
  
    //Stores the Password on the EEPROM
    //Checks for minimum and maximum length
    boolean storeWLanPassword(String password);

    //Loads the UserID from the EEPROM
    //it stops after 32 chars or when it reads a 0
    String loadUserID();
  
    //Stores the UserID on the EEPROM
    //Checks for minimum and maximum length
    boolean storeUserID(String password);
    
    //Safes up to three floats per sensor
    void safeCalibrationData(int sensorNr,int valueNr, float value);
    
    //Loads the calibration data
    float loadCalibrationData(int sensorNr,int valueNr);

    //Safes which Type the DHT sensor has
    void storeDHTType(byte sensorNr);
    
    //Loads the type of the DHT sensor
    byte loadDHTType();
        
};  

#endif
