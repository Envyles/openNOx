/************************************************************************
 * Slightly modified code from opensensemap.org.                        *
 * Some variable names and Parameters have been changed to make it      *
 * work with the OpenNOX Station.                                       *
 * Putting the code into a cpp file causes some problems with the       *
 * Arduino IDE (it apears that the IDE has a Problem with the long      *
 * string used for storing the webpage)                                 *
 * OpenSenseMap code: https://github.com/sensebox/openSenseMap          *
 ************************************************************************/
#include <WiFi.h>
#include <WiFiAP.h>
#include <EEPROM.h>
#include <HTTPClient.h>

//Variables for OpenSense Map
WiFiClient clientsense;
char serveradd[] = "ingress.opensensemap.org";


/************************************************************************
 * Open sense map function definitions for the compiler                 *
 ************************************************************************/
void postFloatValue (float measurement, int digits, String sensorId, String senseboxId);
void waitForServerResponse ();
void sleep(unsigned long ms);


void postFloatValue (float measurement, int digits, String sensorId, String senseboxId) {
  //Float zu String konvertieren
  char obs[10];
  dtostrf(measurement, 5, digits, obs);
  //Json erstellen
  String jsonValue = "{\"value\":";
  jsonValue += obs;
  jsonValue += "}";
  //Mit OSeM Server verbinden und POST Operation durchführen
  Serial.println("-------------------------------------");
  Serial.print("Connectingto OSeM Server...");
  if (clientsense.connect(serveradd, 80)) {
    Serial.println("connected!");
    Serial.println("-------------------------------------");
    //HTTP Header aufbauen
    clientsense.print("POST /boxes/"); clientsense.print(senseboxId); clientsense.print("/"); clientsense.print(sensorId); clientsense.println(" HTTP/1.1");
    clientsense.print("Host:");
    clientsense.println(serveradd);
    clientsense.println("Content-Type: application/json");
    clientsense.println("Connection: close");
    clientsense.print("Content-Length: "); clientsense.println(jsonValue.length());
    clientsense.println();
    //Daten senden
    clientsense.println(jsonValue);
  } else {
    Serial.println("failed!");
    Serial.println("-------------------------------------");
  }
  //Antwort von Server im seriellen Monitor anzeigen
  waitForServerResponse();
}

void waitForServerResponse () {
  //Ankommende Bytes ausgeben
  boolean repeat = true;
  do {
    if (clientsense.available()) {
      char c = clientsense.read();
      Serial.print(c);
    }
    //Verbindung beenden
    if (!clientsense.connected()) {
      Serial.println();
      Serial.println("--------------");
      Serial.println("Disconnecting.");
      Serial.println("--------------");
      clientsense.stop();
      repeat = false;
    }
  } while (repeat);
}

// millis() rollover fix - http://arduino.stackexchange.com/questions/12587/how-can-i-handle-the-millis-rollover
void sleep(unsigned long ms) {            // ms: duration
  unsigned long start = millis();         // start: timestamp
  for (;;) {
    unsigned long now = millis();         // now: timestamp
    unsigned long elapsed = now - start;  // elapsed: duration
    if (elapsed >= ms)                    // comparing durations: OK
      return;
  }
}
