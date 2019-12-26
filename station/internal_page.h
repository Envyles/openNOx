/**************************************************************
 * The internal webpage as null-terminated string.            *
 * It has its own file since the Arduino IDE has some         *
 * problems handling a String this long                       * 
 **************************************************************
 * It was converted with help of the Page                     *
 * http://tomeko.net/online_tools/cpp_text_escape.php?lang=en *
 *************************************************************/

#ifndef INTERNAL_PAGE_H
#define INTERNAL_PAGE_H
  const char* InternalPage = "<html>\n<head>\n<script src=\"chart.js\"></script> \n<script src=\"data.js\"></script> \n<style>\n* {box-sizing: border-box}\n\n/* Set height of body and the document to 100% */\nbody, html {\n  height: 100%;\n  margin: 0;\n  font-family: Arial;\n}\n\n/* Style tab links */\n.tablink {\n  background-color: #555;\n  color: white;\n  float: left;\n  border: none;\n  outline: none;\n  cursor: pointer;\n  padding: 14px 16px;\n  font-size: 17px;\n  width: 50%;\n}\n\n.tablink:hover {\n  background-color: #777;\n}\n\n/* Style the tab content (and add height:100% for full page content) */\n.tabcontent {\n  display: none;\n  padding: 100px 20px;\n  height: 100%;\n}\n\n\n</style>\n</head>\n<body>\n\n<button class=\"tablink\" onclick=\"openPage('Messwerte', this)\" id=\"defaultOpen\">Messwerte</button>\n<button class=\"tablink\" onclick=\"openPage('Einstellungen', this)\">Einstellungen</button>\n\n<div id=\"Messwerte\" class=\"tabcontent\">\n\tMesswerte der letzten 60 Messungen\n\t<div style=\"width:80%;\">\n\t\t<canvas id=\"canvas\"></canvas>\n\t</div>\n</div>\n<!-- All the fields needed to transmit the setings -->\n<div id=\"Einstellungen\" class=\"tabcontent\">\n\t<h1>Einstellungen Sensor</h1>\n\t<form action=\"\">\n\t\t<table style=\"width:100%\">\n\t\t  <tr>\n\t\t\t<td width=\"20%\">WLAN SSID: </td>\n\t\t\t<td width=\"80%\"><input type=\"text\" name=\"ssid\" value=\"ssid\" style=\"width:70%\"></td> \n\t\t  </tr>\n\t\t  <tr>\n\t\t\t<td>WLAN Password:</td>\n\t\t\t<td><input type=\"text\" name=\"password\" value=\"password\" style=\"width:70%\"></td>\n\t\t  </tr>\n\t\t  <tr>\n\t\t\t<td>User ID:</td>\n\t\t\t<td><input type=\"text\" name=\"uid\" value=\"uid\" style=\"width:70%\"></td>\n\t\t  </tr>\n\t\t</table>\n\t<input type=\"submit\" value=\"Submit\">\n\t</form> \n</div>\n\n<script>\nfunction openPage(pageName,elmnt) {\n  var i, tabcontent, tablinks;\n  tabcontent = document.getElementsByClassName(\"tabcontent\");\n  for (i = 0; i < tabcontent.length; i++) {\n    tabcontent[i].style.display = \"none\";\n  }\n  tablinks = document.getElementsByClassName(\"tablink\");\n  for (i = 0; i < tablinks.length; i++) {\n    tablinks[i].style.backgroundColor = \"\";\n  }\n  document.getElementById(pageName).style.display = \"block\";\n  elmnt.style.backgroundColor = 'grey';\n}\n\n// Get the element with id=\"defaultOpen\" and click on it\ndocument.getElementById(\"defaultOpen\").click();\n\n\twindow.onload = function() {\n\t\t\tvar ctx = document.getElementById('canvas').getContext('2d');\n\t\t\tlet chart = new Chart(ctx, data);\n\t\t};\n\t\t\n</script>\n   \n</body>\n</html> \n";
#endif
