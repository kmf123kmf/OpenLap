# OpenLap
Another infrared based timing system for RC cars.

OpenLap is a full DIY RC timing solution including hardware transponder and detector designs and associated firmware.
All microcontroller code is written as Arduino sketches.

The transponder utilizes the ATtiny85 microcontroller while the detector is based around the AdaFruit ESP32-S3 TFT Feather dev board. (see https://www.adafruit.com/product/5483)

The detector is compatible with ZRound race management software.  (As of ZRound version 1.24.5.2 over TCP/IP. See https://www.zround.com/)

There is also a stand alone, web based app which connects to the detector via WiFi/WebSocket.  The web app is actually surprisingly capable, but currently lacks certain features such as comprehensive driver and race management. (No classes, heats, qualifiers, etc).  Still, for running individual races or practice sessions it's more than sufficient.

![Screenshot 2023-06-22 121155](https://github.com/kmf123kmf/OpenLap/assets/1772271/707c32a1-6f7e-48ce-ac59-f330b93b84c3)


