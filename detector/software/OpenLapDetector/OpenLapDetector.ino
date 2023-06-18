
#include <Arduino.h>
#include <Preferences.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <SPI.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <ArduinoQueue.h>
#include "OpenLapHTML.h"

#define DISPLAY_WIDTH 240
#define DISPLAY_HEIGHT 135

#define MIN_DETECTION_PERIOD 500
#define NUM_RECENT_DETECTIONS 20

Adafruit_ST7789 tft = Adafruit_ST7789(TFT_CS, TFT_DC, TFT_RST);
GFXcanvas16 canvas(DISPLAY_WIDTH, DISPLAY_HEIGHT);

Preferences preferences;

AsyncServer tcpServer(8080);
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
AsyncClient *theTcpClient = NULL;

/* Preferences */
#define PREF_NS "openrc"
#define USSID_KEY "ussid"
#define UPWD_KEY "upwd"

/* Access Point */
#define AP_SSID "OpenRC"
#define AP_PWD "my-open-rc"

/* IR Receiver */
#define IR_RECEIVE_PIN 15
#define ENABLE_LED_FEEDBACK 1

//#define LOCAL_TRACE_STATE_MACHINE
#define RCLT_MARK_OFFSET -15
#include "OpenLapTinyIRReceiver.hpp"

uint32_t detectionOffset = 0;

uint32_t simTransponders[10];
bool runSim = false;

union DetectionInfo {
  struct {
    uint32_t transponderId;
    uint32_t detectionTime;
  };
  uint8_t bytes[8];
};
#define DETECTION_INFO_SIZE 8

struct DetectionRecord {
  bool valid;
  DetectionInfo detectionInfo;
};

ArduinoQueue<DetectionInfo> inQueue(128);
ArduinoQueue<DetectionInfo> outQueue(128);

DetectionRecord displayDetectionRecord = { false, { 0, 0 } };
DetectionRecord recentDetections[NUM_RECENT_DETECTIONS];

String displaySSID;
String displayPWD;
String displayAddress;
String dbgMessage = "";

void updateDisplay() {
  canvas.fillScreen(0);
  canvas.setFont();
  canvas.setTextColor(0xFFFFFF);
  canvas.setTextSize(2);
  canvas.setCursor(0, 0);
  canvas.setTextWrap(true);

  canvas.print(F("SSID: "));
  canvas.println(displaySSID.c_str());

  if (displayPWD != "<hidden>") {
    canvas.print(F("Pass: "));
    canvas.println(displayPWD.c_str());
  }
  canvas.println();
  canvas.print(F("IP: "));
  canvas.println(displayAddress.c_str());

  canvas.setTextColor(ST77XX_YELLOW);

  if (displayDetectionRecord.valid) {
    canvas.println();
    canvas.printf("Last ID: %d", displayDetectionRecord.detectionInfo.transponderId);
    canvas.println();
  }

  if (dbgMessage != "") {
    canvas.setTextColor(ST77XX_ORANGE);
    canvas.println(dbgMessage);
  }

  tft.drawRGBBitmap(0, 0, canvas.getBuffer(), canvas.width(), canvas.height());
}

static portMUX_TYPE spinlock = portMUX_INITIALIZER_UNLOCKED;

void InitDetectionOffset() {
  Serial.println("Init Detector");
  detectionOffset = millis();
}

void finishRace() {
  Serial.println("Finish Race");
}

void beginSim() {
  for (int i = 0; i < 10; i++) {
    simTransponders[i] = millis() + random(1000, 2500);
  }

  Serial.println("Simulation started");
  runSim = true;
}

void endSim() {
  Serial.println("Simulation stopped");
  runSim = false;
}

void handleZRoundMessage(void *data, size_t len) {
  char *msg = (char *)data;
  if (len >= 3 && msg[0] == '%' && msg[2] == '&') {
    switch (msg[1]) {
      case 'I':
        InitDetectionOffset();
        break;
      case 'B':
        beginSim();
        break;
      case 'E':
        endSim();
        break;
      case 'F':
        finishRace();
        break;
    }
  }
}

void onTcpClientData(void *s, AsyncClient *c, void *data, size_t len) {
  handleZRoundMessage(data, len);
}

