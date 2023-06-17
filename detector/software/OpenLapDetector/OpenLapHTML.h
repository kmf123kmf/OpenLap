#ifndef _Open_Lap_HTML
#define _Open_Lap_HTML

const char settings_html[] PROGMEM = R"rawliteral(
<!DOCTYPE HTML><html>
<head>
  <title>OpenRC Lap Detector</title>
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

const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE HTML><html>
<head>
  <title>OpenRC</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <style>
  html {
    font-family: Arial, Helvetica, sans-serif;
    text-align: center;
  }
  h1 {
    font-size: 1.8rem;
    color: white;
  }
  h2{
    font-size: 1.5rem;
    font-weight: bold;
    color: #143642;
  }
  .topnav {
    overflow: hidden;
    background-color: #143642;
  }
  body {
    margin: 0;
  }
  .content {
    padding: 30px;
    max-width: 800px;
    margin: 0 auto;
  }
  .card {
    background-color: #F8F7F9;;
    box-shadow: 2px 2px 12px 1px rgba(140,140,140,.5);
    padding-top:10px;
    padding-bottom:20px;
  }

  .driverCard {
    background-color: #F8F7F9;;
    box-shadow: 2px 2px 12px 1px rgba(140,140,140,.5);
    padding-top:15px;
    padding-left:10px;
    padding-right:10px;
    padding-bottom:15px;
    margin-bottom:5px;
    font-weight: bold;

    display:grid;
                        /*id  lap  last best worst avg cons*/
    grid-template-columns:3em 3em auto 4em 4em 4em 6em;
  }

  .driverCard div{
    text-align:left;
  }

  .connected {
    color: #008f00;
  }
  .disconnected{
    color:#BB0000;
  }
   .state {
     font-size: 1.5rem;
     color:#8c8c8c;
     font-weight: bold;
   }
  </style>
<title>OpenRC</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:,">
</head>
<body>
  <div class="topnav">
    <h1>OpenRC 0.1a</h1>
  </div>
  <div>
    <p></p>
    <span>Connection Status: </span>
    <span id="connStatus">Disconnected</span>
  </div>
  <br>
  <div>
    <span>Audio</span>
    <select id="audioSelect">
      <option value="off">Off</option>
      <option value="tone">Tone</option>
      <option value="voice">Voice</option>
    </select>
  </div>
  
  <div class="content">
    <div class="card">
      <h3>Last Transponder ID</h3>
      <span id="state">-</span>
    </div>
  </div>
  <div class="content" id="driverBoard">
    <div class="driverCard">
        <div>ID</div>
        <div>Lap</div>
        <div>Name</div>
        <div>Last</div>
        <div>Best</div>
        <div>Avg</div>
        <div>Consistency</div>
    </div>
  </div>
