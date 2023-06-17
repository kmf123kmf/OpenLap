#ifndef _OpenLap_CSS
#define _OpenLap_CSS

const char openlap_css[] PROGMEM = R"rawliteral(
:root {
    --theme-main-color: darkslateblue;
    --document-padding: 5px;
}

html {
    padding: var(--document-padding);
}

body {
    min-height: calc(100vh - calc((var(--document-padding) * 2)));
    display: flex;
    flex-direction: column;
}

footer {
    background-color: var(--theme-main-color);
    min-height: 10px;
    margin-top: auto;
}

.vehicleDriverName {
    font-weight: bold;
    font-size: 0.9rem;
}

.vehicleFinished .vehicleProgressBar {
    visibility: hidden;
}

.vehicleLowerInfo {
    display: flex;
    align-items: center;
}

.vehicleProgressBar {
    height: 100%;
    margin: 0px;
    background-color: green;
}

.vehicleProgressBar.percent100 {
    background-color: red;
}

.vehicleProgressBar.percent75 {
    background-color: orange;
}

.vehicleFinished .vehicleProgressBarContainer {
    background-color: dimgrey;
}

.vehicleProgressBarContainer {
    display: inline-block;
    width: 10em;
    height: 0.5rem;
    border: solid 1px black;
    margin: 2px;
    background-color: white;
}

.vehicleNotStarted .currentLapTime {
    visibility: hidden;
}

.vehicleFinished .currentLapTime {
    visibility: hidden;
}

.currentLapTime {
    font-size: 0.75rem;
}

.vehicleNumber {
    width: 28px;
    height: 24px;
    text-align: center;
    vertical-align: middle;
    line-height: 24px;
    border: solid black 2px;
    border-radius: 6px;
    font-weight: bold;
    background-color: white;
    color: black;
}

/* Tooltip text */
.tooltip .tooltiptext {
    visibility: hidden;
    width: 150px;
    background-color: var(--theme-main-color);
    color: #fff;
    text-align: center;
    padding: 5px 0;
    border-radius: 6px;
    z-index: 1;
    position: relative;
    top: -65px;
    left: 0%;
}

/* Show the tooltip text when you mouse over the tooltip container */
.tooltip:hover .tooltiptext {
    visibility: visible;
}

.lapBoard .vehicleNumber {
    margin-bottom: 10px;
    margin-top: 10px;
}

.scoreBoard {
    border-top: solid 2px var(--theme-main-color);
    margin-top: 2px;
    padding: 2px;
}

.scoreBoard [draggable="true"]{
    user-select: none;
    cursor:grab;
}

.vehicleFinished {
    background-color: #ff7676;
    color: black;
}

.vehicleUpdateNew {
    background-color: lightgreen;
    color: black;
}

.vehicleUpdateLapCompleted {
    background-color: yellow;
}

.vehicleUpdateFalseDetection {
    background-color: red;
    color: white;
}

.driverBoard {
    margin-top: 2px;
    padding: 2px;
    border: solid 2px var(--theme-main-color);
}

.titleText {
    font-size: 1.5rem;
}

.globalStatusContainer {
    font-size: 0.8rem;
}

.header {
    background-color: var(--theme-main-color);
    color: white;
    padding: 15px;
    display: flex;
    justify-content: space-between;
}

.raceClock {
    font-size: 1.0rem;
    text-align: center;
    margin-left: 10px;
    margin-bottom: 10px;
    border-color: black;
    border-width: 2px;
    border-radius: 5px;
}

.raceClock div {
    font-size: 1.5rem;
}

.raceClockLabel {
    font-size: 70%;
    margin-left: 10px;
    margin-top: 3px;
}

.connected {
    color: rgb(101, 233, 101);
}

.disconnected {
    color: red;
}

.tabsHeader {
    margin-top: 3px;
}

.tabsHeader button {
    font-size: 85%;
}

.driverTable {
    width: 100%;
}

.settingSlider {
    width: 17rem;
}

.voiceSelect {
    width: 17rem;
}

.none {
    inherits: none;
}

.settingRow {
    display: flex;
    margin-bottom: 2rem;
}

.settingRow>div:nth-child(2) {
    margin-left: 2rem;
}

.pure-form-aligned .pure-control-group .radioLabel {
    text-align: left;
    width: auto;
    margin-left: 0.2rem;
}

.tabPage {
    border-top: solid 1px darkgray;
    padding: 3px;
    font-size: 85%;
    display: none;
}

.paneContainer {
    display: flex;
    height: calc(100vh - 250px);
    width: calc(100vw - 20px);
}

.scoreBoardLeftPane {
    overflow-x: auto;
    min-width: 10rem
}

.scoreBoardRightPane {
    position: relative;
    padding-left: 10px;
    overflow-x: auto;
    flex: 1 1 10rem;
}

.gutter {
    height: 100%;
    width: 10px;
    cursor: col-resize;
}

.lapBoard {
    display: flex;
    flex-direction: row;
    text-align: right;
    font-size: 0.9rem;
}

.lapBoard>div {
    margin-left: 10px;
    margin-right: 10px;
}

.lapBoard>div>div {
    margin-bottom: 4px;
}

.bestLap {
    font-weight: bold;
}

.pure-button.driverManagerButton {
    margin-left:5px;
}

.positionGraphContainer {
    border: 1px solid #a2a2a2;
    height: 400px;
    width: 600px;
    resize: both;
    overflow: hidden;
    padding: 5px;
    min-width: 100px;
    min-height: 100px;
}
)rawliteral";
#endif