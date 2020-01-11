# openNOx
Hallo!

OpenNox soll die Möglichkeit bieten NO2 mit einer günstigen Messstation selber zu Messen.

Aktuell läuft die zugehörige Webseite Testweise auf der Folgenden IP:
http://85.214.226.136:3000/

Da es allerdings noch Probleme mit dem Sensor gibt, da dieser querempfindlich gegenüber NO ist (welches gleichzeitig mit NO2 auftritt) ist die Seite aktuell nicht direkt unter Opennox.de erreichbar.

Hierbei abhilfe schaffen soll eventuell ein Ozongenerator, hier suche ich aktuell eine kostengünstige möglichkeit welche das NO zu NO2 umsetzen kann. (Hierzu werden noch weitere Versuche notwendig sein)


Ein bisschen Theorie zu dem Sensor (und dem Kalibrieren im allgemeinen):
Um eine Kalibrierfunktion zu ermitteln müssen im ersten Schritt alle Größen ermittelt werden welche einen Einfluss auf den Wert des Sensors haben können. Bei dem eingesetzten MiCS sind dies die Temperatur, Luftfeuchtigkeit, die Konzentrationen von NO2 und leider auch NO. 
Auch ist die Fragestellung relevant: Wieso haben diese Größen einen Einfluss?

Da es sich um einen Metalloxid-Sensor handelt, dessen Leitfähigkeit sich mit der menge der eingebrachten oder entfernten Elektronen ändert, und dieses einbringen/entfernen durch eine "Reaktion" an der Sensoroberfläche passiert, kann hier angesetzt werden. 
Temperatureinfluss: Für Reaktionen in der Chemie gilt im allgemeinen die Faustformel dass sich mit 10°C Temperaturerhöhung die Reaktionsgeschwindigkeit verdoppelt bis verdreifacht. Die durchgeführten Versuche zeigten ein Verhalten was ungefähr dieses Verhalten wiederspiegelt.
Luftfeuchtigkeit: Bei der Luftfeuchtigkeit gibt es zunächst die Fragestellung ob die Relative oder Absolute Luftfeuchtigkeit als Einflussgröße genutzt wird. Relative Luftfeuchtigkeit ist selbst Temperaturabhängig und wird in % angegeben, absolute in g/m^3. Es gibt nun zwei mögliche Scenarien: Das Wasser in der Luft reagiert mit dem NO zu HNO3 (Salpetersäure) und beeinflusst hierdurch die Messung. Scenario zwei ist dass es mit dem Sensor reagiert und hierdurch Platz für die Reaktion mit NO2 blockiert.

Der Nächste Schritt ist das durchführen von Messungen.
Hierfür werden idealerweise alle Parameter einzeln betrachtet und verändert. Die Ergebnisse solcher Messungen liegen in diesem Repo. Es zeigte sich beim Temperatureinfluss ein Zusammenhang mit der zuvor erwähnten Fausformel (Bezogen auf die Änderung des Wiederstandes)

Aus mit den hieraus erhaltenen fittings lassen sich anschließend Korrekturfunktionen ermitteln. So ändert sich z.B. die Sensorausgabe um 26-30 digits mit jedem Grad Temperaturänderung.

Sollte es weitere Ergebnisse geben werde ich diese hier Posten :)

Schöne Grüße,
Patrick

