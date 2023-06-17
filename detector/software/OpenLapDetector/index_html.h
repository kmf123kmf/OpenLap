#ifndef _Index_html
#define _Index_html
const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE HTML>
<html>
<head>
  <title>OpenLap</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <link rel="stylesheet" type="text/css" href="css/pure-min.css" />
  <link rel="stylesheet" type="text/css" href="css/openlap.css" />
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
</head>

<body>
  <div class="header">
    <div>
      <span class="titleText">OpenLap 0.1a</span>
    </div>
    <div class="globalStatusContainer">
      <div>
        <span>Connection Status: </span>
        <span id="connStatus">Disconnected</span>
      </div>
      <div>
        <span>Last Detection: </span>
        <span id="lastDetectionId">-</span>
      </div>
      <div>
        <button onclick="initDetectorConnection()">Connect</button>
        <button onclick="beginSim()">Begin Sim</button>
        <button onclick="endSim()">End Sim</button>
      </div>
    </div>
  </div>
  <div class="pure-button-group tabsHeader" role="toolbar">
    <button class="pure-button" page="sessionPage" onclick="selectTabPage(this)">Race</button>
    <button class="pure-button" page="driversPage" onclick="selectTabPage(this)">Drivers</button>
    <button class="pure-button pure-button-active" page="optionsPage" onclick="selectTabPage(this)">Settings</button>
  </div>
  <!-- Settings -->
  <div id="optionsPage" class="tabPage">
    <div class="pure-form pure-form-aligned">
      <fieldset>
        <legend>Track</legend>
        <div class="pure-control-group">
          <label for="minLapTimeInput">Min Lap Time</label>
          <input id="minLapTimeInput" type="number" min="1" max="60" value="5" />
        </div>
        <div class="pure-control-group">
          <label for="maxLapTimeInput">Max Lap Time</label>
          <input id="maxLapTimeInput" type="number" min="1" max="300" value="60" />
        </div>
      </fieldset>
      <fieldset>
        <legend>Display</legend>
        <div class="pure-control-group">
          <label for="displayDecimalPlacesSelect">Number of Decimal Places</label>
          <select id="displayDecimalPlacesSelect">
            <option value="1">1</option>
            <option value="2" selected>2</option>
            <option value="3">3</option>
          </select>
        </div>
      </fieldset>
      <fieldset>
        <legend>Speech</legend>
        <div class="settingRow">
          <div>
            <div class="pure-control-group">
              <label for="voiceSelect">Voice</label>
              <select class="voiceSelect" id="voiceSelect"></select>
            </div>
            <div class="pure-control-group">
              <label for="speechRateRange">Rate</label>
              <input type="range" class="settingSlider" id="speechRateRange">
            </div>
            <div class="pure-control-group">
              <label for="speechPitchRange">Pitch</label>
              <input type="range" class="settingSlider" id="speechPitchRange">
            </div>
            <div class="pure-control-group">
              <label for="speechVolumeRange">Volume</label>
              <input type="range" class="settingSlider" id="speechVolumeRange">
            </div>
          </div>
          <div>
            <textarea rows="3" cols="20" placeholder="Enter something to say" id="testTextArea">
