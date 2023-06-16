Mostly functioning web app that connects to a detector via WebSocket or serial.  It can also use a completely simulated connection in case no physical detector is available. (Default)

Once loaded, it runs entirely client-side, only communicating with the detector.  Because of this, it can be run directly off the filesystem with no web server required.

Currently it is heavily dependent on the WebSpeechSynthesis api and only tested on Chrome under Windows 10/11.

Other than Typescript, this app is entirely vanilla JS/CSS/HTML.  No React, Angular, Vue, etc.  Yes, it is old school.  And also yes, in hind-sight this might not have been the best decision.  Still, it's fast and fairly small which is important since it should be served by the ESP32-S3 at some point.