<script>
  const myAudioContext = new AudioContext();
  let preferredVoice = null;

  function beep(duration, frequency, volume){
    return new Promise((resolve, reject) => {
        // Set default duration if not provided
        duration = duration || 200;
        frequency = frequency || 440;
        volume = volume || 100;

        try{
            let oscillatorNode = myAudioContext.createOscillator();
            let gainNode = myAudioContext.createGain();
            oscillatorNode.connect(gainNode);

            // Set the oscillator frequency in hertz
            oscillatorNode.frequency.value = frequency;

            // Set the type of oscillator
            oscillatorNode.type= "square";
            gainNode.connect(myAudioContext.destination);

            // Set the gain to the volume
            gainNode.gain.value = volume * 0.01;

            // Start audio with the desired duration
            oscillatorNode.start(myAudioContext.currentTime);
            oscillatorNode.stop(myAudioContext.currentTime + duration * 0.001);

            // Resolve the promise when the sound is finished
            oscillatorNode.onended = () => {
                resolve();
            };
        }catch(error){
            reject(error);
        }
    });
  }

  function loadVoices() {
    // Fetch the available voices.
    var voices = speechSynthesis.getVoices();
    
    // Loop through each of the voices.
    voices.forEach(function(voice, i) {
      if(voice.name == 'Microsoft Zira - English (United States)' || voice.name == 'Samantha'){
        preferredVoice = voice;
      }

      console.log(voice.name);
    });
  }

  function speak(text) {
    // Create a new instance of SpeechSynthesisUtterance.
    var msg = new SpeechSynthesisUtterance();
    
    msg.text = text;
    
    msg.volume = parseFloat(1);
    msg.rate = parseFloat(2);
    msg.pitch = parseFloat(1);
  
    if(preferredVoice != null){
      msg.voice = preferredVoice;
    }
 
    // Queue this utterance.
    window.speechSynthesis.speak(msg);
  }

  function announceDriver(name){
    switch(byId('audioSelect').value){
      case 'off':
        break;
      case 'tone':
        beep(50, 440, 100);
        break;
      case 'voice':
        if(name == null){
          speak("unknown driver");
        }
        else
        {
          speak(name);
        }
        break;
    }
    
  }

  function announceLap(time){
    switch(byId('audioSelect').value){
      case 'off':
        break;
      case 'tone':
        beep(50, 220, 100);
        break;
      case 'voice':
        let t = (time / 1000).toFixed(1);
        t = ("" + t).replace('.', ' ').replace(' 0', ' flat');
        speak(t);
        break;
    }
  }

  function byId(id){
    return document.getElementById(id);
  }

  function displaySeconds(s){
    return (s/1000).toFixed(3);
  }

  function displayPercent(c){
    return (c *100).toFixed(2);
  }

  function displayId(id){
    return String(id).padStart(3, '0');
  }

  function htmlId(id){
    return String(id).padStart(3, '0');
  }

  function makeDiv(text){
    return "<div>" + text + "</div>";
  }

  class Lap{
    constructor(start){
        this.start = start;
        this.end = null;
    }

    getLapTime(){
        if(this.end){
            return this.end - this.start;
        }
        else{
            return null;
        }
    }

  }

  class Driver{
    static minLapTime = 2000;

    constructor(id, name = 'Unknown Driver'){
        this.id = id;
        this.name = name;
        this.firstSeenTime = null;
        this.lastSeen = null; //millis from detector
        this.lastSeenTime = null; //local time Date() object
        this.lastLap = null;
        this.bestLap = null;
        this.avgLap = null;
        this.consistency = null;
        this.totalTime = 0;
        this.laps = [];

        this.view = null;
    }

    destroy(){
        if(this.view){
            this.view.remove();
        }
    }

    getHtml(){
        return makeDiv(htmlId(this.id)) 
        + makeDiv(this.laps.length)
        + makeDiv(this.name)
        + makeDiv(displaySeconds(this.lastLap)) 
        + makeDiv(displaySeconds(this.bestLap)) 
        + makeDiv(displaySeconds(this.avgLap))
        + makeDiv(displayPercent(this.consistency));
    }

    recordDetection(millis){
        let now = new Date();
        if(this.lastSeen == null){
            this.firstSeenTime = now;
            this.lastSeenTime = now;
            this.lastSeen = millis;

            console.log(displayId(this.id) + " Lap 1 started " + this.firstSeenTime.toTimeString());
            var lap = new Lap(millis);
            this.laps.unshift(lap);

            this.view = document.createElement("div");
            this.view.className = "driverCard";
            this.view.innerHTML = this.getHtml();
            byId("driverBoard").appendChild(this.view);

            announceDriver(this.name);

            return -1;
        }
        else{
            if((millis - this.lastSeen) > Driver.minLapTime){
                this.lastSeenTime = now;
                this.lastSeen = millis;
                this.laps[0].end = millis;
                this.lastLap = this.laps[0].getLapTime();
                this.totalTime += this.lastLap;

                if(!this.bestLap || this.lastLap < this.bestLap){
                    this.bestLap = this.lastLap;
                }

                this.avgLap = this.totalTime / this.laps.length;
                this.consistency = this.bestLap / this.avgLap;

                console.log(displayId(this.id) + " Lap " + this.laps.length + ": " + this.lastLap / 1000 
                + " B " + displaySeconds(this.bestLap) + " A " + displaySeconds(this.avgLap)
                + " C " + displayPercent(this.consistency));

                this.laps.unshift(new Lap(millis));

                this.view.innerHTML = this.getHtml();
                announceLap(this.lastLap);

                return this.lastLap;
            }
            else{
              // premature detection.  ignore
              console.log("<" + this.id + "> Premature Detection");
              return -1;
            }
        }
    }
  }

  class RaceManager{
    drivers = {};

    recordDetection(id, millis){
        if(!this.drivers[id]){
            console.log("Added new driver: " + displayId(id));
            this.drivers[id] = new Driver(id);
        }

        let lapTime = this.drivers[id].recordDetection(millis);
    }

    cleanupDrivers(millis){
        let deadList = [];
        let now = new Date();
        for(let id in this.drivers){
            let driver = this.drivers[id];
            if(Math.abs(now - driver.lastSeenTime) > millis){
                var a = id;
                deadList.push(a);
            }
        }

        for(let id of deadList){
            this.drivers[id].destroy();
            delete(this.drivers[id]);
            console.log("Removed stale driver " + displayId(id));
            
        }
    }
  }

  window.speechSynthesis.onvoiceschanged = function(e) {
    loadVoices();
  };

  var currentRace = new RaceManager();

  var host = window.location.hostname;
  //host = '192.168.1.62'

  var websocket;
  window.addEventListener('load', onLoad);
  function initWebSocket() {
    console.log('Trying to open a WebSocket connection...');
    websocket = new WebSocket('ws://' + host + '/ws');
    websocket.binaryType = 'arraybuffer';
    websocket.onopen    = onOpen;
    websocket.onclose   = onClose;
    websocket.onmessage = onMessage;
  }
  function onOpen(event) {
    console.log('Connection opened');
    var stat = byId('connStatus');
    stat.innerHTML = 'Connected';
    stat.className = 'connected';
  }
  function onClose(event) {
    console.log('Connection closed');
    stat = byId('connStatus');
    stat.innerHTML = 'Disconnected';
    stat.className = 'disconnected';
    setTimeout(initWebSocket, 1000);
  }

  function onMessage(event) {
    //console.log(event.data);
    const detection = new Int32Array(event.data);
    byId('state').innerHTML = detection[0] + ':' + detection[1];
    currentRace.recordDetection(detection[0], detection[1]);
  }

  function updateTransponderRow(id, time){
    var row = document.getElementById("tpr-" + id);
    if(!row){
        var table = document.getElementById("transponderTable");
        var newRow = table.insertRow(1);
        newRow.id = "tpr-" + id;
        var cell0 = newRow.insertCell();
        var cell1 = newRow.insertCell();
        cell0.innerHTML = id;
        cell1.innerHTML = time;
    }
    else{
        row.cells[1].innerHTML = time;
    }
  }

  function onLoad(event) {
    initWebSocket();
    setInterval(function(){
        currentRace.cleanupDrivers(60000 * 1);
    }, 5000);
  }
</script>
</body>
</html>
)rawliteral";

#endif