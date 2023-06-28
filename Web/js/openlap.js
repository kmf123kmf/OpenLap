class DialogAnimator {
    d;
    clickHandler;
    constructor(dialog) {
        this.d = dialog;
        this.clickHandler = this.closeDialog.bind(this);
        dialog.querySelectorAll(".closer").forEach((closer) => {
            closer.addEventListener("click", (e) => {
                e.preventDefault();
                this.d.classList.add("hiding");
                this.d.addEventListener("animationend", this.clickHandler);
            });
        });
    }
    closeDialog(e) {
        this.d.classList.remove("hiding");
        this.d.close();
        this.d.removeEventListener("animationend", this.clickHandler);
    }
}
class HorizontalResizer {
    leftPane;
    rightPane;
    gutter;
    prevX;
    leftRect;
    boundmousemove;
    boundmouseup;
    constructor(leftPane, rightPane, gutter) {
        this.leftPane = leftPane;
        this.rightPane = rightPane;
        this.gutter = gutter;
        gutter.addEventListener('mousedown', this.resize.bind(this));
    }
    resize(e) {
        document.body.style.cursor = 'col-resize';
        this.leftPane.style.userSelect = 'none';
        this.leftPane.style.pointerEvents = 'none';
        this.rightPane.style.userSelect = 'none';
        this.rightPane.style.pointerEvents = 'none';
        this.boundmousemove = this.mousemove.bind(this);
        this.boundmouseup = this.mouseup.bind(this);
        window.addEventListener('mousemove', this.boundmousemove);
        window.addEventListener('mouseup', this.boundmouseup);
        this.prevX = e.x;
        this.leftRect = this.leftPane.getBoundingClientRect();
    }
    mousemove(e) {
        let newX = this.prevX - e.x;
        this.leftPane.style.width = this.leftRect.width - newX + "px";
    }
    mouseup() {
        document.body.style.removeProperty('cursor');
        this.leftPane.style.removeProperty('user-select');
        this.leftPane.style.removeProperty('pointer-events');
        this.rightPane.style.removeProperty('user-select');
        this.rightPane.style.removeProperty('pointer-events');
        window.removeEventListener('mousemove', this.boundmousemove);
        window.removeEventListener('mouseup', this.boundmouseup);
    }
}
class PositionGraph {
    svg;
    data = [];
    numLaps = 0;
    gridColor = "#bbb";
    gridStrokeWidth = 1;
    vehicleStrokeWidth = 3;
    dotStrokeWidth = 3;
    dotFill = "#fff";
    dotRadius = 4;
    xGridSize;
    yGridSize;
    xOffset = 30;
    yOffset = 30;
    svgWidth = 0;
    svgHeight = 0;
    positionColors = [
        "#e41a1c",
        "#377eb8",
        "#4daf4a",
        "#984ea3",
        "#ff7f00",
        "#ffff33",
        "#a65628",
        "#f781bf",
        "#276700",
        "#63f4e6",
        "#ffdc56",
        "#4055fd",
        "#ff00c6",
        "#00d912",
        "#9b0000",
        "#3b087d",
        "#147b8d",
        "#c39253",
        "#000000",
        "#8a87ef"
    ];
    constructor(div) {
        div.classList.add("positionGraphContainer");
        this.svg = makeSvg("svg");
        this.svg.setAttribute("width", "100%");
        this.svg.setAttribute("height", "calc(100% - 30px)");
        div.appendChild(this.svg);
        const resizeObserver = new ResizeObserver((entries) => {
            this.draw();
        });
        resizeObserver.observe(this.svg);
    }
    clear() {
        this.data = [];
        this.numLaps = 0;
    }
    recordLapPosition(v) {
        let record = this.data.find((r) => r.vehicle.number() == v.number());
        if (!record) {
            record = new VehiclePositionRecord(v);
            let i = this.data.findIndex((r) => r.vehicle.number() > v.number());
            if (i > -1) {
                this.data.splice(i, 0, record);
            }
            else {
                this.data.push(record);
            }
        }
        this.numLaps = Math.max(v.lapsCompleted, this.numLaps);
        if (record.lapPositions.length < v.lapsCompleted + 1) {
            record.lapPositions.push(v.position);
        }
        else {
            record.lapPositions[v.lapsCompleted] = v.position;
        }
        if (v.lapsCompleted > 0) {
            let pos = v.position;
            let bumped = this.data.find((r) => r !== record && r.lapPositions[v.lapsCompleted] == pos);
            while (bumped) {
                bumped.lapPositions[v.lapsCompleted] = ++pos;
                bumped = this.data.find((r) => r !== bumped && r.lapPositions[v.lapsCompleted] == pos);
            }
        }
    }
    getPositionColor(idx) {
        if (idx >= this.positionColors.length) {
            this.positionColors[idx] = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
        }
        return this.positionColors[idx];
    }
    addLapLine(svg, lap) {
        let line = makeSvg("line");
        line.style.stroke = this.gridColor;
        line.style.strokeWidth = String(this.gridStrokeWidth);
        line.setAttribute("x1", String(this.xOffset + lap * this.xGridSize));
        line.setAttribute("x2", String(this.xOffset + lap * this.xGridSize));
        line.setAttribute("y1", String(this.yOffset));
        line.setAttribute("y2", String(this.yOffset + this.svgHeight - this.yGridSize));
        svg.appendChild(line);
        let lapNum = makeSvg("text");
        lapNum.textContent = lap == 0 ? "Lap" : String(lap);
        lapNum.setAttribute("x", String(this.xOffset + lap * this.xGridSize - 4));
        lapNum.setAttribute("y", String(this.yOffset + this.svgHeight - this.yGridSize + 20));
        svg.appendChild(lapNum);
    }
    addPositionLine(svg, pos) {
        let line = makeSvg("line");
        line.style.stroke = this.gridColor;
        line.style.strokeWidth = String(this.gridStrokeWidth);
        line.setAttribute("x1", String(this.xOffset));
        line.setAttribute("x2", String(this.xOffset + this.svgWidth));
        line.setAttribute("y1", String(this.yOffset + pos * this.yGridSize));
        line.setAttribute("y2", String(this.yOffset + pos * this.yGridSize));
        svg.appendChild(line);
        let posNum = makeSvg("text");
        posNum.textContent = String(pos + 1);
        posNum.setAttribute("x", String(5));
        posNum.setAttribute("y", String(this.yOffset + pos * this.yGridSize + 5));
        svg.appendChild(posNum);
    }
    draw() {
        empty(this.svg);
        let data = this.data;
        let laps = this.numLaps;
        let cars = data.length;
        if (cars == 0) {
            return;
        }
        let b = this.svg.getBoundingClientRect();
        this.svgHeight = b.height - this.yOffset;
        this.svgWidth = b.width - this.xOffset - 150;
        this.xGridSize = laps > 0 ? this.svgWidth / laps : 0;
        this.yGridSize = cars > 0 ? this.svgHeight / cars : 0;
        for (let x = 0; x <= laps; x++) {
            if (x % 5 == 0) {
                this.addLapLine(this.svg, x);
            }
        }
        for (let y = 0; y < cars; y++) {
            this.addPositionLine(this.svg, y);
        }
        let legendY = this.yOffset;
        let legendX = b.width - 135;
        let dots = [];
        for (let i = 0; i < data.length; i++) {
            let laps = data[i].lapPositions;
            let v = data[i].vehicle;
            let color = this.getPositionColor(v.number() - 1);
            let sq = makeSvg("rect");
            sq.setAttribute("x", String(legendX));
            sq.setAttribute("y", String(legendY));
            sq.setAttribute("width", String(20));
            sq.setAttribute("height", String(20));
            sq.style.fill = color;
            this.svg.appendChild(sq);
            let txt = makeSvg("text");
            txt.textContent = `#${v.number()} - ${v.driver.name}`;
            txt.setAttribute("x", String(legendX + 20 + 5));
            txt.setAttribute("y", String(legendY + (20 / 2 + 3)));
            this.svg.appendChild(txt);
            legendY += 20 + 5;
            let prevX = null;
            let prevY = null;
            for (let j = 0; j < laps.length; j++) {
                let position = laps[j];
                let pX = this.xOffset + j * this.xGridSize;
                let pY = this.yOffset + position * this.yGridSize;
                if (prevX && prevY) {
                    let line = makeSvg("line");
                    line.setAttribute("x1", String(prevX));
                    line.setAttribute("y1", String(prevY));
                    line.setAttribute("x2", String(pX));
                    line.setAttribute("y2", String(pY));
                    line.style.fill = "none";
                    line.style.stroke = color;
                    line.style.strokeWidth = String(this.vehicleStrokeWidth);
                    this.svg.appendChild(line);
                }
                let dot = makeSvg("circle");
                dot.setAttribute("cx", String(pX));
                dot.setAttribute("cy", String(pY));
                dot.setAttribute("r", String(this.dotRadius));
                dot.setAttribute("lap", String(j));
                dot.setAttribute("driverName", v.driver.name);
                dot.setAttribute("position", String(position));
                dot.style.stroke = color;
                dot.style.fill = this.dotFill;
                dot.style.strokeWidth = String(this.dotStrokeWidth);
                let title = makeSvg("title");
                title.textContent = v.driver.name;
                dot.appendChild(title);
                dot.addEventListener("mouseenter", this.onHoverDot.bind(this));
                dot.addEventListener("mouseout", this.onDotLeave.bind(this));
                dots.push(dot);
                prevX = pX;
                prevY = pY;
            }
        }
        for (let dot of dots) {
            this.svg.appendChild(dot);
        }
    }
    onHoverDot(e) {
        let dot = e.target;
        dot.style.fill = dot.style.stroke;
        dot.setAttribute("r", String(this.dotRadius * 1.5));
    }
    onDotLeave(e) {
        let dot = e.target;
        dot.style.fill = this.dotFill;
        dot.setAttribute("r", String(this.dotRadius));
    }
}
class VehiclePositionRecord {
    vehicle;
    lapPositions;
    constructor(v) {
        this.vehicle = v;
        this.lapPositions = [];
    }
}
class SpeechSetting {
    voice = null;
    rate = 1.5;
    pitch = 1.0;
    volume = 1.0;
    constructor(voice, r, p, v) {
        this.voice = voice;
        this.rate = r;
        this.pitch = p;
        this.volume = v;
    }
}
var ToneFade;
(function (ToneFade) {
    ToneFade[ToneFade["None"] = 0] = "None";
    ToneFade[ToneFade["Linear"] = 1] = "Linear";
})(ToneFade || (ToneFade = {}));
class ToneSetting {
    duration;
    frequency;
    volume;
    fade = ToneFade.None;
    min;
    max;
    step;
    default;
    constructor(d, f, v, fade = ToneFade.None) {
        this.duration = d;
        this.frequency = f;
        this.volume = v;
        this.fade = fade;
    }
}
class AppSettings {
    static minLapTimeMilliseconds = 5000;
    static maxLapTimeMilliseconds = 60000;
    static displayDecimalPlaces = 2;
    static startTone = new ToneSetting(1000, 340, 20, ToneFade.None);
    static expirationTone = new ToneSetting(1000, 107, 20, ToneFade.None);
    static leaderTone = new ToneSetting(500, 440, 20, ToneFade.Linear);
    static lapTone = new ToneSetting(500, 220, 20, ToneFade.Linear);
    static speech = new SpeechSetting(null, 1.5, 1.0, 1.0);
    static initMinLapTime(input) {
        AppSettings.minLapTimeMilliseconds = Number(input.value) * 1000;
        input.addEventListener("input", (e) => {
            AppSettings.minLapTimeMilliseconds = Number(input.value) * 1000;
            console.log("Min Lap Time changed to " + input.value);
        });
    }
    static initMaxLapTime(input) {
        AppSettings.maxLapTimeMilliseconds = Number(input.value) * 1000;
        input.addEventListener("input", (e) => {
            AppSettings.maxLapTimeMilliseconds = Number(input.value) * 1000;
            console.log("Max Lap Time changed to " + input.value);
        });
    }
    static initDecimalPlaces(select) {
        AppSettings.displayDecimalPlaces = Number(select.value);
        select.addEventListener("change", (e) => {
            AppSettings.displayDecimalPlaces = Number(select.value);
            console.log("Display Decimal Places changed to " + select.value);
        });
    }
    static initStartTone(pitchSlider, durationSlider, volumeSlider, fadeNoneInput, fadeLinInput) {
        AppSettings.initTone('startTone', AppSettings.startTone, pitchSlider, 60, 880, 10, 340, durationSlider, 500, 3000, 100, 1000, volumeSlider, fadeNoneInput, fadeLinInput);
    }
    static initExpirationTone(pitchSlider, durationSlider, volumeSlider, fadeNoneInput, fadeLinInput) {
        AppSettings.initTone('expirationTone', AppSettings.expirationTone, pitchSlider, 60, 880, 10, 110, durationSlider, 500, 3000, 100, 1000, volumeSlider, fadeNoneInput, fadeLinInput);
    }
    static initLapTone(pitchSlider, durationSlider, volumeSlider, fadeNoneInput, fadeLinInput) {
        AppSettings.initTone('lapTone', AppSettings.lapTone, pitchSlider, 60, 880, 10, 220, durationSlider, 50, 500, 10, 100, volumeSlider, fadeNoneInput, fadeLinInput);
    }
    static initLeaderTone(pitchSlider, durationSlider, volumeSlider, fadeNoneInput, fadeLinInput) {
        AppSettings.initTone('leaderTone', AppSettings.leaderTone, pitchSlider, 60, 880, 10, 440, durationSlider, 50, 500, 10, 100, volumeSlider, fadeNoneInput, fadeLinInput);
    }
    static initTone(toneName, setting, pitchSlider, fMin, fMax, fStep, fDefault, durationSlider, dMin, dMax, dStep, dDefault, volumeSlider, fadeNoneInput, fadeLinInput) {
        let fKey = `ol_${toneName}Freq`;
        let dKey = `ol_${toneName}Duration`;
        let vKey = `ol_${toneName}Volume`;
        let fdKey = `ol_${toneName}Fade`;
        let freq = window.localStorage.getItem(fKey);
        let dur = window.localStorage.getItem(dKey);
        let vol = Number(window.localStorage.getItem(vKey));
        let fade = window.localStorage.getItem(fdKey);
        setting.frequency = freq || fDefault;
        setting.duration = dur || dDefault;
        setting.volume = vol || 20;
        setting.fade = fade ? Number(fade) : ToneFade.None;
        AppSettings.initSlider(pitchSlider, fMin, fMax, fStep, setting.frequency, (e) => AppSettings.handleSliderChanged(e, (v) => setting.frequency = v, fKey));
        AppSettings.initSlider(durationSlider, dMin, dMax, dStep, setting.duration, (e) => AppSettings.handleSliderChanged(e, (v) => setting.duration = v, dKey));
        AppSettings.initSlider(volumeSlider, 0, 100, 10, setting.volume, (e) => AppSettings.handleSliderChanged(e, (v) => setting.volume = v, vKey));
        fadeNoneInput.value = String(ToneFade.None);
        fadeNoneInput.checked = setting.fade == ToneFade.None;
        fadeLinInput.value = String(ToneFade.Linear);
        fadeLinInput.checked = setting.fade == ToneFade.Linear;
        let handleFadeChanged = (e) => {
            let input = e.target;
            if (input.checked) {
                setting.fade = Number(input.value);
                window.localStorage.setItem(fdKey, input.value);
                console.log(`Changed ${fdKey} to ${ToneFade[Number(input.value)]}`);
            }
        };
        fadeNoneInput.addEventListener('change', handleFadeChanged);
        fadeLinInput.addEventListener('change', handleFadeChanged);
    }
    static testTone(setting) {
        AudioController.playTone(setting);
    }
    static initSpeechSliders(rateRange, pitchRange, volumeRange) {
        let preferredRate = window.localStorage.getItem('ol_preferredSpeechRate');
        let preferredPitch = window.localStorage.getItem('ol_preferredSpeechPitch');
        let preferredVolume = window.localStorage.getItem('ol_preferredSpeechVolume');
        AppSettings.speech.rate = Number(preferredRate ? preferredRate : 1);
        AppSettings.speech.pitch = Number(preferredPitch ? preferredPitch : 1);
        AppSettings.speech.volume = Number(preferredVolume ? preferredVolume : 1);
        AppSettings.initSlider(rateRange, 0.1, 5, 0.1, AppSettings.speech.rate, (e) => AppSettings.handleSliderChanged(e, (v) => AppSettings.speech.rate = v, 'ol_preferredSpeechRate'));
        AppSettings.initSlider(pitchRange, 0.1, 2, 0.1, AppSettings.speech.pitch, (e) => AppSettings.handleSliderChanged(e, (v) => AppSettings.speech.pitch = v, 'ol_preferredSpeechPitch'));
        AppSettings.initSlider(volumeRange, 0.1, 1, 0.1, AppSettings.speech.volume, (e) => AppSettings.handleSliderChanged(e, (v) => AppSettings.speech.volume = v, 'ol_preferredSpeechVolume'));
    }
    static initSpeechVoices(voiceSelect) {
        let preferredVoiceName = localStorage.getItem('ol_preferredSpeechVoice');
        empty(voiceSelect);
        let voices = speechSynthesis.getVoices();
        voices.forEach(function (voice, i) {
            let opt = makeOpt(voice.name);
            opt.value = voice.name;
            if (voice.name == preferredVoiceName) {
                opt.selected = true;
                AppSettings.speech.voice = voice;
            }
            voiceSelect.appendChild(opt);
        });
        voiceSelect.addEventListener("change", (e) => AppSettings.handleSpeechVoiceChanged(e));
    }
    static initSlider(slider, min, max, step, value, handler) {
        let output = makeOutput(String(value));
        slider.min = String(min);
        slider.max = String(max);
        slider.step = String(step);
        slider.value = String(value);
        slider.parentElement.appendChild(output);
        slider.addEventListener("input", (e) => output.value = slider.value);
        slider.addEventListener("change", handler);
    }
    static handleSpeechVoiceChanged(e) {
        let voices = window.speechSynthesis.getVoices();
        AppSettings.speech.voice = voices.find((v) => v.name == e.target.selectedOptions[0].value);
        window.localStorage.setItem('ol_preferredSpeechVoice', AppSettings.speech.voice.name);
        console.log(`Speech Voice changed to ${AppSettings.speech.voice.name}`);
    }
    static handleSliderChanged(e, set, key) {
        let input = e.target;
        set(Number(input.value));
        window.localStorage.setItem(key, input.value);
        console.log(`${key} changed to ${input.value}`);
    }
}
function empty(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}
function byId(id) {
    return document.getElementById(id);
}
function makeElement(name, content) {
    let e = document.createElement(name);
    if (content) {
        if (content instanceof HTMLElement) {
            e.appendChild(content);
        }
        else {
            e.textContent = content;
        }
    }
    return e;
}
function makeSvg(name) {
    return document.createElementNS("http://www.w3.org/2000/svg", name);
}
function makeOutput(content) {
    return makeElement("output", content);
}
function makeButton(content) {
    return makeElement("button", content);
}
function makeSpan(content) {
    return makeElement("span", content);
}
function makeLegend(content) {
    return makeElement("legend", content);
}
function makeFieldset(content) {
    return makeElement("fieldset", content);
}
function makeDiv(content) {
    return makeElement("div", content);
}
function makeTd(content) {
    return makeElement("td", content);
}
function makeTr(content) {
    return makeElement("tr", content);
}
function makeOpt(content) {
    return makeElement("option", content);
}
function selectTabPage(e) {
    e.parentElement.querySelectorAll(":scope>button")
        .forEach((btn) => {
        byId(btn.getAttribute("page")).style.display = "none";
    });
    byId(e.getAttribute("page")).style.display = "block";
    e.parentElement.querySelectorAll("button").forEach((bt) => bt.classList.remove("pure-button-active"));
    e.classList.add("pure-button-active");
}
class AudioController {
    static pendingSpeech = 0;
    static audioContext = new AudioContext();
    static speak(text, immediate = false, forceEnqueue = false) {
        if (immediate || false) {
            AudioController.pendingSpeech = 0;
            window.speechSynthesis.cancel();
        }
        if (!forceEnqueue && this.pendingSpeech >= 3) {
            console.log(`Declined speech: ${text}`);
            return;
        }
        AudioController.pendingSpeech++;
        var msg = new SpeechSynthesisUtterance();
        msg.text = text;
        msg.volume = AppSettings.speech.volume;
        msg.rate = AppSettings.speech.rate;
        msg.pitch = AppSettings.speech.pitch;
        msg.voice = AppSettings.speech.voice;
        msg.onend = () => AudioController.pendingSpeech--;
        window.speechSynthesis.speak(msg);
    }
    static playTone(setting = new ToneSetting(500, 440, 20, ToneFade.None)) {
        return new Promise((resolve, reject) => {
            try {
                let oscillatorNode = AudioController.audioContext.createOscillator();
                let gainNode = AudioController.audioContext.createGain();
                oscillatorNode.connect(gainNode);
                oscillatorNode.frequency.value = setting.frequency;
                oscillatorNode.type = "square";
                gainNode.connect(AudioController.audioContext.destination);
                let startTime = AudioController.audioContext.currentTime;
                let endTime = AudioController.audioContext.currentTime + setting.duration * 0.001;
                gainNode.gain.value = setting.volume * 0.01;
                if (setting.fade == ToneFade.Linear) {
                    gainNode.gain.linearRampToValueAtTime(0.00001, endTime);
                }
                oscillatorNode.start(startTime);
                oscillatorNode.stop(endTime);
                oscillatorNode.onended = (e) => {
                    resolve(e);
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
}
class DriverManager {
    nameInput;
    spokenInput;
    idInput;
    noteInput;
    driverTable;
    driverList = [];
    constructor(nameInput, spokenInput, testSpeechButton, idInput, noteInput, addButton, driverTable, importButton, exportButton) {
        this.nameInput = nameInput;
        this.spokenInput = spokenInput;
        this.idInput = idInput;
        this.noteInput = noteInput;
        this.driverTable = driverTable;
        addButton.addEventListener("click", this.handleAddDriver.bind(this));
        testSpeechButton.addEventListener("click", () => this.testDriverSpeech(this.nameInput.value.trim(), this.spokenInput.value.trim()));
        let uploadInput = makeElement("input");
        uploadInput.setAttribute("type", "file");
        uploadInput.setAttribute("accept", ".json");
        uploadInput.style.display = "none";
        uploadInput.addEventListener("change", (e) => this.importDrivers(e));
        document.body.appendChild(uploadInput);
        importButton.addEventListener("click", () => uploadInput.click());
        exportButton.addEventListener("click", () => this.exportDrivers());
    }
    importDrivers(e) {
        let json = null;
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.addEventListener("load", (event) => {
            json = event.target.result;
            try {
                let data = JSON.parse(json);
                this.setDriverList(data);
            }
            catch {
                console.log('Failed to load drivers file');
            }
        });
        reader.readAsText(file);
    }
    exportDrivers() {
        let d = new Date();
        let filename = `OpenLap_Drivers_${d.getFullYear()}-${d.getMonth()}-${d.getDay()}_${d.getHours()}.${d.getMinutes()}.json`;
        let data = JSON.stringify(this.driverList, null, 2);
        const blob = new Blob([data]);
        const link = makeElement("a");
        link.download = filename;
        link.href = window.URL.createObjectURL(blob);
        link.click();
    }
    testDriverSpeech(name, spoken) {
        if (spoken?.length > 0) {
            AudioController.speak(spoken, true);
        }
        else {
            AudioController.speak(name, true);
        }
    }
    getDrivers() {
        return [...this.driverList];
    }
    clearTable() {
        let tbody = this.driverTable.querySelector('tbody');
        empty(tbody);
    }
    loadDrivers() {
        let data = window.localStorage.getItem("driverData");
        if (data) {
            try {
                console.log("Read driverData string: " + data);
                let saved = JSON.parse(data);
                console.log("Loaded " + saved.length + " drivers");
                this.setDriverList(saved);
            }
            catch {
                console.log("Failed to load drivers from local storage");
            }
        }
    }
    setDriverList(list) {
        for (let d of list) {
            if (!d.hasOwnProperty("i") || !d.hasOwnProperty("n") || !d.hasOwnProperty("s")) {
                alert('Could not import driver list');
                return;
            }
        }
        this.clearTable();
        for (let d of list) {
            this.addDriver(d.i, d.n, d.s, d.t || '');
        }
        this.driverList = list;
        this.saveDrivers();
    }
    lookupDriver(id) {
        let saved = this.driverList.find((d) => d.i == String(id));
        if (saved) {
            console.log("Found driver " + saved.n + ":" + saved.s);
            return new Driver(saved.n, saved.s);
        }
        else {
            return Driver.unknown();
        }
    }
    saveDrivers() {
        let data = JSON.stringify(this.driverList);
        console.log("Saving Drivers:" + data);
        window.localStorage.setItem("driverData", data);
    }
    addDriver(id, name, spoken, note) {
        let tbody = this.driverTable.querySelector('tbody');
        let tr = makeTr();
        tr.appendChild(makeTd(String(id)));
        tr.appendChild(makeTd(name));
        tr.appendChild(makeTd(spoken));
        tr.appendChild(makeTd(note));
        let delBtn = makeButton('Delete');
        delBtn.classList.add('pure-button', 'driverManagerButton');
        delBtn.addEventListener('click', this.handleDeleteDriver.bind(this));
        let testBtn = makeButton('Test');
        testBtn.classList.add('pure-button', 'driverManagerButton');
        testBtn.addEventListener('click', () => this.testDriverSpeech(name, spoken));
        let actionsCell = makeTd();
        actionsCell.appendChild(delBtn);
        actionsCell.appendChild(testBtn);
        tr.appendChild(actionsCell);
        let rows = this.driverTable.rows;
        for (let i = 1; i < rows.length; i++) {
            let currentId = Number(rows[i].cells[0].innerHTML);
            if (currentId > Number(id)) {
                rows[i].before(tr);
                return;
            }
        }
        tbody.appendChild(tr);
    }
    handleAddDriver(e) {
        let name = this.nameInput.value.trim();
        let spoken = this.spokenInput.value.trim();
        let id = this.idInput.value.trim();
        let note = this.noteInput.value.trim();
        if (this.driverList.find((d) => d.i.trim() == id.trim())) {
            AlertDialog.show("Unable to add driver. A driver is already associated with Transponder ID " + id.trim());
            return;
        }
        this.addDriver(id, name, spoken, note);
        this.driverList.push({ i: id, n: name, s: spoken, t: note });
        this.saveDrivers();
    }
    handleDeleteDriver(e) {
        let button = e.target;
        let row = button.parentElement.parentElement;
        let id = row.cells[0].innerHTML.trim();
        let i = this.driverList.findIndex((d) => d.i == id);
        if (i > -1) {
            this.driverList.splice(i, 1);
            row.remove();
            this.saveDrivers();
        }
        else {
            alert("Unable to delete driver. Entry for ID " + id + " does not exist in database.");
        }
    }
}
function speakLapTime(millis) {
    let wholeSeconds = Math.trunc(millis / 1000);
    let seconds = (millis / 1000).toFixed(1);
    let text;
    text = String(seconds).replace('.0', ' flat');
    if (wholeSeconds % 10 != 0 || wholeSeconds % 100 === 10) {
        text = text.replace(".", " ");
    }
    AudioController.speak(text);
}
function getClockString(millis, includeMs = false) {
    let totalSeconds = Math.abs(millis / 1000);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = Math.floor(totalSeconds % 60);
    let ms = totalSeconds - Math.floor(totalSeconds);
    let s = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    if (includeMs) {
        s += String(ms.toFixed(AppSettings.displayDecimalPlaces)).slice(1);
    }
    if (millis < 0) {
        s = "-" + s;
    }
    return s;
}
class TimeControl {
    min;
    max;
    elapsedDiv;
    remainingDiv;
    isExpired(millis) {
        return false;
    }
    reset(millis) { }
    init(elapsed, remaining) {
    }
    notify(v) {
    }
    calculatePace(v) {
    }
    vehicleIsFinished(v) {
        return false;
    }
    update(millis) {
    }
}
class LimitTimeControl extends TimeControl {
    timeLimit;
    timeMillis;
    timeStarted;
    constructor(timeLimit) {
        super();
        this.timeLimit = timeLimit;
        this.min = 0;
        this.max = 99;
        this.timeMillis = timeLimit * 60000;
        this.timeStarted = 0;
        this.elapsedDiv = null;
        this.remainingDiv = null;
    }
    reset(millis) {
        this.timeStarted = millis;
    }
    init(elapsed, remaining) {
        empty(elapsed);
        empty(remaining);
        let fs = makeFieldset(makeLegend('Elapsed'));
        fs.classList.add("raceClock");
        let div = makeDiv("00:00");
        this.elapsedDiv = div;
        fs.appendChild(div);
        elapsed.appendChild(fs);
        fs = makeFieldset(makeLegend("Remaining"));
        fs.classList.add("raceClock");
        div = makeDiv(`${String(this.timeLimit).padStart(2, '0')}:00`);
        this.remainingDiv = div;
        fs.appendChild(div);
        remaining.appendChild(fs);
    }
    notify(v) {
    }
    update(millis) {
        let timeRemaining = this.timeMillis - (millis - this.timeStarted);
        this.elapsedDiv.textContent = getClockString(this.timeMillis - timeRemaining);
        this.remainingDiv.textContent = this.timeMillis > 0 ? getClockString(timeRemaining) : "--:--";
    }
    isExpired(millis) {
        if (this.timeMillis == 0) {
            return false;
        }
        let elapsed = millis - this.timeStarted;
        return elapsed >= this.timeMillis;
    }
    calculatePace(v) {
        if (this.timeLimit === 0 || !v.avgLap || v.avgLap <= 0) {
            return "-";
        }
        else {
            let numLaps = Math.floor(this.timeMillis / v.avgLap);
            let finishTime = numLaps * v.avgLap;
            if (finishTime < this.timeMillis) {
                numLaps++;
                finishTime += v.avgLap;
            }
            return `${numLaps}/${getClockString(finishTime)}`;
        }
    }
    vehicleIsFinished(vehicle) {
        if (this.timeLimit <= 0) {
            return false;
        }
        return vehicle.time >= this.timeMillis;
        ;
    }
}
class LapTimeControl extends TimeControl {
    lapTarget;
    lapsCompleted;
    constructor(lapTarget) {
        super();
        this.lapTarget = lapTarget;
        this.min = 0;
        this.max = 999;
        this.lapsCompleted = 0;
        this.elapsedDiv = null;
        this.remainingDiv = null;
    }
    reset(millis) {
        this.lapsCompleted = 0;
    }
    init(elapsed, remaining) {
        empty(elapsed);
        empty(remaining);
        let fs = makeFieldset(makeLegend("Completed"));
        fs.classList.add("raceClock");
        let div = makeDiv("000");
        this.elapsedDiv = div;
        fs.appendChild(div);
        elapsed.appendChild(fs);
        fs = makeFieldset(makeLegend("To Go"));
        fs.classList.add("raceClock");
        div = makeDiv(String(this.lapTarget).padStart(3, '0'));
        this.remainingDiv = div;
        fs.appendChild(div);
        remaining.appendChild(fs);
    }
    notify(v) {
        if (v.lapsCompleted > this.lapsCompleted) {
            this.lapsCompleted = v.lapsCompleted;
            this.elapsedDiv.textContent = String(this.lapsCompleted).padStart(3, '0');
            this.remainingDiv.textContent = this.lapTarget > 0 ? String(this.lapTarget - this.lapsCompleted).padStart(3, '0') : "---";
        }
    }
    update(millis) { }
    isExpired() {
        if (this.lapTarget == 0) {
            return false;
        }
        return this.lapsCompleted >= this.lapTarget;
    }
    calculatePace(v) {
        if (this.lapTarget <= 0) {
            return "-";
        }
        else {
            let finishTime = this.lapTarget * v.avgLap;
            return `${this.lapTarget}/${getClockString(finishTime)}`;
        }
    }
    vehicleIsFinished(vehicle) {
        if (this.lapTarget <= 0) {
            return false;
        }
        return (vehicle.lapsCompleted >= this.lapTarget);
    }
}
class Driver {
    name;
    spokenName;
    constructor(name, spokenName = null) {
        this.name = name;
        this.spokenName = spokenName;
    }
    getNameToSpeak() {
        return this.spokenName?.trim() || this.name;
    }
    static unknown() {
        return new Driver("Unknown Driver");
    }
}
var VehicleUpdateResult;
(function (VehicleUpdateResult) {
    VehicleUpdateResult[VehicleUpdateResult["Ignored"] = 0] = "Ignored";
    VehicleUpdateResult[VehicleUpdateResult["FalseDetection"] = 1] = "FalseDetection";
    VehicleUpdateResult[VehicleUpdateResult["ValidDetection"] = 2] = "ValidDetection";
})(VehicleUpdateResult || (VehicleUpdateResult = {}));
class RunningStat {
    numValues;
    oldMean;
    newMean;
    oldS;
    newS;
    constructor() {
        this.numValues = 0;
    }
    clear() {
        this.numValues = 0;
    }
    push(x) {
        this.numValues++;
        if (this.numValues === 1) {
            this.oldMean = this.newMean = x;
            this.oldS = 0.0;
        }
        else {
            this.newMean = this.oldMean + (x - this.oldMean) / this.numValues;
            this.newS = this.oldS + (x - this.oldMean) * (x - this.newMean);
            this.oldMean = this.newMean;
            this.oldS = this.newS;
        }
    }
    numDataValues() {
        return this.numValues;
    }
    mean() {
        return (this.numValues > 0) ? this.newMean : 0.0;
    }
    variance() {
        return ((this.numValues > 1) ? this.newS / (this.numValues - 1) : 0.0);
    }
    standardDeviation() {
        return Math.sqrt(this.variance());
    }
}
class Vehicle {
    isNew = true;
    isStaging = false;
    scoreBoardRow = null;
    progressBarDiv = null;
    progressTimeSpan = null;
    stats = new RunningStat();
    timeControl = null;
    id;
    vehicleNum = null;
    driver;
    alive = false;
    clockStart = null;
    clockStop = null;
    lastSeen = null;
    detectionCount = 0;
    positionValue = Number.MAX_SAFE_INTEGER;
    lapsCompleted = 0;
    time = null;
    lastLap = null;
    bestLap = null;
    worstLap = null;
    avgLap = null;
    stdDev = null;
    cv = null;
    pace = null;
    position = null;
    gap = null;
    interval = null;
    consistency = null;
    lapStartTime = null;
    lapTimes = [];
    constructor(id, driver = Driver.unknown()) {
        this.id = id;
        this.driver = driver;
    }
    getClockTime(millis) {
        if (!this.clockIsRunning()) {
            return 0;
        }
        if (this.clockStop != null) {
            return this.clockStop - this.clockStart;
        }
        else {
            return millis - this.clockStart;
        }
    }
    clockIsRunning() {
        return this.clockStart != null;
    }
    startClock(millis = 0) {
        this.clockStart = millis;
        this.lapStartTime = millis;
    }
    stopClock(millis) {
        this.clockStop = millis;
    }
    number(num) {
        if (num) {
            this.vehicleNum = num;
            this.updatePositionValue();
        }
        else {
            return this.vehicleNum;
        }
    }
    updatePositionValue() {
        this.positionValue = ((1023 - (this.lapsCompleted || 0)) * (2 ** 42)) + ((this.time || (2 ** 32) - 1) * (2 ** 10)) + this.vehicleNum;
    }
    recordDetection(millis) {
        if (!this.alive) {
            return VehicleUpdateResult.Ignored;
        }
        if (this.lastSeen && (millis - this.lastSeen) < AppSettings.minLapTimeMilliseconds) {
            this.lastSeen = millis;
            return VehicleUpdateResult.FalseDetection;
        }
        if (this.isStaging) {
            this.lastSeen == millis;
            return VehicleUpdateResult.ValidDetection;
        }
        this.detectionCount++;
        if (!this.clockIsRunning()) {
            this.startClock(millis);
            this.lastSeen = millis;
            return VehicleUpdateResult.ValidDetection;
        }
        if (!this.lastSeen) {
            this.lastSeen = millis;
            return VehicleUpdateResult.ValidDetection;
        }
        this.lastSeen = millis;
        this.lastLap = millis - this.lapStartTime;
        this.lapTimes.push(this.lastLap);
        this.stats.push(this.lastLap);
        this.lapsCompleted++;
        this.time += this.lastLap;
        this.lapStartTime = millis;
        this.updatePositionValue();
        this.bestLap = Math.min(this.lastLap, this.bestLap || Number.MAX_SAFE_INTEGER);
        this.worstLap = Math.max(this.lastLap, this.worstLap || -1);
        this.avgLap = this.stats.mean();
        this.stdDev = this.stats.standardDeviation();
        this.cv = this.stdDev / this.avgLap;
        this.pace = this.timeControl ? String(this.timeControl.calculatePace(this)) : null;
        this.timeControl?.notify(this);
        if (this.timeControl?.vehicleIsFinished(this)) {
            this.alive = false;
            this.stopClock(millis);
        }
        return VehicleUpdateResult.ValidDetection;
    }
}
class TrackSession {
    raceManager;
    ignoreUnregisteredTransponderIds;
    usePositionGraph;
    displayName;
    isStaging = false;
    constructor(raceManager) {
        this.raceManager = raceManager;
        this.ignoreUnregisteredTransponderIds = true;
        this.usePositionGraph = true;
    }
    initVehicles() {
        for (let v of this.raceManager.vehicles.values()) {
            v.timeControl = this.raceManager.timeControl;
            v.isNew = false;
            v.alive = true;
            v.isStaging = this.isStaging;
            v.clockStart = null;
            this.raceManager.updateScoreBoard(v);
        }
    }
    postInitVehicles() {
        for (let v of this.raceManager.vehicles.values()) {
            v.alive = false;
            this.raceManager.updateScoreBoard(v);
        }
    }
    announceDetection(v) { }
    announceStart() { }
    announceExpired() { }
    announceVehicleFinished(v) { }
    announceFinished() { }
    update(millis) { }
}
class PracticeSession extends TrackSession {
    constructor(raceManager) {
        super(raceManager);
    }
    announceDetection(v) {
        if (v.detectionCount == 1) {
            AudioController.speak(v.driver.getNameToSpeak());
        }
        else {
            speakLapTime(v.lastLap);
        }
    }
    announceExpired() {
        AudioController.speak('Practice session finished');
    }
}
class OpenPractice extends PracticeSession {
    static displayName = "Open Practice";
    static allowLapTimeControl = false;
    constructor(raceManager) {
        super(raceManager);
        this.ignoreUnregisteredTransponderIds = false;
        this.displayName = OpenPractice.displayName;
        this.usePositionGraph = false;
    }
    initVehicles() {
        super.initVehicles();
    }
    announceStart() {
        AudioController.speak('Track now open for practice');
    }
    update(millis) {
        for (let v of this.raceManager.vehicles.values()) {
            let last = v.lastSeen;
            if (last && ((millis - last) >= AppSettings.maxLapTimeMilliseconds)) {
                this.raceManager.removeVehicle(v);
            }
        }
    }
}
class RaceSession extends TrackSession {
    constructor(raceManager) {
        super(raceManager);
    }
    announceStart() {
        AudioController.playTone(AppSettings.startTone);
    }
    announceFinished() {
        AudioController.speak("Race is over", false, true);
    }
    announceVehicleFinished(v) {
        AudioController.speak(v.driver.getNameToSpeak() + " finished", false, true);
    }
    announceExpired() {
        AudioController.playTone(AppSettings.expirationTone);
    }
    announceDetection(v) {
        if (v.position === 0) {
            AudioController.playTone(AppSettings.leaderTone);
        }
        else {
            AudioController.playTone(AppSettings.lapTone);
        }
    }
    update(millis) {
        for (let v of this.raceManager.vehicles.values()) {
            let last = v.lastSeen;
            if (last && v.alive && ((millis - last) >= AppSettings.maxLapTimeMilliseconds)) {
                v.alive = false;
                v.stopClock(millis);
                this.raceManager.updateScoreBoard(v);
            }
        }
    }
}
class StagingSession extends RaceSession {
    static displayName = "Staging";
    static allowLapTimeControl = false;
    constructor(raceManager) {
        super(raceManager);
        this.displayName = StagingSession.displayName;
        this.isStaging = true;
        this.ignoreUnregisteredTransponderIds = false;
    }
    announceStart() {
        AudioController.speak("All drivers, check in", false, true);
    }
    announceFinished() {
    }
    announceExpired() {
    }
}
class StaggeredStartRace extends RaceSession {
    static displayName = "Race (Staggered Start)";
    static allowLapTimeControl = true;
    constructor(raceManager) {
        super(raceManager);
        this.displayName = StaggeredStartRace.displayName;
    }
    announceStart() {
        let i = 0;
        let vehicles = [...this.raceManager.vehicles.values()];
        vehicles.sort((a, b) => a.number() - b.number());
        for (let v of vehicles) {
            setTimeout(() => AudioController.speak(v.driver.getNameToSpeak(), true), i++ * 1500);
        }
    }
}
class GridStartRace extends RaceSession {
    static displayName = "Race (Grid Start)";
    static allowLapTimeControl = true;
    constructor(raceManager) {
        super(raceManager);
        this.displayName = GridStartRace.displayName;
    }
    initVehicles() {
        super.initVehicles();
        for (let v of this.raceManager.vehicles.values()) {
            v.startClock();
        }
    }
}
class TrackSessionBuilder {
    displayName;
    allowLapTimeControl;
    build;
    constructor(d, a, b) {
        this.displayName = d;
        this.allowLapTimeControl = a;
        this.build = b;
    }
}
class TimeControlBuilder {
    displayName;
    build;
    constructor(d, b) {
        this.displayName = d;
        this.build = b;
    }
}
class RaceManager {
    startPending = false;
    timeControl = null;
    vehicles = new Map();
    driverManager;
    running = false;
    startDate = null;
    localOffset = 0;
    trackSession;
    updateSessionInterval = null;
    startButton;
    scoreBoardTable;
    timeControlSelect;
    timeControlInput;
    elapsedTimeDiv;
    remainingTimeDiv;
    modeSelect;
    lapsBoardDiv;
    driversDialog;
    expired;
    positionGraph = null;
    dragSource = null;
    startDelay = 0;
    sessionModeBuilders = [
        new TrackSessionBuilder(OpenPractice.displayName, OpenPractice.allowLapTimeControl, (rm) => new OpenPractice(rm)),
        new TrackSessionBuilder(StagingSession.displayName, StagingSession.allowLapTimeControl, (rm) => new StagingSession(rm)),
        new TrackSessionBuilder(StaggeredStartRace.displayName, StaggeredStartRace.allowLapTimeControl, (rm) => new StaggeredStartRace(rm)),
        new TrackSessionBuilder(GridStartRace.displayName, GridStartRace.allowLapTimeControl, (rm) => new GridStartRace(rm))
    ];
    timeControlBuilders = [
        new TimeControlBuilder("Minutes", (l) => new LimitTimeControl(l)),
        new TimeControlBuilder("Laps", (l) => new LapTimeControl(l))
    ];
    leaderBoard = [];
    scoreBoardColumns = [];
    constructor(driverManager, startButton, modeSelect, timeControlSelect, timeControlInput, elapsedTimeDiv, remainingTimeDiv, scoreBoardTable, lapsBoardDiv, positionGraphDiv, addDriversButton, driversDialog, resetDriversButton, clearDriversButton, startDelaySelect) {
        modeSelect.classList.add("raceDisabled");
        timeControlSelect.classList.add("raceDisabled");
        timeControlInput.classList.add("raceDisabled");
        addDriversButton.classList.add("raceDisabled");
        resetDriversButton.classList.add("raceDisabled");
        clearDriversButton.classList.add("raceDisabled");
        startDelaySelect.classList.add("raceDisabled");
        this.driversDialog = driversDialog;
        new DialogAnimator(this.driversDialog);
        this.positionGraph = new PositionGraph(positionGraphDiv);
        this.driverManager = driverManager;
        this.trackSession = new OpenPractice(this);
        this.initStartButton(startButton);
        this.initDriverButtons(addDriversButton, resetDriversButton, clearDriversButton);
        this.timeControlSelect = timeControlSelect;
        this.timeControlInput = timeControlInput;
        this.elapsedTimeDiv = elapsedTimeDiv;
        this.remainingTimeDiv = remainingTimeDiv;
        this.initTimeControls();
        this.modeSelect = modeSelect;
        this.initModes();
        this.scoreBoardTable = scoreBoardTable;
        this.readScoreBoardColumns();
        this.lapsBoardDiv = lapsBoardDiv;
        this.startDelay = Number(startDelaySelect.selectedOptions[0].value);
        startDelaySelect.addEventListener("change", () => {
            this.startDelay = Number(startDelaySelect.selectedOptions[0].value);
            console.log(`Start Delay changed to ${this.startDelay} seconds`);
        });
        this.sessionModeChanged();
    }
    initDriverButtons(addDriversButton, resetDriversButton, clearDriversButton) {
        addDriversButton.addEventListener("click", () => this.registerDrivers());
        clearDriversButton.addEventListener("click", () => this.clearVehicles());
        resetDriversButton.addEventListener("click", () => this.resetVehicles());
    }
    registerDrivers() {
        let table = this.driversDialog.querySelector("table");
        empty(table.tBodies[0]);
        let allDrivers = this.driverManager.getDrivers();
        for (let d of allDrivers) {
            let row = makeTr();
            row.appendChild(makeTd(d.i));
            row.appendChild(makeTd(d.n));
            row.appendChild(makeTd(d.t));
            let check = makeElement("input");
            check.setAttribute("type", "checkbox");
            check.style.pointerEvents = "none";
            row.append(makeTd(check));
            table.tBodies[0].appendChild(row);
            row.addEventListener("click", () => {
                if (row.classList.contains("registeredDriverRow")) {
                    row.classList.remove("registeredDriverRow");
                    check.checked = false;
                    let v = this.vehicles.get(Number(d.i));
                    if (v) {
                        this.removeVehicle(v);
                    }
                }
                else {
                    row.classList.add("registeredDriverRow");
                    check.checked = true;
                    this.addVehicle(Number(d.i), new Driver(d.n, d.s));
                }
            });
            if (this.vehicles.has(Number(d.i))) {
                row.classList.add("registeredDriverRow");
                check.checked = true;
            }
        }
        this.driversDialog.showModal();
    }
    clearVehicles() {
        if (this.running) {
            console.log("Cannot clear vehicles while session is running");
            return;
        }
        for (let v of this.vehicles.values()) {
            this.removeVehicle(v);
        }
        this.vehicles.clear();
        this.updateSession();
    }
    resetVehicles() {
        if (this.running) {
            console.log("Cannot reset vehicles while session is running");
            return;
        }
        let list = [...this.vehicles.values()];
        for (let v of list) {
            this.removeVehicle(v);
        }
        list.sort((a, b) => a.number() - b.number());
        for (let v of list) {
            let newV = this.addVehicle(v.id);
        }
    }
    readScoreBoardColumns() {
        let columns = this.scoreBoardTable.tHead.rows[0].children;
        for (let col of columns) {
            let colid = col.getAttribute("col-id");
            this.scoreBoardColumns.push(colid);
        }
    }
    initStartButton(button) {
        this.startButton = button;
        button.addEventListener("click", this.toggleRace.bind(this));
    }
    initModes() {
        for (let i = 0; i < this.sessionModeBuilders.length; i++) {
            let opt = makeOpt();
            opt.value = String(i);
            opt.textContent = String(this.sessionModeBuilders[i].displayName);
            this.modeSelect.appendChild(opt);
        }
        this.modeSelect.addEventListener("change", this.sessionModeChanged.bind(this));
    }
    initTimeControls() {
        for (let i = 0; i < this.timeControlBuilders.length; i++) {
            let opt = makeOpt();
            opt.value = String(i);
            opt.textContent = String(this.timeControlBuilders[i].displayName);
            this.timeControlSelect.appendChild(opt);
        }
        this.timeControlSelect.selectedIndex = 0;
        this.timeControlChanged();
        this.timeControlSelect.addEventListener("change", this.timeControlChanged.bind(this));
        this.timeControlInput.addEventListener("input", this.timeControlChanged.bind(this));
    }
    setTimeControl(timeControl) {
        this.timeControl = timeControl;
        this.timeControlInput.min = String(this.timeControl.min);
        this.timeControlInput.max = String(this.timeControl.max);
        this.timeControl.init(this.elapsedTimeDiv, this.remainingTimeDiv);
    }
    sessionModeChanged() {
        let builder = this.getSelectedSessionModeBuilder();
        console.log("Mode Changed to " + builder.displayName);
        if (!builder.allowLapTimeControl) {
            if (this.timeControlSelect.selectedIndex != 0) {
                this.timeControlSelect.selectedIndex = 0;
                this.timeControlChanged();
            }
        }
        this.timeControlSelect.disabled = !builder.allowLapTimeControl;
    }
    timeControlChanged() {
        this.timeControlInput.value = String(Math.min(Number(this.timeControlInput.value), Number(this.timeControlInput.max)));
        this.timeControlInput.value = String(Math.max(Number(this.timeControlInput.value), Number(this.timeControlInput.min)));
        let val = Number(this.timeControlInput.value);
        let i = this.timeControlSelect.selectedIndex;
        this.setTimeControl(this.timeControlBuilders[i].build(val));
        console.log("Time Control changed to : " + val + " " + this.timeControlBuilders[i].displayName);
    }
    getSelectedSessionModeBuilder() {
        return this.sessionModeBuilders[this.modeSelect.selectedIndex];
    }
    setSessionMode() {
        let builder = this.getSelectedSessionModeBuilder();
        this.trackSession = builder.build(this);
        console.log("Session Mode set to " + this.trackSession.displayName);
    }
    getLocalMillis() {
        return Date.now() - this.startDate.getTime();
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async delayStart() {
        if (this.startDelay > 0) {
            if (this.startDelay > 10) {
                AudioController.speak(`${this.startDelay} seconds to the start of the race`, true, true);
            }
            for (let i = this.startDelay; i > 0; i--) {
                if (!this.startPending) {
                    return;
                }
                let d = 1000;
                if (i < this.startDelay && i % 10 == 0 && i > 10) {
                    AudioController.speak(`${i} seconds`);
                }
                else if (i <= 10 && i > 5) {
                    AudioController.speak(String(i));
                }
                else if (i == 5) {
                    AudioController.speak("Less than 5");
                }
                if (i <= 5) {
                    d = Math.random() * 1001;
                    console.log(d);
                }
                await this.sleep(d);
            }
        }
    }
    async startRace() {
        document.querySelectorAll(".raceDisabled").forEach((e) => e.disabled = true);
        document.querySelectorAll('.scoreBoard [draggable="true"]').forEach((e) => e.setAttribute('draggable', 'false'));
        this.setSessionMode();
        this.leaderBoard = [];
        this.resetSideBoard();
        this.resetVehicles();
        this.trackSession.initVehicles();
        this.localOffset = 0;
        this.positionGraph.clear();
        this.timeControl.reset(0);
        this.startPending = true;
        await this.delayStart();
        if (!this.startPending) {
            return;
        }
        initDetector();
        this.startDate = new Date();
        this.trackSession.announceStart();
        this.running = true;
        this.expired = false;
        this.updateSession();
        let obj = this;
        this.updateSessionInterval = setInterval(() => {
            obj.updateSession();
        }, 1000);
        console.log("Session Started");
    }
    stopRace() {
        this.startPending = false;
        clearInterval(this.updateSessionInterval);
        this.trackSession.postInitVehicles();
        if (!this.expired) {
            this.trackSession.announceExpired();
        }
        this.running = false;
        this.expired = true;
        document.querySelectorAll(".raceDisabled").forEach((e) => e.disabled = false);
        document.querySelectorAll('.scoreBoard [draggable="false"]').forEach((e) => e.setAttribute('draggable', 'true'));
        console.log("Session Stopped");
        this.startButton.textContent = "Start";
    }
    allVehiclesFinished() {
        for (let v of this.vehicles.values()) {
            if (v.alive) {
                return false;
            }
        }
        return true;
    }
    toggleRace(e) {
        if (this.running || this.startPending) {
            this.stopRace();
            this.startButton.textContent = "Start";
        }
        else if (!this.startPending) {
            this.startButton.textContent = "Stop";
            this.startRace();
        }
    }
    removeVehicle(v) {
        v.alive = false;
        this.vehicles.delete(v.id);
        this.removeVehicleFromScoreBoard(v);
        this.removeVehicleFromLeaderBoard(v);
        this.removeVehicleFromSideBoard(v);
    }
    removeVehicleFromLeaderBoard(v) {
        let idx = this.leaderBoard.findIndex((e) => e.id == v.id);
        if (idx >= 0) {
            this.leaderBoard.splice(idx, 1);
            this.updateLeaderBoard();
        }
    }
    removeVehicleFromScoreBoard(v) {
        v.scoreBoardRow?.remove();
    }
    addVehicle(id, driver = Driver.unknown()) {
        if (this.vehicles.has(id)) {
            console.log('Driver with transponder ID ' + id + " already exists");
            return null;
        }
        else {
            let vehicle = new Vehicle(id, this.driverManager.lookupDriver(id));
            vehicle.timeControl = this.timeControl;
            vehicle.number(this.getNextVehicleNumber());
            this.vehicles.set(id, vehicle);
            this.updateScoreBoard(vehicle);
            return vehicle;
        }
    }
    createVehicleRow(v) {
        let tr = makeTr();
        tr.setAttribute("draggable", "true");
        tr.addEventListener("dragenter", (e) => this.vehicleTableRowDragEnter(e));
        tr.addEventListener("dragstart", (e) => this.vehicleTableRowDragStart(e));
        tr.addEventListener("dragover", (e) => this.vehicleTableRowDragOver(e));
        for (let colid of this.scoreBoardColumns) {
            let td = makeTd();
            switch (colid) {
                case "num":
                    {
                        let div = makeDiv(String(v.number()));
                        div.className = "vehicleNumber";
                        td.appendChild(div);
                    }
                    break;
                case "id":
                    td.textContent = String(v.id);
                    break;
                case "drv":
                    {
                        let nameDiv = makeDiv(v.driver.name);
                        nameDiv.className = "vehicleDriverName";
                        td.appendChild(nameDiv);
                        let containerDiv = makeDiv();
                        containerDiv.className = "vehicleProgressBarContainer";
                        let bar = makeDiv();
                        bar.className = "vehicleProgressBar";
                        bar.style.width = "0px";
                        v.progressBarDiv = bar;
                        containerDiv.appendChild(bar);
                        let lowerDiv = makeDiv();
                        lowerDiv.className = "vehicleLowerInfo";
                        let currentLap = makeSpan("0:00");
                        currentLap.className = "currentLapTime";
                        v.progressTimeSpan = currentLap;
                        lowerDiv.appendChild(containerDiv);
                        lowerDiv.appendChild(currentLap);
                        td.appendChild(lowerDiv);
                    }
                    break;
            }
            tr.appendChild(td);
        }
        this.scoreBoardTable.tBodies[0].appendChild(tr);
        return tr;
    }
    isbefore(a, b) {
        if (a.parentNode == b.parentNode) {
            for (let cur = a; cur; cur = cur.previousSibling) {
                if (cur === b) {
                    return true;
                }
            }
        }
        return false;
    }
    vehicleTableRowDragOver(e) {
        e.preventDefault();
    }
    vehicleTableRowDragStart(e) {
        this.dragSource = e.target;
        e.dataTransfer.effectAllowed = 'move';
    }
    vehicleTableRowDragEnter(e) {
        e.preventDefault();
        let targetelem = e.target;
        if (targetelem.nodeName == "TD") {
            targetelem = targetelem.parentNode;
        }
        try {
            if (this.isbefore(this.dragSource, targetelem)) {
                targetelem.parentNode.insertBefore(this.dragSource, targetelem);
            }
            else {
                targetelem.parentNode.insertBefore(this.dragSource, targetelem.nextSibling);
            }
        }
        catch {
        }
        for (let v of this.vehicles.values()) {
            let row = v.scoreBoardRow;
            v.number(row.rowIndex);
            row.cells[this.scoreBoardColumns.indexOf("num")].children[0].textContent = String(row.rowIndex);
        }
    }
    updateSession() {
        let currentTime = this.getLocalMillis();
        this.timeControl.update(currentTime);
        this.trackSession.update(currentTime);
        if ((this.expired == false) && this.timeControl.isExpired(currentTime)) {
            this.expired = true;
            this.trackSession.announceExpired();
        }
        for (let v of this.vehicles.values()) {
            let cells = v.scoreBoardRow.cells;
            cells[this.scoreBoardColumns.indexOf("clk")].textContent = getClockString(v.getClockTime(currentTime));
            let progressBar = v.progressBarDiv;
            let currentLapTimeSpan = v.progressTimeSpan;
            if (!v.clockIsRunning()) {
                progressBar.style.width = "0px";
                continue;
            }
            let inProgressLapTime = currentTime + this.localOffset;
            if (v.lapStartTime) {
                inProgressLapTime = currentTime - v.lapStartTime;
            }
            currentLapTimeSpan.textContent = getClockString(inProgressLapTime);
            if (!v.avgLap) {
                progressBar.style.width = "0px";
                continue;
            }
            let percent = Math.floor((inProgressLapTime / v.avgLap) * 100);
            progressBar.classList.remove("percent75", "percent100");
            if (percent >= 100) {
                progressBar.classList.add("percent100");
            }
            else if (percent >= 75) {
                progressBar.classList.add("percent75");
            }
            progressBar.style.width = Math.min(100, percent) + "%";
        }
    }
    updateLeaderBoard(v = null) {
        if (v) {
            let idx = this.leaderBoard.findIndex((e) => e.id == v.id);
            if (idx >= 0) {
                this.leaderBoard.splice(idx, 1);
            }
            for (idx = 0; idx < this.leaderBoard.length; idx++) {
                if (this.leaderBoard[idx].positionValue > v.positionValue) {
                    break;
                }
                if (this.leaderBoard[idx].positionValue == v.positionValue) {
                    if (this.leaderBoard[idx].number() > v.number()) {
                        break;
                    }
                }
            }
            this.leaderBoard.splice(idx, 0, v);
        }
        if (this.leaderBoard.length == 0) {
            return;
        }
        let leaderTime = this.leaderBoard[0].time;
        let leaderLap = this.leaderBoard[0].lapsCompleted;
        let prevTime = leaderTime;
        let prevLap = leaderLap;
        for (let i = 0; i < this.leaderBoard.length; i++) {
            let current = this.leaderBoard[i];
            current.position = i;
            if (!current.time) {
                continue;
            }
            if (current.lapsCompleted == leaderLap) {
                let diff = current.time - leaderTime;
                current.gap = diff > 0 ? getClockString(diff, true) : "--";
            }
            else {
                current.gap = `${leaderLap - current.lapsCompleted} laps`;
            }
            if (current.lapsCompleted == prevLap) {
                let diff = current.time - prevTime;
                current.interval = diff > 0 ? getClockString(diff, true) : "--";
            }
            else {
                current.interval = `${prevLap - current.lapsCompleted} laps`;
            }
            prevLap = current.lapsCompleted;
            prevTime = current.time;
        }
        this.updateLeaderBoardColumns();
        if (this.trackSession.usePositionGraph && v) {
            this.positionGraph.recordLapPosition(v);
        }
    }
    updateLeaderBoardColumns() {
        for (let v of this.vehicles.values()) {
            let row = v.scoreBoardRow;
            row.cells[this.scoreBoardColumns.indexOf("pos")].textContent = String(v.position + 1);
            row.cells[this.scoreBoardColumns.indexOf("gap")].textContent = v.gap;
            row.cells[this.scoreBoardColumns.indexOf("int")].textContent = v.interval;
            if (row.rowIndex > v.position + 1) {
                this.scoreBoardTable.rows[v.position + 1].before(row);
            }
            else if (row.rowIndex < v.position + 1) {
                try {
                    this.scoreBoardTable.rows[v.position + 1].after(row);
                }
                catch (error) {
                    console.error(error);
                    console.log("Attempted position: " + v.position);
                }
            }
        }
    }
    updateScoreBoard(v, result = VehicleUpdateResult.ValidDetection) {
        if (!v.scoreBoardRow) {
            v.scoreBoardRow = this.createVehicleRow(v);
        }
        let row = v.scoreBoardRow;
        let blinkClass = null;
        if (v.isNew) {
            blinkClass = "vehicleUpdateNew";
        }
        else {
            switch (result) {
                case VehicleUpdateResult.Ignored:
                    return;
                    break;
                case VehicleUpdateResult.FalseDetection:
                    blinkClass = "vehicleUpdateFalseDetection";
                    break;
                case VehicleUpdateResult.ValidDetection:
                    blinkClass = "vehicleUpdateLapCompleted";
                    break;
                default:
                    console.log(`Unhandled Vehicle.UpdateResult: ${result}`);
                    break;
            }
        }
        row.classList.add(blinkClass);
        setTimeout(() => row.classList.remove(blinkClass), 200);
        if (result == VehicleUpdateResult.FalseDetection) {
            return;
        }
        if (result == VehicleUpdateResult.ValidDetection) {
            v.progressBarDiv.style.width = "0px";
        }
        if (!v.isNew && v.alive === false) {
            row.classList.add("vehicleFinished");
        }
        else {
            row.classList.remove("vehicleFinished");
            if (v.clockIsRunning()) {
                row.classList.remove("vehicleNotStarted");
            }
            else {
                row.classList.add("vehicleNotStarted");
            }
        }
        row.cells[this.scoreBoardColumns.indexOf("lps")].textContent = String(v.lapsCompleted);
        row.cells[this.scoreBoardColumns.indexOf("tim")].textContent = v.time ? getClockString(v.time, true) : "";
        row.cells[this.scoreBoardColumns.indexOf("pce")].textContent = v.pace;
        row.cells[this.scoreBoardColumns.indexOf("lst")].textContent = v.lastLap ? (v.lastLap / 1000).toFixed(AppSettings.displayDecimalPlaces) : "";
        row.cells[this.scoreBoardColumns.indexOf("avg")].textContent = v.avgLap ? (v.avgLap / 1000).toFixed(AppSettings.displayDecimalPlaces) : "";
        row.cells[this.scoreBoardColumns.indexOf("fst")].textContent = v.bestLap ? (v.bestLap / 1000).toFixed(AppSettings.displayDecimalPlaces) : "";
        this.updateLeaderBoard(v);
        this.updateSideBoard(v);
    }
    removeVehicleFromSideBoard(v) {
        this.lapsBoardDiv.querySelector(`div[carNumber="${v.number()}"]`)?.remove();
        if (this.lapsBoardDiv.querySelectorAll('.carNumberColumn').length == 0) {
            this.lapsBoardDiv.querySelector("div .lapNumberColumn")?.remove();
        }
    }
    resetSideBoard() {
        this.positionGraph.clear();
        this.positionGraph.draw();
        empty(this.lapsBoardDiv);
    }
    updateSideBoard(v) {
        if (this.trackSession.usePositionGraph) {
            this.positionGraph.draw();
        }
        let firstCol = this.lapsBoardDiv.querySelector("div .lapNumberColumn");
        if (!firstCol) {
            firstCol = makeDiv();
            firstCol.classList.add('lapNumberColumn');
            let spacer = makeDiv('0');
            spacer.className = "vehicleNumber";
            spacer.style.visibility = "hidden";
            firstCol.appendChild(spacer);
            this.lapsBoardDiv.appendChild(firstCol);
        }
        for (let i = firstCol.children.length - 1; i < v.lapsCompleted; i++) {
            firstCol.appendChild(makeDiv(String(i + 1)));
        }
        let myCol = this.lapsBoardDiv.querySelector(`div[carNumber="${v.number()}"].carNumberColumn`);
        if (!myCol) {
            myCol = makeDiv();
            myCol.classList.add('carNumberColumn');
            myCol.setAttribute('carNumber', String(v.number()));
            let numberDiv = makeDiv(String(v.number()));
            numberDiv.classList.add("vehicleNumber", "tooltip");
            let tooltip = makeDiv(v.driver.name);
            tooltip.className = "tooltiptext";
            numberDiv.appendChild(tooltip);
            myCol.appendChild(numberDiv);
            let added = false;
            let columns = this.lapsBoardDiv.querySelectorAll(':scope > div');
            for (let col of columns) {
                if (Number(col.getAttribute('carNumber')) > v.number()) {
                    col.before(myCol);
                    added = true;
                    break;
                }
            }
            if (!added) {
                this.lapsBoardDiv.appendChild(myCol);
            }
        }
        if (v.lapsCompleted > 0 && myCol.children.length < v.lapsCompleted + 1) {
            let lapDiv = makeDiv((v.lastLap / 1000).toFixed(AppSettings.displayDecimalPlaces));
            if (v.lastLap == v.bestLap) {
                myCol.querySelector(".bestLap")?.classList.remove("bestLap");
                lapDiv.classList.add("bestLap");
            }
            myCol.appendChild(lapDiv);
        }
    }
    getNextVehicleNumber() {
        for (let i = 1; i < 9999; i++) {
            let numInUse = false;
            for (let v of this.vehicles.values()) {
                if (v.number() === i) {
                    numInUse = true;
                    break;
                }
            }
            if (!numInUse) {
                return i;
            }
        }
        return 0;
    }
    detectVehicleNumber(num) {
        let v = [...this.vehicles.values()].find((v) => v.number() == num);
        if (v) {
            this.recordDetection(v.id, Date.now() - this.startDate.getTime());
        }
    }
    recordDetection(id, millis) {
        if (this.running === false)
            return;
        this.localOffset = (Date.now() - this.startDate.getTime()) - millis;
        let vehicle = null;
        if (this.vehicles.has(id)) {
            vehicle = this.vehicles.get(id);
        }
        else {
            if (!this.trackSession.ignoreUnregisteredTransponderIds) {
                vehicle = this.addVehicle(id);
                vehicle.isNew = false;
                vehicle.alive = true;
                vehicle.isStaging = this.trackSession.isStaging;
            }
            else {
                console.log("Ignored unregistered transponder id");
                return;
            }
        }
        let result = vehicle.recordDetection(millis);
        if (result == VehicleUpdateResult.Ignored) {
            return;
        }
        this.updateScoreBoard(vehicle, result);
        if (result == VehicleUpdateResult.ValidDetection) {
            this.trackSession.announceDetection(vehicle);
            if (!vehicle.alive) {
                this.trackSession.announceVehicleFinished(vehicle);
            }
        }
        if (this.allVehiclesFinished()) {
            this.updateSession();
            this.trackSession.announceFinished();
            this.stopRace();
        }
        else if (!this.expired && this.timeControl.isExpired(millis)) {
            this.expired = true;
            this.trackSession.announceExpired();
        }
    }
}
class ConnectionController {
    detectorConnection = null;
    connectionDialog;
    settingsDialog;
    hostName;
    connStatusSpan;
    constructor(configureButton, connectionDialog, settingsDialog, addressInput, statusSpan) {
        this.connStatusSpan = statusSpan;
        this.connectionDialog = connectionDialog;
        this.settingsDialog = settingsDialog;
        configureButton.addEventListener("click", () => {
            if (this.detectorConnection instanceof WebSocketDetectorConnection) {
                let json = JSON.stringify({ command: "getNetworkSettings" });
                this.detectorConnection.send(json);
                this.settingsDialog.showModal();
            }
            else {
                AlertDialog.show("Using simulated detector.  Nothing to configure.");
            }
        });
        let connDialogOkButton = this.connectionDialog.querySelector(".okbutton");
        connDialogOkButton.addEventListener("click", () => {
            let address = addressInput.value.toUpperCase().trim();
            console.log(`Connection address changed to ${address}`);
            if (address == "SIM") {
                console.log("Changed to simulated detector");
            }
            else {
                console.log(`Detector address changed to ${address}`);
            }
            this.hostName = address;
            this.initDetectorConnection(this.hostName);
        });
        let settingsDialogOkButton = this.settingsDialog.querySelector(".okbutton");
        settingsDialogOkButton.addEventListener("click", () => {
            if (this.detectorConnection instanceof WebSocketDetectorConnection) {
                let ssidInput = this.settingsDialog.querySelector(".ssidInput");
                let passwordInput = this.settingsDialog.querySelector(".passwordInput");
                let json = JSON.stringify({
                    command: "setNetworkSettings",
                    ssid: ssidInput.value,
                    password: passwordInput.value
                });
                console.log(json);
                this.detectorConnection.send(json);
            }
            else {
                console.log("Cannot set detector network settings on simulated connection");
            }
        });
        new DialogAnimator(connectionDialog);
        new DialogAnimator(settingsDialog);
    }
    showConnectionDialog() {
        this.connectionDialog.showModal();
    }
    connection() {
        return this.detectorConnection;
    }
    initDetectorConnection(hostName) {
        if (!hostName || hostName.trim() == '') {
            hostName = "SIM";
        }
        this.hostName = hostName.trim().toUpperCase();
        if (this.detectorConnection) {
            this.detectorConnection.disconnect();
            this.onDetectorClose();
            this.detectorConnection.onConnected = null;
            this.detectorConnection.onDisconnected = null;
            this.detectorConnection.onMessage = null;
        }
        if (hostName == 'SIM') {
            console.log('Using simulated detector connection.');
            this.detectorConnection = new SimulatedConnection();
        }
        else {
            console.log(`Connecting to detector at %{hostName}`);
            this.detectorConnection = new WebSocketDetectorConnection(`ws://${hostName}/ws`);
        }
        this.detectorConnection.onConnected = () => this.onDetectorOpen();
        this.detectorConnection.onDisconnected = () => this.onDetectorClose();
        this.detectorConnection.onMessage = (msg) => this.onDetectorMessage(msg);
        console.log('Connecting to detector');
        this.detectorConnection.connect();
    }
    onDetectorMessage(msg) {
        if (msg.at(0) == '{') {
            let response = JSON.parse(msg);
            console.log(response);
            if (response.hasOwnProperty("inResponseTo")) {
                switch (response.inResponseTo) {
                    case "getNetworkSettings":
                        let ssidInput = this.settingsDialog.querySelector(".ssidInput");
                        let passwordInput = this.settingsDialog.querySelector(".passwordInput");
                        ssidInput.value = response.ssid;
                        passwordInput.value = response.password;
                        break;
                    case "setNetworkSettings":
                        AlertDialog.show("Detector Settings Saved.  Please restart the detector to apply changes.");
                        break;
                }
            }
            return;
        }
        if (msg.at(0) != '%' || msg.at(msg.length - 1) != '&') {
            return;
        }
        switch (msg.at(1)) {
            case 'L':
                let cma = msg.indexOf(',');
                let end = cma > 0 ? cma : 4;
                let id = parseInt(msg.slice(2, end), 16);
                let millis = parseInt(msg.slice(cma > 0 ? end + 1 : end, msg.length - 1), 16);
                byId('lastDetectionId').textContent = `${id} @${new Date().toLocaleTimeString([], { hour12: false })}`;
                raceManager.recordDetection(id, millis);
                break;
            default:
                break;
        }
    }
    onDetectorOpen() {
        console.log('Connection opened');
        this.connStatusSpan.textContent = this.hostName == 'SIM' ? 'Simulated' : 'Connected';
        this.connStatusSpan.classList.add('connected');
        this.connStatusSpan.classList.remove('disconnected');
    }
    onDetectorClose() {
        console.log('Connection closed');
        this.connStatusSpan.textContent = 'Disconnected';
        this.connStatusSpan.classList.add('disconnected');
        this.connStatusSpan.classList.remove('connected');
    }
}
class DetectorConnection {
    isConnected;
    onMessage;
    onConnected;
    onDisconnected;
    constructor() {
        this.isConnected = false;
        this.onMessage = null;
        this.onConnected = null;
        this.onDisconnected = null;
    }
    send(msg) { }
    connect() { }
    disconnect() { }
    notifyOnConnected() {
        if (this.onConnected) {
            this.onConnected();
        }
    }
    notifyOnDisconnected() {
        if (this.onDisconnected) {
            this.onDisconnected();
        }
    }
    notifyOnMessage(msg) {
        if (this.onMessage) {
            this.onMessage(msg);
        }
    }
}
class SimulatedConnection extends DetectorConnection {
    simRunning = false;
    simStartTime = 0;
    simDrivers = [];
    constructor() {
        super();
    }
    beginSim() {
        this.endSim();
        this.simRunning = true;
        for (let i = 0; i < 10; i++) {
            this.simDrivers.push(setTimeout((idx) => this.simulateDetection(idx), 1000 + Math.random() * 3001, i));
        }
    }
    endSim() {
        this.simRunning = false;
        for (let d of this.simDrivers) {
            clearTimeout(d);
        }
        this.simDrivers = [];
    }
    simulateDetection(transponderId) {
        if (!this.simRunning) {
            return;
        }
        let msg = `%L${transponderId.toString(16)},${(Date.now() - this.simStartTime).toString(16)}&`;
        this.notifyOnMessage(msg);
        this.simDrivers[transponderId] = setTimeout((idx) => this.simulateDetection(idx), 15000 + Math.random() * 5001, transponderId);
    }
    send(msg) {
        switch (msg) {
            case "%I&":
                this.simStartTime = Date.now();
                break;
            case "%F&":
                break;
            case "%B&":
                this.beginSim();
                break;
            case "%E&":
                this.endSim();
                break;
        }
    }
    connect() {
        this.isConnected = true;
        this.notifyOnConnected();
    }
    disconnect() {
        this.isConnected = false;
        this.notifyOnDisconnected();
    }
}
class WebSocketDetectorConnection extends DetectorConnection {
    ws = null;
    url;
    constructor(url) {
        super();
        this.ws = null;
        this.url = url;
    }
    connect() {
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onclose = null;
            this.ws.onmessage = null;
            this.ws.close();
        }
        this.ws = new WebSocket(this.url);
        this.ws.onopen = this.onWsOpen.bind(this);
        this.ws.onclose = this.onWsClose.bind(this);
        this.ws.onmessage = this.onWsReceive.bind(this);
    }
    disconnect() {
        if (this.ws && this.isConnected) {
            this.ws.close();
            this.isConnected = false;
        }
    }
    onWsOpen(e) {
        this.isConnected = true;
        this.notifyOnConnected();
    }
    onWsClose(e) {
        this.isConnected = false;
        this.notifyOnDisconnected();
    }
    send(msg) {
        if (this.isConnected) {
            this.ws.send(msg);
        }
    }
    onWsReceive(e) {
        if (e.type == "message") {
            this.notifyOnMessage(e.data);
        }
    }
}
class AlertDialog {
    static dialog;
    static init(d) {
        this.dialog = d;
        d.addEventListener("close", () => {
            empty(this.getMessageDiv());
        });
        new DialogAnimator(d);
    }
    static show(msg = null) {
        let msgDiv = this.getMessageDiv();
        if (msg) {
            empty(msgDiv);
            msgDiv.textContent = msg;
        }
        this.dialog.showModal();
    }
    static getMessageDiv() {
        return this.dialog.querySelector(".alertMessageDiv");
    }
}
window.speechSynthesis.onvoiceschanged = (e) => {
    AppSettings.initSpeechVoices(byId('voiceSelect'));
};
window.onbeforeunload = (e) => {
    e.preventDefault();
    e.returnValue = "Are you sure you want to leave?  Active race will be lost!";
};
window.onkeydown = (e) => {
    if (e.repeat) {
        return;
    }
    if (!raceManager.running) {
        return;
    }
    if (byId("sessionPage").style.display == "none") {
        return;
    }
    if (e.key in ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]) {
        e.preventDefault();
        raceManager.detectVehicleNumber(e.key == "0" ? 10 : Number(e.key));
    }
};
window.onload = () => {
    new HorizontalResizer(byId("driverBoard"), byId("infoBoard"), byId("raceSplitter"));
    let buttons = document.querySelectorAll(".tabsHeader > button:nth-child(1)");
    for (let b of buttons) {
        b.click();
    }
    driverManager.loadDrivers();
    AlertDialog.init(byId("alertDialog"));
    AppSettings.initMinLapTime(byId('minLapTimeInput'));
    AppSettings.initMaxLapTime(byId('maxLapTimeInput'));
    AppSettings.initDecimalPlaces(byId('displayDecimalPlacesSelect'));
    AppSettings.initSpeechSliders(byId('speechRateRange'), byId('speechPitchRange'), byId('speechVolumeRange'));
    AppSettings.initStartTone(byId('startTonePitchRange'), byId('startToneDurationRange'), byId('startToneVolumeRange'), byId('startToneFadeNone'), byId('startToneFadeLin'));
    AppSettings.initExpirationTone(byId('endTonePitchRange'), byId('endToneDurationRange'), byId('endToneVolumeRange'), byId('endToneFadeNone'), byId('endToneFadeLin'));
    AppSettings.initLapTone(byId('lapTonePitchRange'), byId('lapToneDurationRange'), byId('lapToneVolumeRange'), byId('lapToneFadeNone'), byId('lapToneFadeLin'));
    AppSettings.initLeaderTone(byId('leaderTonePitchRange'), byId('leaderToneDurationRange'), byId('leaderToneVolumeRange'), byId('leaderToneFadeNone'), byId('leaderToneFadeLin'));
    if (window.location.hostname != '') {
        connectionController.initDetectorConnection(window.location.hostname);
    }
    else {
        connectionController.showConnectionDialog();
    }
};
let connectionController = new ConnectionController(byId("configureConnectionButton"), byId("connectionDialog"), byId("detectorSettingsDialog"), byId("detectorAddressInput"), byId("connStatusSpan"));
let driverManager = new DriverManager(byId('driverNameInput'), byId('driverSpokenNameInput'), byId('driverTestSpeechButton'), byId('driverTransponderIdInput'), byId('driverNoteInput'), byId('addDriverButton'), byId('driversTable'), byId('importDriversButton'), byId('exportDriversButton'));
let raceManager = new RaceManager(driverManager, byId('startButton'), byId('modeSelect'), byId('timeControlSelect'), byId('timeControlInput'), byId('elapsedTimeDiv'), byId('remainingTimeDiv'), byId('scoreBoardTable'), byId('lapsBoardDiv'), byId("positionGraphDiv"), byId("addDriversButton"), byId("registerDriversDialog"), byId("resetDriversButton"), byId("clearDriversButton"), byId("startDelaySelect"));
function initDetector() {
    connectionController.connection().send('%I&');
}
function beginSim(e) {
    connectionController.connection().send('%B&');
}
function endSim(e) {
    connectionController.connection().send('%E&');
}
//# sourceMappingURL=openlap.js.map