#ifndef _Settings_html
#define _Settings_html

const char settings_html[] PROGMEM = R"rawliteral(
<!DOCTYPE HTML><html>
<head>
  <title>OpenLap Detector Settings</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
</head>
<body>
<H2>WiFi</H2>
  <form action="/update" method="POST">
  <label for="ssid">SSID</label><br>
  <input type="text" id="ssid" name="ssid"><br>
  <label for="pwd">Password</label><br>
  <input type="password" id="pwd" name="pwd"><br>
  <input type="submit" value="Submit">
  </form>
</body>
</html>
)rawliteral";

#endif