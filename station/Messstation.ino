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


//TODO Transform to variables
#define COpin 34
#define NOpin 33
#define DHTPin 27
#define targetAddress "192.168.178.23:8080"
#define timeBetweenMeasurements 5000


/************************************************************************
 * Function definitions for the compiler                               *
 ************************************************************************/
boolean connectToWlan(String con_ssid, String con_password, int timeout);
void getSensorData();
void transmitSensorData();
void openAccesspoint();
void handleWebRequest();
String cutRequestParameter(String sourceString,String parameter);
String generateMeasuredDataJSON();
void sendPage(WiFiClient client);


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



//Initialisation
void setup() {
  //Serial connection for debug use 
  Serial.begin(115200);

  //Load settings from EEPROM
  ssid = memory.loadSSID();
  password = memory.loadWLanPassword();
  UID = memory.loadUserID();

  //Check if the loaded data is correct or fall back to default
  //TODO
  DHTType = memory.loadDHTType();

  
  //Wait a bit for everything to settle
  delay(4000);
}


void loop() {
  if(connectToWlan(ssid, password, 1)) { //TODO 120
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



//Tryes to connect to a given WLAN Accesspoint
boolean connectToWlan(String con_ssid, String con_password, int timeout){
  int counter;
  counter = 0;
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



//Creates a new accesspoint
void openAccesspoint(){
  WiFi.softAP("NO2STATION");
  WiFi.softAPConfig(IPAddress (192,168,1,1), IPAddress (192,168,1,1), IPAddress (255,255,255,0));
  //Start the webserver
  server.begin();
  
  //DEBUG
  Serial.print("AP IP address: ");
  Serial.println(WiFi.softAPIP());
}



//Reads the data of all atached Sensors
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



//Transfer the Sensor data to the Webservice
void transmitSensorData(){
  String request;
  request = (String)"http://" + targetAddress + "/api/post?UID=" + UID + "&cno2=" + no2RAWData[0] + "&rawno2=" + no2RAWData[0] + "&temperature=" + temperature[0] + "&humidity=" + humidity[0];
  Serial.println(request);
  
  //Transfer Measurement data to the Webservice
  if (UID.length() == 32){
    HTTPClient http;
    http.begin(request);
    int httpCode = http.GET();   
    Serial.println("Data Transmit HTTP Code: " + (String)httpCode);                                   
    http.end(); 
  }
  //TODO - Open Sense Map
}



//Handles the request from the User for the internal webpage
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

              if(currentLine.indexOf("dht=") != -1){
                String parameter = cutRequestParameter(currentLine,"dht");
                if(parameter == "11"){
                  DHTType = 11;
                } else if(parameter == "12"){
                  DHTType = 12;
                } else if(parameter == "22"){
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
                sendPage(client);
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

void sendPage(WiFiClient client) {
  client.println("<html>\n<head>\n<script src=\"chart.js\"></script> \n<script src=\"data.js\"></script> \n<style>\n* {box-sizing: border-box}\n\n/* Set height of body and the document to 100% */\nbody, html {\n  height: 100%;\n  margin: 0;\n  font-family: Arial;\n}\n\n/* Style tab links */\n.tablink {\n  background-color: #555;\n  color: white;\n  float: left;\n  border: none;\n  outline: none;\n  cursor: pointer;\n  padding: 14px 16px;\n  font-size: 17px;\n  width: 50%;\n}\n\n.tablink:hover {\n  background-color: #777;\n}\n\n/* Style the tab content (and add height:100% for full page content) */\n.tabcontent {\n  display: none;\n  padding: 100px 20px;\n  height: 100%;\n}\n\n\n</style>\n</head>\n<body>\n\n<button class=\"tablink\" onclick=\"openPage('Messwerte', this)\" id=\"defaultOpen\">Messwerte</button>\n<button class=\"tablink\" onclick=\"openPage('Einstellungen', this)\">Einstellungen</button>\n\n<div id=\"Messwerte\" class=\"tabcontent\">\n\tMesswerte der letzten 60 Messungen\n\t<div style=\"width:80%;\">\n\t\t<canvas id=\"canvas\"></canvas>\n\t</div>\n</div>\n<!-- All the fields needed to transmit the setings -->\n<div id=\"Einstellungen\" class=\"tabcontent\">\n\t<h1>Einstellungen Sensor</h1>\n\t<form action=\"\">\n\t\t<table style=\"width:100%\">\n\t\t  <tr>\n\t\t\t<td width=\"20%\">WLAN SSID: </td>\n\t\t\t<td width=\"80%\"><input type=\"text\" name=\"ssid\" value=\"ssid\" style=\"width:70%\"></td> \n\t\t  </tr>\n\t\t  <tr>\n\t\t\t<td>WLAN Password:</td>\n\t\t\t<td><input type=\"text\" name=\"password\" value=\"password\" style=\"width:70%\"></td>\n\t\t  </tr>\n\t\t  <tr>\n\t\t\t<td>User ID:</td>\n\t\t\t<td><input type=\"text\" name=\"uid\" value=\"uid\" style=\"width:70%\"></td>\n\t\t  </tr>\n\t\t</table>\n\t<input type=\"submit\" value=\"Submit\">\n\t</form> \n</div>\n\n<script>\nfunction openPage(pageName,elmnt) {\n  var i, tabcontent, tablinks;\n  tabcontent = document.getElementsByClassName(\"tabcontent\");\n  for (i = 0; i < tabcontent.length; i++) {\n    tabcontent[i].style.display = \"none\";\n  }\n  tablinks = document.getElementsByClassName(\"tablink\");\n  for (i = 0; i < tablinks.length; i++) {\n    tablinks[i].style.backgroundColor = \"\";\n  }\n  document.getElementById(pageName).style.display = \"block\";\n  elmnt.style.backgroundColor = 'grey';\n}\n\n// Get the element with id=\"defaultOpen\" and click on it\ndocument.getElementById(\"defaultOpen\").click();\n\n\twindow.onload = function() {\n\t\t\tvar ctx = document.getElementById('canvas').getContext('2d');\n\t\t\tlet chart = new Chart(ctx, data);\n\t\t};\n\t\t\n</script>\n   \n</body>\n</html> \n");
  };