Unknown Driver.
24.5.
Race is Over.</textarea>
            <button class="pure-button" onclick="AudioController.speak(testTextArea.value, true)">Test</button>
          </div>
        </div>
      </fieldset>
      <fieldset>
        <legend>Sounds</legend>
        <div class="settingRow">
          <div>
            <div class="pure-control-group">
              <label for="startTonePitchRange">Start Tone Pitch</label>
              <input type="range" class="settingSlider" id="startTonePitchRange">
            </div>
            <div class="pure-control-group">
              <label for="startToneDurationRange">Start Tone Duration</label>
              <input type="range" class="settingSlider" id="startToneDurationRange">
            </div>
            <div class="pure-control-group">
              <label for="startToneVolumeRange">Start Tone Volume</label>
              <input type="range" class="settingSlider" id="startToneVolumeRange">
            </div>
            <div class="pure-control-group">
              <label>Fade Out</label>
              <input id="startToneFadeNone" type="radio" name="startToneFade">
              <label class="radioLabel" for="startToneFadeNone">None</label>
              <input id="startToneFadeLin" type="radio" name="startToneFade">
              <label class="radioLabel" for="startToneFadeLin">Linear</label>
            </div>
          </div>
          <div><button class="pure-button" onclick="AppSettings.testTone(AppSettings.startTone)">Test</button></div>
        </div>
        <div class="settingRow">
          <div>
            <div class="pure-control-group">
              <label for="endTonePitchRange">End Tone Pitch</label>
              <input type="range" class="settingSlider" id="endTonePitchRange">
            </div>
            <div class="pure-control-group">
              <label for="endToneDurationRange">End Tone Duration</label>
              <input type="range" class="settingSlider" id="endToneDurationRange">
            </div>
            <div class="pure-control-group">
              <label for="endToneVolumeRange">End Tone Volume</label>
              <input type="range" class="settingSlider" id="endToneVolumeRange">
            </div>
            <div class="pure-control-group">
              <label>Fade Out</label>
              <input id="endToneFadeNone" type="radio" name="endToneFade">
              <label class="radioLabel" for="endToneFadeNone">None</label>
              <input id="endToneFadeLin" type="radio" name="endToneFade">
              <label class="radioLabel" for="endToneFadeLin">Linear</label>
            </div>
          </div>
          <div><button class="pure-button" onclick="AppSettings.testTone(AppSettings.expirationTone)">Test</button>
          </div>
        </div>
        <div class="settingRow">
          <div>
            <div class="pure-control-group">
              <label for="lapTonePitchRange">Lap Tone Pitch</label>
              <input type="range" class="settingSlider" id="lapTonePitchRange">
            </div>
            <div class="pure-control-group">
              <label for="lapToneDurationRange">Lap Tone Duration</label>
              <input type="range" class="settingSlider" id="lapToneDurationRange">
            </div>
            <div class="pure-control-group">
              <label for="lapToneVolumeRange">Lap Tone Volume</label>
              <input type="range" class="settingSlider" id="lapToneVolumeRange">
            </div>
            <div class="pure-control-group">
              <label>Fade Out</label>
              <input id="lapToneFadeNone" type="radio" name="lapToneFade">
              <label class="radioLabel" for="lapToneFadeNone">None</label>
              <input id="lapToneFadeLin" type="radio" name="lapToneFade">
              <label class="radioLabel" for="lapToneFadeLin">Linear</label>
            </div>
          </div>
          <div><button class="pure-button" onclick="AppSettings.testTone(AppSettings.lapTone)">Test</button></div>
        </div>
        <div class="settingRow">
          <div>
            <div class="pure-control-group">
              <label for="leaderTonePitchRange">Leader Tone Pitch</label>
              <input type="range" class="settingSlider" id="leaderTonePitchRange">
            </div>
            <div class="pure-control-group">
              <label for="leaderToneDurationRange">Leader Tone Duration</label>
              <input type="range" class="settingSlider" id="leaderToneDurationRange">
            </div>
            <div class="pure-control-group">
              <label for="leaderToneVolumeRange">Leader Tone Volume</label>
              <input type="range" class="settingSlider" id="leaderToneVolumeRange">
            </div>
            <div class="pure-control-group">
              <label>Fade Out</label>
              <input id="leaderToneFadeNone" type="radio" name="leaderToneFade">
              <label class="radioLabel" for="leaderToneFadeNone">None</label>
              <input id="leaderToneFadeLin" type="radio" name="leaderToneFade">
              <label class="radioLabel" for="leaderToneFadeLin">Linear</label>
            </div>
          </div>
          <div><button class="pure-button" onclick="AppSettings.testTone(AppSettings.leaderTone)">Test</button></div>
        </div>
      </fieldset>
    </div>
  </div>
  <!-- Drivers -->
  <div id="driversPage" class="tabPage">
    <div class="pure-form pure-form-aligned">
      <fieldset>
        <div class="pure-control-group">
          <label for="driverNameInput">Name</label>
          <input type="text" id="driverNameInput" />
        </div>
        <div class="pure-control-group">
          <label for="driverSpokenNameInput">Spoken Name</label>
          <input type="text" id="driverSpokenNameInput" />
          <button class="pure-button" id="driverTestSpeechButton">Test</button>
        </div>
        <div class="pure-control-group">
          <label for="driverTransponderIdInput">Transponder ID</label>
          <input type="number" min="0" max="999" id="driverTransponderIdInput" value="0" />
          <button class="pure-button" id="useLastButton">Use Last</button>
        </div>
        <div>
          <button class="pure-button" id="addDriverButton">Add Driver</button>
        </div>
      </fieldset>
    </div>
    <div>
      <table class="pure-table pure-table-horizontal" id="driversTable">
        <thead>
          <tr>
            <th>Transponder ID</th>
            <th>Name</th>
            <th>Spoken Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
        </tbody>
      </table>
    </div>
  </div>
  <!-- Race  -->
  <div id="sessionPage" class="tabPage">
    <label for="modeSelect">Mode</label>
    <select id="modeSelect"></select>
    <label for="timeControlInput">Time Control</label>
    <input type="number" id="timeControlInput" min="0" max="600" value="0" />
    <select id="timeControlSelect">
    </select>
    <button class="pure-button" id="startButton">Start</button>
    <div style="display:inline-block; margin-left:50px;">
      <button id="addDriversButton" class="pure-button">Register Drivers</button>
      <button id="resetDriversButton" class="pure-button">Reset Drivers</button>
      <button id="clearDriversButton" class="pure-button">Clear Drivers</button>
    </div>
    <div class="scoreBoard">
      <div>
        <span id="elapsedTimeDiv" style="display:inline-block">
        </span>
        <span id="remainingTimeDiv" style="display:inline-block">
        </span>
      </div>
      <div class="paneContainer">
        <div id="driverBoard" class="scoreBoardLeftPane">
          <table class="pure-table pure-table-horizontal driverTable" id="scoreBoardTable">
            <thead>
              <tr>
                <th col-id="pos">Pos</th>
                <th col-id="num">#</th>
                <th col-id="id">ID</th>
                <th col-id="drv">Driver</th>
                <th col-id="lps">Laps</th>
                <th col-id="tim">Time</th>
                <th col-id="pce">Pace</th>
                <th col-id="gap">Gap</th>
                <th col-id="int">Int</th>
                <th col-id="clk">Clock</th>
                <th col-id="lst">Last</th>
                <th col-id="avg">Avg</th>
                <th col-id="fst">Fast</th>
              </tr>
            </thead>
            <tbody>
            </tbody>
          </table>
        </div>
        <div id="raceSplitter" class="gutter"></div>
        <div id="infoBoard" class="scoreBoardRightPane">
          <div class="pure-button-group tabsHeader" role="toolbar">
            <button class="pure-button pure-button-active" page="lapPanel" onclick="selectTabPage(this)">Laps</button>
            <button class="pure-button" page="positionPanel" onclick="selectTabPage(this)">Position</button>
          </div>
          <div id="lapPanel" class="tabPage">
            <div id="lapsBoardDiv" class="lapBoard">
            </div>
          </div>
          <div id="positionPanel" class="tabPage">
            <div id="positionGraphDiv">
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script src="js/openlap.js"></script>
</body>
<footer></footer>
</html>
)rawliteral";
#endif