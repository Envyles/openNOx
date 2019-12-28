/**************************************************************
 * NOx messstation                                            *
 * TODO: Page in eigene Klasse                                *
 *************************************************************/

#include "dht.h"
#include <WiFi.h>
#include <WiFiAP.h>
#include <EEPROM.h>
#include <HTTPClient.h>

#include "memory_manager.h"
#include "chart.js.h"
#include "internal_page.h"



//Sensorparameter
#define COpin 34
#define NOpin 33
#define DHTPin 27
#define targetAddress "85.214.226.136:3000"
#define timeBetweenMeasurements 5000


/************************************************************************
 * Function definitions for the compiler                                *
 ************************************************************************/
boolean connectToWlan(String con_ssid, String con_password, int timeout);
void getSensorData();
void transmitSensorData();
void openAccesspoint();
void handleWebRequest();
String cutRequestParameter(String sourceString,String parameter);
String generateMeasuredDataJSON();


String ssid;
String password;
String UID;

byte DHTType;

//Measured data buffers
int no2RAWData[60];
float temperature[60];
float humidity[60];

memoryManager memory; //EEPROM MemoryManager
dht DHT;              //Humidity/Temperature sensor
WiFiServer server(80);//Webserver for http requests to the internal page

/************************************************************************
 * Initialisation                                                       *
 ************************************************************************/
void setup() {
  //Serial connection for debug use 
  Serial.begin(115200);

  //Load settings from EEPROM
  memory.init();
  ssid = memory.loadSSID();
  password = memory.loadWLanPassword();
  UID = memory.loadUserID();

  //Check if the loaded data is correct or fall back to default
  //TODO
  DHTType = memory.loadDHTType();

  
  //Wait a bit for everything to settle
  delay(4000);
}

/************************************************************************
 * Main Loop of the Station                                             *
 ************************************************************************/
void loop() {

  if(connectToWlan(ssid, password, 20)) { //TODO 120
    //Connection successfull
    unsigned long startTime = millis();
    while (WiFi.status() == WL_CONNECTED){
      //Process data while connected
      //Do a Measurement when enough time is elapsed
      if(millis() - startTime > timeBetweenMeasurements) {
        startTime = millis();
        getSensorData();
        transmitSensorData(); 
      }
      handleWebRequest();
    }
  } else {
    //Cant connect to a accesspoint, open a softAP
    openAccesspoint();
    unsigned long RunTime = millis();
    unsigned long startTime = millis();
    //Run for at least 10 minutes
    while (millis() - RunTime < 600000){
      //Keep the accesspoint open while a User is connected
      if(WiFi.softAPgetStationNum() > 0){
        RunTime = millis();
      }

      //Do a Measurement when enough time is elapsed
      if(millis() - startTime > timeBetweenMeasurements) {
        startTime = millis();
        getSensorData();
      }
      handleWebRequest();
    }
    //Close the softAP, try to connect to a network
    WiFi.softAPdisconnect(true);
  }
}


/************************************************************************
 * Tryes to connect to a given WLAN Accesspoint                         *
 ************************************************************************/
boolean connectToWlan(String con_ssid, String con_password, int timeout){
  int counter;
  counter = 0;

  Serial.print("Connecting to WiFi:");
  Serial.print(con_password);
  Serial.print(" ");
  Serial.println(con_ssid);
 
  WiFi.begin(con_ssid.c_str(), con_password.c_str());
  while (WiFi.status() != WL_CONNECTED && counter < timeout) {
    delay(1000);
    counter = counter + 1;
    Serial.println("Connecting to WiFi.." + (String)counter);
  }
  if(WiFi.status()== WL_CONNECTED){
    //Start the webserver
    server.begin();
  }
  return (WiFi.status()== WL_CONNECTED);
}


/************************************************************************
 * Creates a new accesspoint                                            *
 ************************************************************************/
void openAccesspoint(){
  WiFi.softAP("NO2STATION");
  WiFi.softAPConfig(IPAddress (192,168,1,1), IPAddress (192,168,1,1), IPAddress (255,255,255,0));
  //Start the webserver
  server.begin();
  
  //DEBUG
  Serial.print("AP IP address: ");
  Serial.println(WiFi.softAPIP());
}



/************************************************************************
 * Reads the data of all atached Sensors                                *
 ************************************************************************/
void getSensorData(){
  if(DHTType == 11 || DHTType == 12){
    DHT.read11(DHTPin);
  } else { //DHT22
    DHT.read(DHTPin);
  }
  //Move the data in the buffer one forward, so the internal page can show something if its requested
  for(int i = 58; i>-1; i--){
    no2RAWData[i+1] = no2RAWData[i];
    temperature[i+1] = temperature[i];
    humidity[i+1] = humidity[i];
  }
  temperature[0] = DHT.temperature;
  humidity[0] = DHT.humidity;
  no2RAWData[0] = analogRead(NOpin);
  
  Serial.println( UID + "&cno2=" + no2RAWData[0] + "&rawno2=" + no2RAWData[0] + "&temperature=" + temperature[0] + "&humidity=" + humidity[0]); //Debug
}

/************************************************************************
 * Transfer the Sensor data to the Webservice                           *
 ************************************************************************/
void transmitSensorData(){
  String request;
  request = (String)"http://" + targetAddress + "/api/post?uuid=" + UID + "&cno2=" + no2RAWData[0] + "&rawno2=" + no2RAWData[0] + "&temperature=" + temperature[0] + "&humidity=" + humidity[0];
  Serial.println(request);
  
  //Transfer Measurement data to the Webservice
  if (UID.length() == 32){
    HTTPClient http;
    http.begin(request);
    int httpCode = http.GET();   
    Serial.println("Data Transmit HTTP Code: " + (String)httpCode);                                   
    http.end(); 
  }

}