void onTcpClientDisconnect(void *s, AsyncClient *client) {
  if (client == NULL) {
    return;
  }
  client->close(true);
  client->free();
  delete client;
  theTcpClient = NULL;
  Serial.print("TCP Client disconnected");
}

void onTcpClient(void *s, AsyncClient *client) {
  if (client == NULL) {
    return;
  }

  if (theTcpClient != NULL) {
    client->close(true);
    client->free();
    delete client;
    Serial.println("Refused TCP Client.  A client is already connected.");
    return;
  }

  theTcpClient = client;

  //client->setRxTimeout(3);
  client->onData(onTcpClientData);
  client->onDisconnect(onTcpClientDisconnect);

  Serial.print("TCP Client connected from ");
  Serial.print(client->getRemoteAddress());
  Serial.print(":");
  Serial.println(client->getRemotePort());
}

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo *)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    handleZRoundMessage(data, len);
  }
}

void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
               void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      break;
    case WS_EVT_DISCONNECT:
      break;
    case WS_EVT_DATA:
      handleWebSocketMessage(arg, data, len);
      break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
  }
}

void setup() {
  for (int i = 0; i < NUM_RECENT_DETECTIONS; i++) {
    recentDetections[i] = { false, { 0, 0 } };
  }

  Serial.begin(115200);

  /*************************
 *  Initialize display
 *************************/
  // turn on backlite
  pinMode(TFT_BACKLITE, OUTPUT);
  digitalWrite(TFT_BACKLITE, HIGH);

  // turn on the TFT / I2C power supply
  pinMode(TFT_I2C_POWER, OUTPUT);
  digitalWrite(TFT_I2C_POWER, HIGH);
  delay(10);

  // initialize TFT
  tft.init(135, 240);  // Init ST7789 240x135
  tft.setRotation(1);
  tft.fillScreen(ST77XX_BLACK);

  /****************************************
 *  Join WiFi network or run in AP mode
 ****************************************/
  WiFi.mode(WIFI_STA);

  // Look for previously stored SSID and passkey
  preferences.begin(PREF_NS, true);
  String userSSID = preferences.getString(USSID_KEY);
  String userPWD = preferences.getString(UPWD_KEY);
  preferences.end();

  if (userSSID != NULL) {
    const char *ssid = userSSID.c_str();
    const char *password = userPWD.c_str();
    // attempt to join network
    WiFi.begin(ssid, password);

    // try for ten seconds
    for (int i = 0; i < 10; i++) {
      if (WiFi.status() != WL_CONNECTED) {
        delay(1000);
      }
    }

    if (WiFi.status() == WL_CONNECTED) {
      displaySSID = ssid;
      displayPWD = "<hidden>";
      displayAddress = WiFi.localIP().toString();
    } else {
    }
  }

  // Not connect to network.  Create a private network instead.
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID, AP_PWD);

    displaySSID = AP_SSID;
    displayPWD = AP_PWD;
    displayAddress = WiFi.softAPIP().toString();
  }

  /****************************************
 *  Setup the web server
 ****************************************/
  ws.onEvent(onWsEvent);
  server.addHandler(&ws);

  server.on("/settings", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send_P(200, "text/html", settings_html);
  });

  server.on("/update", HTTP_POST, [](AsyncWebServerRequest *request) {
    if (request->hasParam("ssid", true)) {
      AsyncWebParameter *p = request->getParam("ssid", true);
      preferences.begin(PREF_NS, false);
      preferences.putString(USSID_KEY, p->value());
      preferences.end();
    }

    if (request->hasParam("pwd", true)) {
      AsyncWebParameter *p = request->getParam("pwd", true);
      preferences.begin(PREF_NS, false);
      preferences.putString(UPWD_KEY, p->value());
      preferences.end();
    }

    request->send_P(200, "text/plain", "Settings updated.  Please restart device for changes to take effect.");
  });

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send_P(200, "text/html", index_html);
  });
  server.on("/js/openlap.js", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send_P(200, "text/javscript", openlap_js);
  });
  server.on("/css/openlap.css", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send_P(200, "text/css", openlap_css);
  });
  server.on("/css/pure-min.css", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send_P(200, "text/css", puremin_css);
  });

  server.begin();

  /****************************************
 *  Setup the tcp server
 ****************************************/
  tcpServer.onClient(onTcpClient, NULL);
  tcpServer.begin();

  /****************************************
 *  Display connection info to user
 ****************************************/
  updateDisplay();

  /****************************************
 *  Setup IR receiving
 ****************************************/
  initPCIInterruptForTinyReceiver();

  /****************************************
 *  Update clients and display
 *  on core0
 ****************************************/
  xTaskCreatePinnedToCore(notifyTask, "NotifyTask", 10000, NULL, 0, NULL, 0);
}

