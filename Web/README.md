Mostly functioning web app that connects to a detector via WebSocket or serial.  It also implements a completely simulated connection in case no physical detector is available (Useful for testing/development, or just playing around)

Once loaded, it runs entirely client-side, communicating only with the detector.  Because of this, it can be run directly off the filesystem with no web server required.  A negative side-effect of this is that settings, driver list, etc is saved to local storage in the web browser.  This can cause all of these settings to appear to be lost unless you always access the app from the same URL.  

Currently it is dependent on the WebSpeechSynthesis api as well as the experimental WebSerial api. It has only been tested working on Chrome under Windows 10/11. Note: I'm considering dropping support for WebSerial.  Unless your goal is to interface with different detector hardware, there really isn't any reason to keep it.

Other than Typescript, this app is entirely vanilla JS/CSS/HTML.  No React, Angular, Vue, etc.  Yes, it is old school.  And also yes, in hind-sight this might not have been the best decision.  Still, it's fast and fairly small which is important since it is served by the ESP32-S3.