/************************************************************************
 * Handles the request from the User for the internal webpage           *
 ************************************************************************/
void handleWebRequest(){
  boolean performReset = false;

  //Check for incomming connections
  WiFiClient client = server.available(); 
  if (client) {  
    //new request, transfere page
    //TODO add Timeout
    String currentLine;     //Contains the current read line of the request
    String requestedPage = "index.html"; //The internal requestet page
    
    while (client.connected()) {
        if (client.available()) { 
          //read the pagerequest
          char charIn = client.read();   
          
          // if the byte is a newline character
          if (charIn == '\n') {
            Serial.println(currentLine);                    
            if(currentLine.length() != 1){
              
              //Check for transfered parameters, mark for restart if a new SSID or password is transmitted
              //check if a new SSID is transmited
              if(currentLine.indexOf("ssid=") != -1){
                //Changing the ssid requiers a restart of the System, so it can reconnect to the new WLAN
                String parameter = cutRequestParameter(currentLine,"ssid");
                memory.storeSSID(parameter);
                performReset = true;
              }

              if(currentLine.indexOf("password=") != -1){
                //Changing the password requiers a restart of the System, so it can reconnect to the new WLAN
                String parameter = cutRequestParameter(currentLine,"password");
                memory.storeWLanPassword(parameter);
                performReset = true;
              }
 
              if(currentLine.indexOf("uid=") != -1){
                String parameter = cutRequestParameter(currentLine,"uid");
                memory.storeUserID(parameter);
              }

              if(currentLine.indexOf("humsensor=") != -1){
                String parameter = cutRequestParameter(currentLine,"humsensor");
                if(parameter == "dht11"){
                  DHTType = 11;
                } else if(parameter == "dht12"){
                  DHTType = 12;
                } else if(parameter == "dht22"){
                  DHTType = 22;
                }
              memory.storeDHTType(DHTType);
              }

              //Check if the chart.js is requested
              if(currentLine.indexOf("chart.js") != -1){
                requestedPage = "chart.js";
              }

              //Check if the data.js is requested
              if(currentLine.indexOf("data.js") != -1){
                requestedPage = "data.js";
              }
            } else {
              if(requestedPage == "index.html") {
                //Send the Page to the user
                client.println(InternalPage);
              } else if( requestedPage == "chart.js") {
                //Sending the chartMinJS
                client.println(ChartMinJS);
              } else if( requestedPage == "data.js"){
                client.println(generateMeasuredDataJSON());
              }
              //Close the clients after transmiting the page
              client.stop();
            }
            currentLine = "";
           
          } else {
            //Continue reading and safe the transmited data
            currentLine = currentLine + charIn;
          } // if (charIn == '\n') {
        } // if (client.available()) 
     } // while (client.connected()) 
  } // if(Client)

  //Reset if nessesary
  if(performReset){
    ESP.restart();
  }
}

/*******************************************************************************************************************************************************
Webpage controll part //TODO Maybe moving to a header file //TODO
*******************************************************************************************************************************************************/

//Cuts the Parameter following the URL
String cutRequestParameter(String sourceString,String parameter){
  int parameterPosition = sourceString.indexOf(parameter + "=") + parameter.length() + 1;
  int endPoint = sourceString.indexOf("&",parameterPosition);

  if(endPoint != -1){
    //cut out the Parameter
    Serial.println(parameter + ":" + sourceString.substring(parameterPosition, endPoint));  //DEBUG 
    return sourceString.substring(parameterPosition, endPoint);
  } else {
    int endPoint = sourceString.indexOf(" ",parameterPosition);
    if(endPoint != -1){
      //cut out the Parameter
      Serial.println(parameter + ":" + sourceString.substring(parameterPosition, endPoint));  //DEBUG 
      return sourceString.substring(parameterPosition, endPoint);
    } else {
      //Its the last parameter if there is no more & in the line
      Serial.println(parameter + ":" + sourceString.substring(parameterPosition));  //DEBUG
      return sourceString.substring(parameterPosition);
    }
  }
}



//Generates JSON data for the webpage
String generateMeasuredDataJSON(){
  String JSON = "var data = {  type: 'line', data:  { datasets: [{ label: 'NO2', borderColor: 'rgba(0, 255, 0, 0.5)', data: [";
  //Put nox raw data
  for(int i = 0; i<60; i++){
    if(i != 59){
      JSON = JSON + (String)no2RAWData[i] + ",";
    } else {
      JSON = JSON + (String)no2RAWData[i];
    }
  }
  
  //Put temperature data
  JSON = JSON + "]},{label: 'Temperatur [°C]', borderColor: 'rgba(255, 0, 0, 0.5)', data: [";
  for(int i = 0; i<60; i++){
    if(i != 59){
      JSON = JSON + (String)temperature[i] + ",";
    } else {
      JSON = JSON + (String)temperature[i];
    }
  }
  
  //Put humidity data
  JSON = JSON + "]},{label: 'rel. Luftfeuchtigkeit [%]', borderColor: 'rgba(0, 0, 255, 0.5)', data: [";
  for(int i = 0; i<60; i++){
    if(i != 59){
      JSON = JSON + (String)humidity[i] + ",";
    } else {
      JSON = JSON + (String)humidity[i];
    }
  }
  
  //Put x axis labels
  JSON = JSON + "]}],labels: [";
  for(int i = 1; i<61; i++){
    if(i != 60){
      JSON = JSON + (String)i + ",";
    } else {
      JSON = JSON + (String)i;
    }
  }
  JSON = JSON + "]},options: {title: {display: true,text: 'Messdaten der letzten 60 Messungen'}}};";
  return JSON;
}