void sendMessage(const String &msg) {
  const char *msgBuff = msg.c_str();

  ws.textAll(msg);
  if (theTcpClient != NULL) {
    while(!theTcpClient->canSend()){
      delayMicroseconds(50);
    }
    theTcpClient->write(msgBuff);
  }
}

void notifyClients() {
  while (!outQueue.isEmpty()) {
    DetectionInfo info = outQueue.dequeue();

    // use the ZRound open protocol
    String msg = "%L" + String(info.transponderId, HEX) + ","
                 + String(info.detectionTime, HEX) + "&";

    sendMessage(msg);
  }
}

uint32_t lastCleanupTime = 0;

void notifyTask(void *parameter) {
  while (true) {
    bool shouldUpdateDisplay = false;
    bool shouldNotifyClients = false;

    if (runSim) {
      for (int i = 0; i < 10; i++) {
        if (millis() > simTransponders[i]) {
          outQueue.enqueue({ i, millis() - detectionOffset });
          simTransponders[i] = millis() + random(13000, 15000) + i * random(0, 200);
          Serial.print("Sim ID: ");
          Serial.println(i);
          shouldNotifyClients = true;
        }
      }
    }

    // Cleanup websocket clients every second
    if (millis() - lastCleanupTime >= 1000) {
      ws.cleanupClients();
      lastCleanupTime = millis();
    }

    if (!inQueue.isEmpty()) {
      taskENTER_CRITICAL(&spinlock);
      // We don't need to check isEmpty() again because we're the only thread that dequeues from it
      while (inQueue.itemCount() > 0) {
        outQueue.enqueue(inQueue.dequeue());
      }
      taskEXIT_CRITICAL(&spinlock);

      displayDetectionRecord = { true, outQueue.getTail() };
      shouldUpdateDisplay = true;
      shouldNotifyClients = true;
    }

    if (shouldUpdateDisplay) {
      updateDisplay();
    }

    if (shouldNotifyClients) {
      notifyClients();
    }
  }
}

void handleReceivedOpenLapIRData(uint16_t transponderId) {
  uint32_t now = millis();

  DetectionRecord *foundRecord = NULL;
  DetectionRecord *freeRecord = NULL;

  //Loop through entire array to clean it up
  for (int i = 0; i < NUM_RECENT_DETECTIONS; i++) {
    DetectionRecord *rec = &(recentDetections[i]);

    if (!(rec->valid)) {
      freeRecord = rec;
    } else if (rec->detectionInfo.transponderId == transponderId) {
      foundRecord = rec;
    } else if (now - rec->detectionInfo.detectionTime > MIN_DETECTION_PERIOD) {
      // This entry has expired and can be used by another transponder
      rec->valid = false;
      freeRecord = rec;
    }
  }

  if (foundRecord != NULL) {
    // we found it
    if (now - foundRecord->detectionInfo.detectionTime <= MIN_DETECTION_PERIOD) {
      foundRecord->detectionInfo.detectionTime = now;
      return;
    } else {
      foundRecord->detectionInfo.detectionTime = now;
    }
  } else if (freeRecord != NULL) {
    // we have a free spot to put it
    freeRecord->detectionInfo.transponderId = transponderId;
    freeRecord->detectionInfo.detectionTime = now;
    freeRecord->valid = true;
  } else {
    // We didn't find it and there's no slot to put it in.
    // Shouldn't really happen, but just skip it since
    // there's nothing else we can do.
    return;
  }

  // In interupt context here
  taskENTER_CRITICAL_ISR(&spinlock);
  inQueue.enqueue({ transponderId, now - detectionOffset });
  taskEXIT_CRITICAL_ISR(&spinlock);
}

void displayMessage(const char *msg) {
  dbgMessage = msg;
  updateDisplay();
}

void loop() {
}
