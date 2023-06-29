class DialogAnimator {
    d: HTMLDialogElement;
    clickHandler: any;

    constructor(dialog: HTMLDialogElement) {
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

    closeDialog(e: Event) {
        this.d.classList.remove("hiding");
        this.d.close();
        this.d.removeEventListener("animationend", this.clickHandler);
    }
}

class HorizontalResizer {
    leftPane: HTMLDivElement;
    rightPane: HTMLDivElement;
    gutter: HTMLDivElement;
    prevX: number;
    leftRect: DOMRect;
    boundmousemove: any;
    boundmouseup: any;

    constructor(leftPane: HTMLDivElement, rightPane: HTMLDivElement, gutter: HTMLDivElement) {
        this.leftPane = leftPane;
        this.rightPane = rightPane;
        this.gutter = gutter;
        gutter.addEventListener('mousedown', this.resize.bind(this));
    }

    private resize(e: MouseEvent) {
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

    private mousemove(e: MouseEvent) {
        let newX = this.prevX - e.x;
        this.leftPane.style.width = this.leftRect.width - newX + "px";
    }

    private mouseup() {
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
    private svg: SVGElement;
    private data: VehiclePositionRecord[] = [];
    private numLaps: number = 0;
    private gridColor: string = "#bbb";
    private gridStrokeWidth: number = 1;
    private vehicleStrokeWidth: number = 3;
    private dotStrokeWidth: number = 3;
    private dotFill: string = "#fff";
    private dotRadius: number = 4;
    private xGridSize: number;
    private yGridSize: number;
    private xOffset: number = 30;
    private yOffset: number = 30;
    private svgWidth: number = 0;
    private svgHeight: number = 0;
    private positionColors: string[] = [
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

    constructor(div: HTMLDivElement) {
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

    public clear() {
        this.data = [];
        this.numLaps = 0;
    }

    public recordLapPosition(v: Vehicle) {
        let record = this.data.find((r) => r.vehicle.number() == v.number());
        if (!record) {
            record = new VehiclePositionRecord(v);

            //insert sorted by vehicle number
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

    private getPositionColor(idx: number): string {
        if (idx >= this.positionColors.length) {
            this.positionColors[idx] = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
        }

        return this.positionColors[idx];
    }

    private addLapLine(svg: SVGElement, lap: number) {
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

    private addPositionLine(svg: SVGElement, pos: number) {
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

    public draw() {
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

        let dots: SVGCircleElement[] = [];
        for (let i = 0; i < data.length; i++) {
            let laps = data[i].lapPositions;
            let v = data[i].vehicle;
            let color = this.getPositionColor(v.number() - 1);

            // Draw Legend
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

            let prevX: number = null;
            let prevY: number = null;
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
                let dot = makeSvg("circle") as SVGCircleElement;
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

    private onHoverDot(e: MouseEvent) {
        let dot = e.target as SVGCircleElement;
        dot.style.fill = dot.style.stroke;
        dot.setAttribute("r", String(this.dotRadius * 1.5));
    }

    private onDotLeave(e: MouseEvent) {
        let dot = e.target as SVGCircleElement;
        dot.style.fill = this.dotFill;
        dot.setAttribute("r", String(this.dotRadius));
    }
}

class VehiclePositionRecord {
    public vehicle: Vehicle;
    /**
     * The position of the vehicle at the completion of each lap.  lapPositions[0] is the starting position.
     */
    public lapPositions: number[];

    constructor(v: Vehicle) {
        this.vehicle = v;
        this.lapPositions = [];
    }
}

class SpeechSetting {
    public voice = null;
    public rate = 1.5;
    public pitch = 1.0;
    public volume = 1.0;

    constructor(voice: SpeechSynthesisVoice, r: number, p: number, v: number) {
        this.voice = voice;
        this.rate = r;
        this.pitch = p;
        this.volume = v;
    }
}

enum ToneFade {
    None = 0,
    Linear
}

class ToneSetting {
    public duration: number;
    public frequency: number;
    public volume: number;
    public fade: ToneFade = ToneFade.None;
    public min: number;
    public max: number;
    public step: number;
    public default: number;

    constructor(d: number, f: number, v: number, fade: ToneFade = ToneFade.None) {
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

    static initMinLapTime(input: HTMLInputElement) {
        AppSettings.minLapTimeMilliseconds = Number(input.value) * 1000;
        input.addEventListener("input", (e) => {
            AppSettings.minLapTimeMilliseconds = Number(input.value) * 1000;
            console.log("Min Lap Time changed to " + input.value);
        });
    }

    static initMaxLapTime(input: HTMLInputElement) {
        AppSettings.maxLapTimeMilliseconds = Number(input.value) * 1000;
        input.addEventListener("input", (e) => {
            AppSettings.maxLapTimeMilliseconds = Number(input.value) * 1000;
            console.log("Max Lap Time changed to " + input.value);
        });
    }

    static initDecimalPlaces(select: HTMLSelectElement) {
        AppSettings.displayDecimalPlaces = Number(select.value);
        select.addEventListener("change", (e) => {
            AppSettings.displayDecimalPlaces = Number(select.value);
            console.log("Display Decimal Places changed to " + select.value);
        });
    }

    static initStartTone(
        pitchSlider: HTMLInputElement,
        durationSlider: HTMLInputElement,
        volumeSlider: HTMLInputElement,
        fadeNoneInput: HTMLInputElement,
        fadeLinInput: HTMLInputElement) {
        AppSettings.initTone('startTone', AppSettings.startTone,
            pitchSlider, 60, 880, 10, 340,
            durationSlider, 500, 3000, 100, 1000,
            volumeSlider,
            fadeNoneInput, fadeLinInput);
    }

    static initExpirationTone(pitchSlider, durationSlider, volumeSlider, fadeNoneInput, fadeLinInput) {
        AppSettings.initTone('expirationTone', AppSettings.expirationTone,
            pitchSlider, 60, 880, 10, 110,
            durationSlider, 500, 3000, 100, 1000,
            volumeSlider,
            fadeNoneInput, fadeLinInput);
    }

    static initLapTone(pitchSlider, durationSlider, volumeSlider, fadeNoneInput, fadeLinInput) {
        AppSettings.initTone('lapTone', AppSettings.lapTone,
            pitchSlider, 60, 880, 10, 220,
            durationSlider, 50, 500, 10, 100,
            volumeSlider,
            fadeNoneInput, fadeLinInput);
    }

    static initLeaderTone(pitchSlider, durationSlider, volumeSlider, fadeNoneInput, fadeLinInput) {
        AppSettings.initTone('leaderTone', AppSettings.leaderTone,
            pitchSlider, 60, 880, 10, 440,
            durationSlider, 50, 500, 10, 100,
            volumeSlider,
            fadeNoneInput, fadeLinInput);
    }

    static initTone(toneName: string, setting: ToneSetting,
        pitchSlider: HTMLInputElement, fMin, fMax, fStep, fDefault,
        durationSlider: HTMLInputElement, dMin, dMax, dStep, dDefault,
        volumeSlider: HTMLInputElement,
        fadeNoneInput: HTMLInputElement, fadeLinInput: HTMLInputElement) {

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

        AppSettings.initSlider(pitchSlider, fMin, fMax, fStep, setting.frequency,
            (e) => AppSettings.handleSliderChanged(e, (v) => setting.frequency = v, fKey));

        AppSettings.initSlider(durationSlider, dMin, dMax, dStep, setting.duration,
            (e) => AppSettings.handleSliderChanged(e, (v) => setting.duration = v, dKey));

        AppSettings.initSlider(volumeSlider, 0, 100, 10, setting.volume,
            (e) => AppSettings.handleSliderChanged(e, (v) => setting.volume = v, vKey));

        fadeNoneInput.value = String(ToneFade.None);
        fadeNoneInput.checked = setting.fade == ToneFade.None;
        fadeLinInput.value = String(ToneFade.Linear);
        fadeLinInput.checked = setting.fade == ToneFade.Linear;

        let handleFadeChanged = (e: Event) => {
            let input = e.target as HTMLInputElement;
            if (input.checked) {
                setting.fade = Number(input.value);
                window.localStorage.setItem(fdKey, input.value);
                console.log(`Changed ${fdKey} to ${ToneFade[Number(input.value)]}`);
            }
        };

        fadeNoneInput.addEventListener('change', handleFadeChanged);
        fadeLinInput.addEventListener('change', handleFadeChanged);
    }

    static testTone(setting: ToneSetting) {
        AudioController.playTone(setting);
    }

    static initSpeechSliders(rateRange: HTMLInputElement, pitchRange: HTMLInputElement, volumeRange: HTMLInputElement) {
        let preferredRate = window.localStorage.getItem('ol_preferredSpeechRate');
        let preferredPitch = window.localStorage.getItem('ol_preferredSpeechPitch');
        let preferredVolume = window.localStorage.getItem('ol_preferredSpeechVolume');
        AppSettings.speech.rate = Number(preferredRate ? preferredRate : 1);
        AppSettings.speech.pitch = Number(preferredPitch ? preferredPitch : 1);
        AppSettings.speech.volume = Number(preferredVolume ? preferredVolume : 1);
        AppSettings.initSlider(rateRange, 0.1, 5, 0.1, AppSettings.speech.rate,
            (e) => AppSettings.handleSliderChanged(e, (v: number) => AppSettings.speech.rate = v, 'ol_preferredSpeechRate'));
        AppSettings.initSlider(pitchRange, 0.1, 2, 0.1, AppSettings.speech.pitch,
            (e) => AppSettings.handleSliderChanged(e, (v: number) => AppSettings.speech.pitch = v, 'ol_preferredSpeechPitch'));
        AppSettings.initSlider(volumeRange, 0.1, 1, 0.1, AppSettings.speech.volume,
            (e) => AppSettings.handleSliderChanged(e, (v: number) => AppSettings.speech.volume = v, 'ol_preferredSpeechVolume'));
    }

    static initSpeechVoices(voiceSelect: HTMLSelectElement) {
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

    static initSlider(slider: HTMLInputElement, min: number, max: number, step: number, value: number, handler: (e: Event) => void) {
        let output = makeOutput(String(value));
        //output.for = slider.id;
        slider.min = String(min);
        slider.max = String(max);
        slider.step = String(step);
        slider.value = String(value);
        slider.parentElement.appendChild(output);
        slider.addEventListener("input", (e: Event) => output.value = slider.value);
        slider.addEventListener("change", handler);
    }

    static handleSpeechVoiceChanged(e) {
        let voices = window.speechSynthesis.getVoices();
        AppSettings.speech.voice = voices.find((v) => v.name == e.target.selectedOptions[0].value);
        window.localStorage.setItem('ol_preferredSpeechVoice', AppSettings.speech.voice.name);
        console.log(`Speech Voice changed to ${AppSettings.speech.voice.name}`);
    }

    static handleSliderChanged(e: Event, set: (v: number) => void, key: string) {
        let input = e.target as HTMLInputElement;
        set(Number(input.value));
        window.localStorage.setItem(key, input.value);
        console.log(`${key} changed to ${input.value}`);
    }
}

function empty(parent: Element) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

function byId(id: string): HTMLElement {
    return document.getElementById(id);
}

function makeElement(name: string, content?: string | HTMLElement): HTMLElement {
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

function makeSvg(name: string): SVGElement {
    return document.createElementNS("http://www.w3.org/2000/svg", name);
}

function makeOutput(content?: string | HTMLElement): HTMLOutputElement {
    return makeElement("output", content) as HTMLOutputElement;
}

function makeButton(content?: string | HTMLElement): HTMLButtonElement {
    return makeElement("button", content) as HTMLButtonElement;
}

function makeSpan(content?: string | HTMLElement): HTMLSpanElement {
    return makeElement("span", content) as HTMLSpanElement;
}

function makeLegend(content?: string | HTMLElement): HTMLLegendElement {
    return makeElement("legend", content) as HTMLLegendElement;
}

function makeFieldset(content?: string | HTMLElement): HTMLFieldSetElement {
    return makeElement("fieldset", content) as HTMLFieldSetElement;
}

function makeDiv(content?: string | HTMLElement): HTMLDivElement {
    return makeElement("div", content) as HTMLDivElement;
}

function makeTd(content?: string | HTMLElement): HTMLTableCellElement {
    return makeElement("td", content) as HTMLTableCellElement;
}

function makeTr(content?: string | HTMLElement): HTMLTableRowElement {
    return makeElement("tr", content) as HTMLTableRowElement;
}

function makeOpt(content?: string | HTMLElement): HTMLOptionElement {
    return makeElement("option", content) as HTMLOptionElement;
}

function selectTabPage(e: HTMLElement) {
    e.parentElement.querySelectorAll(":scope>button")
        .forEach((btn) => {
            (byId(btn.getAttribute("page")) as HTMLDivElement).style.display = "none";
        });
    (byId(e.getAttribute("page")) as HTMLDivElement).style.display = "block";
    e.parentElement.querySelectorAll("button").forEach((bt) => bt.classList.remove("pure-button-active"));
    e.classList.add("pure-button-active");
}

class AudioController {
    static pendingSpeech = 0;
    static audioContext = new AudioContext();

    public static speak(text: string, immediate: boolean = false, forceEnqueue: boolean = false) {
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

    public static playTone(setting: ToneSetting = new ToneSetting(500, 440, 20, ToneFade.None)) {
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
            } catch (error) {
                reject(error);
            }
        });
    }
}

interface DriverManagerEntry {
    i: string, // transponder id
    n: string, // name
    s: string; // spoken name
    t: string; // note ie: vehicle description, etc.
}

class DriverManager {
    nameInput: HTMLInputElement;
    spokenInput: HTMLInputElement;
    idInput: HTMLInputElement;
    noteInput: HTMLInputElement;
    driverTable: HTMLTableElement;
    driverList: DriverManagerEntry[] = [];

    constructor(nameInput: HTMLInputElement,
        spokenInput: HTMLInputElement,
        testSpeechButton: HTMLButtonElement,
        idInput: HTMLInputElement,
        noteInput: HTMLInputElement,
        addButton: HTMLButtonElement,
        driverTable: HTMLTableElement,
        importButton: HTMLButtonElement,
        exportButton: HTMLButtonElement) {

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

    private importDrivers(e) {
        let json: string = null;
        let file = (e.target as HTMLInputElement).files[0];
        let reader = new FileReader();
        reader.addEventListener("load", (event) => {
            json = event.target.result as string;
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

    private exportDrivers() {
        let d = new Date();
        let filename = `OpenLap_Drivers_${d.getFullYear()}-${d.getMonth()}-${d.getDay()}_${d.getHours()}.${d.getMinutes()}.json`;
        let data = JSON.stringify(this.driverList, null, 2);
        const blob = new Blob([data]);
        const link = makeElement("a") as HTMLAnchorElement;
        link.download = filename;
        link.href = window.URL.createObjectURL(blob);
        link.click();
    }

    private testDriverSpeech(name: string, spoken: string) {
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

    private clearTable() {
        let tbody: HTMLTableSectionElement = this.driverTable.querySelector('tbody');
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

    private setDriverList(list: any[]) {
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

    lookupDriver(id: number): Driver {
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

    addDriver(id: string, name: string, spoken: string, note: string) {
        let tbody: HTMLTableSectionElement = this.driverTable.querySelector('tbody');
        let tr: HTMLTableRowElement = makeTr();

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

        // insert sorted by id
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

    handleAddDriver(e: Event) {
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

    handleDeleteDriver(e: Event) {
        let button = e.target as HTMLButtonElement;
        let row = button.parentElement.parentElement as HTMLTableRowElement;
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

function speakLapTime(millis: number) {
    // Customized for US-English
    // Avoid saying "point" as much as possible
    // Also replace 0 fractional seconds with "flat"
    let wholeSeconds = Math.trunc(millis / 1000);

    let seconds = (millis / 1000).toFixed(1);
    let text: string;
    text = String(seconds).replace('.0', ' flat');
    if (wholeSeconds % 10 != 0 || wholeSeconds % 100 === 10) {
        text = text.replace(".", " ");
    }
    AudioController.speak(text);
}

function getClockString(millis: number, includeMs: boolean = false): string {
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
    public min: number;
    public max: number;

    protected elapsedDiv: HTMLDivElement;
    protected remainingDiv: HTMLDivElement;

    public isExpired(millis: number): boolean {
        return false;
    }

    reset(millis: number) { }

    init(elapsed: HTMLDivElement, remaining: HTMLDivElement) {
    }

    public notify(v: Vehicle) {

    }

    public calculatePace(v: Vehicle) {

    }

    public vehicleIsFinished(v: Vehicle): boolean {
        return false;
    }

    public update(millis: number) {

    }
}

class LimitTimeControl extends TimeControl {
    timeLimit: number;
    timeMillis: number;
    timeStarted: number;

    constructor(timeLimit: number) {
        super();
        // in minutes
        this.timeLimit = timeLimit;
        this.min = 0;
        this.max = 99;
        // in milliseconds
        this.timeMillis = timeLimit * 60000;
        this.timeStarted = 0;
        this.elapsedDiv = null;
        this.remainingDiv = null;
    }

    reset(millis: number) {
        this.timeStarted = millis;
    }

    init(elapsed: HTMLDivElement, remaining: HTMLDivElement) {
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
    notify(v: Vehicle) {
    }
    update(millis: number) {
        let timeRemaining = this.timeMillis - (millis - this.timeStarted);
        this.elapsedDiv.textContent = getClockString(this.timeMillis - timeRemaining);
        this.remainingDiv.textContent = this.timeMillis > 0 ? getClockString(timeRemaining) : "--:--";
    }
    // Session clock has expired.
    // Vehicle clocks may still be running.
    isExpired(millis: number): boolean {
        if (this.timeMillis == 0) {
            return false;
        }
        let elapsed = millis - this.timeStarted;
        return elapsed >= this.timeMillis;
    }

    calculatePace(v: Vehicle): string {
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
    vehicleIsFinished(vehicle: Vehicle): boolean {
        if (this.timeLimit <= 0) {
            return false;
        }

        return vehicle.time >= this.timeMillis;;
    }
}
class LapTimeControl extends TimeControl {
    lapTarget: number;
    lapsCompleted: number;

    constructor(lapTarget: number) {
        super();
        this.lapTarget = lapTarget;
        this.min = 0;
        this.max = 999;
        this.lapsCompleted = 0;
        this.elapsedDiv = null;
        this.remainingDiv = null;
    }
    reset(millis: number) {
        this.lapsCompleted = 0;
    }

    init(elapsed: HTMLDivElement, remaining: HTMLDivElement) {
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

    notify(v: Vehicle) {
        if (v.lapsCompleted > this.lapsCompleted) {
            this.lapsCompleted = v.lapsCompleted;
            this.elapsedDiv.textContent = String(this.lapsCompleted).padStart(3, '0');
            this.remainingDiv.textContent = this.lapTarget > 0 ? String(this.lapTarget - this.lapsCompleted).padStart(3, '0') : "---";
        }
    }

    update(millis: number) { }

    // Session clock has expired.
    // Vehicle clocks may still be running.
    isExpired(): boolean {
        if (this.lapTarget == 0) {
            return false;
        }
        // TODO: figure out what how to handle vehicles with less
        // than lapTarget completed.
        return this.lapsCompleted >= this.lapTarget;
    }

    calculatePace(v): string {
        if (this.lapTarget <= 0) {
            return "-";
        }
        else {
            let finishTime = this.lapTarget * v.avgLap;
            return `${this.lapTarget}/${getClockString(finishTime)}`;
        }
    }

    vehicleIsFinished(vehicle): boolean {
        if (this.lapTarget <= 0) {
            return false;
        }
        return (vehicle.lapsCompleted >= this.lapTarget);
    }
}

class Driver {
    name: string;
    spokenName: string;

    constructor(name: string, spokenName: string = null) {
        this.name = name;
        this.spokenName = spokenName;
    }
    getNameToSpeak(): string {
        return this.spokenName?.trim() || this.name;
    }
    static unknown(): Driver {
        return new Driver("Unknown Driver");
    }
}

enum VehicleUpdateResult {
    Ignored = 0,
    FalseDetection = 1,
    ValidDetection = 2
}

/**
 * Uses Welford's Algorithm to keep a running calcuation of mean, variance, standard deviation
 */
class RunningStat {
    numValues: number;
    oldMean: number;
    newMean: number;
    oldS: number;
    newS: number;

    constructor() {
        this.numValues = 0;
    }
    clear() {
        this.numValues = 0;
    }
    push(x: number) {
        this.numValues++;
        if (this.numValues === 1) {
            this.oldMean = this.newMean = x;
            this.oldS = 0.0;
        } else {
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
    public isNew: boolean = true;
    public isStaging: boolean = false;

    // GUI elements
    public scoreBoardRow: HTMLTableRowElement = null;
    public progressBarDiv: HTMLDivElement = null;
    public progressTimeSpan: HTMLSpanElement = null;

    stats: RunningStat = new RunningStat();
    timeControl: TimeControl = null;
    id: number;
    private vehicleNum: number = null;
    driver: Driver;
    alive: Boolean = false;
    clockStart: number = null;
    clockStop: number = null;
    lastSeen: number = null;
    detectionCount: number = 0;
    positionValue: number = Number.MAX_SAFE_INTEGER;
    lapsCompleted: number = 0;
    time: number = null;
    lastLap: number = null;
    bestLap: number = null;
    worstLap: number = null;
    avgLap: number = null;
    stdDev: number = null;
    cv: number = null;
    pace: string = null;
    position: number = null;
    gap: string = null;
    interval: string = null;
    consistency: number = null;

    lapStartTime = null;
    lapTimes: number[] = [];

    constructor(id: number, driver: Driver = Driver.unknown()) {
        this.id = id;
        this.driver = driver;
    }

    getClockTime(millis: number): number {
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

    clockIsRunning(): boolean {
        return this.clockStart != null;
    }

    startClock(millis: number = 0) {
        this.clockStart = millis;
        this.lapStartTime = millis;
    }

    stopClock(millis: number) {
        this.clockStop = millis;
    }
    /**
     * gets or sets the vehicle number 
     * @param num 
     * @returns 
     */
    number(num?: number) {
        if (num) {
            this.vehicleNum = num;
            this.updatePositionValue();
        }
        else {
            return this.vehicleNum;
        }
    }

    updatePositionValue() {
        // Single value used to compare the position of the vehicle to other vehicles
        // use 52 bits of Number mantissa
        // 1023 - lapsCompleted (upper 10 bits)  Note: 1023 lap limit
        // total milliseconds (middle 32 bits)  
        // vehicle number (lower 10 bits)
        this.positionValue = ((1023 - (this.lapsCompleted || 0)) * (2 ** 42)) + ((this.time || (2 ** 32) - 1) * (2 ** 10)) + this.vehicleNum;
    }

    recordDetection(millis: number): VehicleUpdateResult {
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
            // clock is already running but there are no previous detections,
            // so a grid start race must have started it.
            // Record the first detection but do not record a lap.
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
    raceManager: RaceManager;
    ignoreUnregisteredTransponderIds: boolean;
    usePositionGraph: boolean;
    displayName: string;
    isStaging: boolean = false;

    constructor(raceManager: RaceManager) {
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
    announceDetection(v: Vehicle) { }
    announceStart() { }
    announceExpired() { }
    announceVehicleFinished(v) { }
    announceFinished() { }
    update(millis: number) { }
}

class PracticeSession extends TrackSession {
    constructor(raceManager: RaceManager) {
        super(raceManager);
    }
    announceDetection(v: Vehicle) {
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
    constructor(raceManager: RaceManager) {
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
    update(millis: number) {
        // remove vehicle sessions that haven't been seen in maxLapTimeSeconds
        for (let v of this.raceManager.vehicles.values()) {
            let last = v.lastSeen;
            if (last && ((millis - last) >= AppSettings.maxLapTimeMilliseconds)) {
                this.raceManager.removeVehicle(v);
            }
        }
    }
}

class RaceSession extends TrackSession {
    constructor(raceManager: RaceManager) {
        super(raceManager);
    }

    announceStart() {
        AudioController.playTone(AppSettings.startTone);
    }

    announceFinished() {
        AudioController.speak("Race is over", false, true);
    }

    announceVehicleFinished(v: Vehicle) {
        AudioController.speak(v.driver.getNameToSpeak() + " finished", false, true);
    }

    announceExpired() {
        AudioController.playTone(AppSettings.expirationTone);
    }

    announceDetection(v: Vehicle) {
        if (v.position === 0) {
            AudioController.playTone(AppSettings.leaderTone);
        }
        else {
            AudioController.playTone(AppSettings.lapTone);
        }
    }

    update(millis: number) {
        // finish vehicle sessions that haven't been seen in maxLapTimeSeconds
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

    constructor(raceManager: RaceManager) {
        super(raceManager);
        this.displayName = StagingSession.displayName;
        this.isStaging = true;
        this.ignoreUnregisteredTransponderIds = false;
    }

    announceStart(): void {
        AudioController.speak("All drivers, check in", false, true);
    }

    announceFinished(): void {

    }

    announceExpired(): void {

    }
}

class StaggeredStartRace extends RaceSession {
    static displayName = "Race (Staggered Start)";
    static allowLapTimeControl = true;
    constructor(raceManager: RaceManager) {
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
    constructor(raceManager: RaceManager) {
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
    displayName: string;
    allowLapTimeControl: boolean;
    build: (r: RaceManager) => TrackSession;

    constructor(d: string, a: boolean, b: (r: RaceManager) => TrackSession) {
        this.displayName = d;
        this.allowLapTimeControl = a;
        this.build = b;
    }
}

class TimeControlBuilder {
    displayName: string;
    build: (l: number) => TimeControl;

    constructor(d: string, b: (l: number) => TimeControl) {
        this.displayName = d;
        this.build = b;
    }
}

class RaceManager {
    private startPending: boolean = false;
    timeControl: TimeControl = null;
    vehicles: Map<number, Vehicle> = new Map();
    driverManager: DriverManager;
    running: boolean = false;
    startDate: Date = null;
    localOffset: number = 0;
    trackSession: TrackSession;
    updateSessionInterval: number = null;
    startButton: HTMLButtonElement;
    scoreBoardTable: HTMLTableElement;
    timeControlSelect: HTMLSelectElement;
    timeControlInput: HTMLInputElement;
    elapsedTimeDiv: HTMLDivElement;
    remainingTimeDiv: HTMLDivElement;
    modeSelect: HTMLSelectElement;
    lapsBoardDiv: HTMLDivElement;
    driversDialog: HTMLDialogElement;
    expired: boolean;
    positionGraph: PositionGraph = null;
    dragSource = null;
    startDelay: number = 0;

    sessionModeBuilders: TrackSessionBuilder[] = [
        new TrackSessionBuilder(OpenPractice.displayName, OpenPractice.allowLapTimeControl, (rm: RaceManager) => new OpenPractice(rm)),
        new TrackSessionBuilder(StagingSession.displayName, StagingSession.allowLapTimeControl, (rm: RaceManager) => new StagingSession(rm)),
        new TrackSessionBuilder(StaggeredStartRace.displayName, StaggeredStartRace.allowLapTimeControl, (rm: RaceManager) => new StaggeredStartRace(rm)),
        new TrackSessionBuilder(GridStartRace.displayName, GridStartRace.allowLapTimeControl, (rm: RaceManager) => new GridStartRace(rm))
    ];

    timeControlBuilders: TimeControlBuilder[] = [
        new TimeControlBuilder("Minutes", (l: number) => new LimitTimeControl(l)),
        new TimeControlBuilder("Laps", (l: number) => new LapTimeControl(l))
    ];

    leaderBoard: Vehicle[] = [];
    scoreBoardColumns: string[] = [];

    constructor(
        driverManager: DriverManager,
        startButton: HTMLButtonElement,
        modeSelect: HTMLSelectElement,
        timeControlSelect: HTMLSelectElement,
        timeControlInput: HTMLInputElement,
        elapsedTimeDiv: HTMLDivElement,
        remainingTimeDiv: HTMLDivElement,
        scoreBoardTable: HTMLTableElement,
        lapsBoardDiv: HTMLDivElement,
        positionGraphDiv: HTMLDivElement,
        addDriversButton: HTMLButtonElement,
        driversDialog: HTMLDialogElement,
        resetDriversButton: HTMLButtonElement,
        clearDriversButton: HTMLButtonElement,
        startDelaySelect: HTMLSelectElement) {

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

    initDriverButtons(addDriversButton: HTMLButtonElement, resetDriversButton: HTMLButtonElement, clearDriversButton: HTMLButtonElement) {
        addDriversButton.addEventListener("click", () => this.registerDrivers());
        clearDriversButton.addEventListener("click", () => this.clearVehicles());
        resetDriversButton.addEventListener("click", () => this.resetVehicles());
    }

    private registerDrivers() {
        let table = this.driversDialog.querySelector("table");
        empty(table.tBodies[0]);

        let allDrivers = this.driverManager.getDrivers();
        for (let d of allDrivers) {
            let row = makeTr();
            row.appendChild(makeTd(d.i));
            row.appendChild(makeTd(d.n));
            row.appendChild(makeTd(d.t));

            let check: HTMLInputElement = makeElement("input") as HTMLInputElement;

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

        // Most reliable to just remove all vehicles
        // and then re-add them based on id.
        // The guarantees fresh Vehicle objects.
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

    initStartButton(button: HTMLButtonElement) {
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

    setTimeControl(timeControl: TimeControl) {
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

    getSelectedSessionModeBuilder(): TrackSessionBuilder {
        return this.sessionModeBuilders[this.modeSelect.selectedIndex];
    }

    setSessionMode() {
        let builder = this.getSelectedSessionModeBuilder();
        this.trackSession = builder.build(this);
        console.log("Session Mode set to " + this.trackSession.displayName);
    }

    getLocalMillis(): number {
        return Date.now() - this.startDate.getTime();
    }

    sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async delayStart() {
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
        document.querySelectorAll(".raceDisabled").forEach((e) => (e as any).disabled = true);

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
        // session was cancelled
        if (!this.expired) {
            this.trackSession.announceExpired();
        }
        this.running = false;
        this.expired = true;

        document.querySelectorAll(".raceDisabled").forEach((e) => (e as any).disabled = false);
        console.log("Session Stopped");
        this.startButton.textContent = "Start";
    }

    allVehiclesFinished(): boolean {
        for (let v of this.vehicles.values()) {
            if (v.alive) {
                return false;
            }
        }
        return true;
    }

    toggleRace(e: Event) {

        if (this.running || this.startPending) {
            this.stopRace();
            this.startButton.textContent = "Start";
        }
        else if (!this.startPending) {
            this.startButton.textContent = "Stop";
            this.startRace();
        }

    }

    removeVehicle(v: Vehicle) {
        v.alive = false;
        this.vehicles.delete(v.id);
        this.removeVehicleFromScoreBoard(v);
        this.removeVehicleFromLeaderBoard(v);
        this.removeVehicleFromSideBoard(v);
    }

    removeVehicleFromLeaderBoard(v: Vehicle) {
        let idx = this.leaderBoard.findIndex((e) => e.id == v.id);
        if (idx >= 0) {
            this.leaderBoard.splice(idx, 1);
            this.updateLeaderBoard();
        }
    }

    removeVehicleFromScoreBoard(v: Vehicle) {
        v.scoreBoardRow?.remove();
    }

    addVehicle(id: number, driver: Driver = Driver.unknown()): Vehicle {
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

    createVehicleRow(v: Vehicle): HTMLTableRowElement {
        let tr = makeTr();
        tr.setAttribute("draggable", "true");
        tr.addEventListener("dragenter", (e: DragEvent) => this.vehicleTableRowDragEnter(e));
        tr.addEventListener("dragstart", (e: DragEvent) => this.vehicleTableRowDragStart(e));
        tr.addEventListener("dragover", (e: DragEvent) => this.vehicleTableRowDragOver(e));

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
                case "drv": {
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

    isbefore(a: HTMLElement, b: HTMLElement): boolean {
        if (a.parentNode == b.parentNode) {
            for (let cur: any = a; cur; cur = cur.previousSibling) {
                if (cur === b) {
                    return true;
                }
            }
        }
        return false;
    }

    vehicleTableRowDragOver(e: DragEvent) {
        e.preventDefault();
    }

    vehicleTableRowDragStart(e: DragEvent): any {
        if (this.running) {
            return false;
        }
        else {
            this.dragSource = e.target;
            e.dataTransfer.effectAllowed = 'move';
        }
    }

    vehicleTableRowDragEnter(e: DragEvent): any {
        e.preventDefault();
        let targetelem = e.target as any;
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
        } catch {
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

    updateLeaderBoard(v: Vehicle = null) {
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
            if (!current.time) { // zero laps completed
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
        //update all leaderboard fields
        for (let v of this.vehicles.values()) {
            let row = v.scoreBoardRow;
            row.cells[this.scoreBoardColumns.indexOf("pos")].textContent = String(v.position + 1);
            row.cells[this.scoreBoardColumns.indexOf("gap")].textContent = v.gap;
            row.cells[this.scoreBoardColumns.indexOf("int")].textContent = v.interval;
            // rowIndex is off by 1 due to the header row
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

    updateScoreBoard(v: Vehicle, result: VehicleUpdateResult = VehicleUpdateResult.ValidDetection) {
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
            // nothing else to do
            return;
        }

        if (result == VehicleUpdateResult.ValidDetection) {
            // reset progress bar
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

    removeVehicleFromSideBoard(v: Vehicle) {
        // remove from laps board
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

    updateSideBoard(v: Vehicle) {
        /* update position graph */
        if (this.trackSession.usePositionGraph) {
            this.positionGraph.draw();
        }
        /*  Update the Laps Board  */
        // check first column for lap number
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
        // add missing lap numbers
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

    getNextVehicleNumber(): number {
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

    detectVehicleNumber(num: number) {
        let v = [...this.vehicles.values()].find((v) => v.number() == num);
        if (v) {
            this.recordDetection(v.id, Date.now() - this.startDate.getTime());
        }
    }

    recordDetection(id: number, millis: number) {
        if (this.running === false)
            return;

        this.localOffset = (Date.now() - this.startDate.getTime()) - millis;
        let vehicle: Vehicle = null;
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
        // Don't call announceDetection() until AFTER updateScoreBoard() has been called.
        // Vehicle.position must be set correctly to determine leader or not.
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
    private detectorConnection: DetectorConnection = null;
    private connectionDialog: HTMLDialogElement;
    private settingsDialog: HTMLDialogElement;
    private hostName: string;
    private connStatusSpan: HTMLSpanElement;

    constructor(
        configureButton: HTMLButtonElement,
        connectionDialog: HTMLDialogElement,
        settingsDialog: HTMLDialogElement,
        addressInput: HTMLInputElement,
        statusSpan: HTMLSpanElement) {

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

        let connDialogOkButton = this.connectionDialog.querySelector(".okbutton") as HTMLButtonElement;
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

        let settingsDialogOkButton = this.settingsDialog.querySelector(".okbutton") as HTMLButtonElement;
        settingsDialogOkButton.addEventListener("click", () => {
            if (this.detectorConnection instanceof WebSocketDetectorConnection) {
                let ssidInput = this.settingsDialog.querySelector(".ssidInput") as HTMLInputElement;
                let passwordInput = this.settingsDialog.querySelector(".passwordInput") as HTMLInputElement;
                let mdnsInput = this.settingsDialog.querySelector(".mdnsInput") as HTMLInputElement;

                let json = JSON.stringify(
                    {
                        command: "setNetworkSettings",
                        ssid: ssidInput.value.trim(),
                        password: passwordInput.value.trim(),
                        mDNS: mdnsInput.value.trim(),
                    }
                );
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

    public showConnectionDialog() {
        this.connectionDialog.showModal();
    }

    public connection(): DetectorConnection {
        return this.detectorConnection;
    }

    initDetectorConnection(hostName: string) {
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
            console.log(`Connecting to detector at ${hostName}`);
            this.detectorConnection = new WebSocketDetectorConnection(`ws://${hostName}/ws`);
        }

        this.detectorConnection.onConnected = () => this.onDetectorOpen();
        this.detectorConnection.onDisconnected = () => this.onDetectorClose();
        this.detectorConnection.onMessage = (msg: string) => this.onDetectorMessage(msg);
        console.log('Connecting to detector');
        this.detectorConnection.connect();
    }

    onDetectorMessage(msg: string) {
        if (msg.at(0) == '{') {
            let response = JSON.parse(msg);
            console.log(response);

            if (response.hasOwnProperty("inResponseTo")) {
                switch (response.inResponseTo) {
                    case "getNetworkSettings":
                        let ssidInput = this.settingsDialog.querySelector(".ssidInput") as HTMLInputElement;
                        let passwordInput = this.settingsDialog.querySelector(".passwordInput") as HTMLInputElement;
                        let mdnsInput = this.settingsDialog.querySelector(".mdnsInput") as HTMLInputElement;
                        ssidInput.value = response.ssid;
                        passwordInput.value = response.password;
                        mdnsInput.value = response.mDNS;
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
    protected isConnected: boolean;
    onMessage: any;
    onConnected: any;
    onDisconnected: any;

    constructor() {
        this.isConnected = false;
        this.onMessage = null;
        this.onConnected = null;
        this.onDisconnected = null;
    }

    send(msg: string) { }

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

    notifyOnMessage(msg: string) {
        if (this.onMessage) {
            this.onMessage(msg);
        }
    }
}

class SimulatedConnection extends DetectorConnection {
    private simRunning = false;
    private simStartTime: number = 0;
    private simDrivers: number[] = [];

    constructor() {
        super();
    }

    /**
     * Simulates 10 cars going around a track every 15-20 seconds.
     */
    private beginSim() {
        this.endSim();

        this.simRunning = true;
        for (let i = 0; i < 10; i++) {
            this.simDrivers.push(setTimeout((idx: number) => this.simulateDetection(idx), 1000 + Math.random() * 3001, i));
        }
    }

    private endSim() {
        this.simRunning = false;
        for (let d of this.simDrivers) {
            clearTimeout(d);
        }
        this.simDrivers = [];
    }

    private simulateDetection(transponderId: number) {
        if (!this.simRunning) {
            return;
        }

        let msg = `%L${transponderId.toString(16)},${(Date.now() - this.simStartTime).toString(16)}&`;
        this.notifyOnMessage(msg);
        this.simDrivers[transponderId] = setTimeout((idx: number) => this.simulateDetection(idx), 15000 + Math.random() * 5001, transponderId);
    }

    send(msg: string) {
        switch (msg) {
            case "%I&": // ZRound init detector
                this.simStartTime = Date.now();
                break;
            case "%F&": // ZRound race finished
                break;
            case "%B&": // Not a standard ZRound command.  Use same convention for consistency.
                this.beginSim();
                break;
            case "%E&": // Not a standard ZRound command.  Use same convention for consistency.
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
    url: string;
    constructor(url: string) {
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

    onWsOpen(e: Event) {
        this.isConnected = true;
        this.notifyOnConnected();
    }

    onWsClose(e: Event) {
        this.isConnected = false;
        this.notifyOnDisconnected();
    }
    send(msg: string) {
        if (this.isConnected) {
            this.ws.send(msg);
        }
    }

    onWsReceive(e: MessageEvent) {
        if (e.type == "message") {
            this.notifyOnMessage(e.data);
        }
    }
}

class AlertDialog {
    static dialog: HTMLDialogElement;

    static init(d: HTMLDialogElement): void {
        this.dialog = d;
        d.addEventListener("close", () => {
            empty(this.getMessageDiv());
        });
        new DialogAnimator(d);
    }

    static show(msg: string = null): void {
        let msgDiv = this.getMessageDiv();
        if (msg) {
            empty(msgDiv);
            msgDiv.textContent = msg;
        }
        this.dialog.showModal();
    }

    static getMessageDiv(): HTMLDivElement {
        return this.dialog.querySelector(".alertMessageDiv") as HTMLDivElement;
    }
}

window.speechSynthesis.onvoiceschanged = (e) => {
    AppSettings.initSpeechVoices(byId('voiceSelect') as HTMLSelectElement);
};

window.onbeforeunload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = "Are you sure you want to leave?  Active race will be lost!";
};

window.onkeydown = (e: KeyboardEvent) => {
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
    new HorizontalResizer(
        byId("driverBoard") as HTMLDivElement,
        byId("infoBoard") as HTMLDivElement,
        byId("raceSplitter") as HTMLDivElement);

    let buttons = document.querySelectorAll(".tabsHeader > button:nth-child(1)");
    for (let b of buttons) {
        (b as HTMLButtonElement).click();
    }
    driverManager.loadDrivers();

    AlertDialog.init(byId("alertDialog") as HTMLDialogElement);

    AppSettings.initMinLapTime(byId('minLapTimeInput') as HTMLInputElement);
    AppSettings.initMaxLapTime(byId('maxLapTimeInput') as HTMLInputElement);
    AppSettings.initDecimalPlaces(byId('displayDecimalPlacesSelect') as HTMLSelectElement);
    AppSettings.initSpeechSliders(
        byId('speechRateRange') as HTMLInputElement,
        byId('speechPitchRange') as HTMLInputElement,
        byId('speechVolumeRange') as HTMLInputElement);
    AppSettings.initStartTone(
        byId('startTonePitchRange') as HTMLInputElement,
        byId('startToneDurationRange') as HTMLInputElement,
        byId('startToneVolumeRange') as HTMLInputElement,
        byId('startToneFadeNone') as HTMLInputElement,
        byId('startToneFadeLin') as HTMLInputElement);
    AppSettings.initExpirationTone(
        byId('endTonePitchRange') as HTMLInputElement,
        byId('endToneDurationRange') as HTMLInputElement,
        byId('endToneVolumeRange') as HTMLInputElement,
        byId('endToneFadeNone') as HTMLInputElement,
        byId('endToneFadeLin') as HTMLInputElement);
    AppSettings.initLapTone(
        byId('lapTonePitchRange') as HTMLInputElement,
        byId('lapToneDurationRange') as HTMLInputElement,
        byId('lapToneVolumeRange') as HTMLInputElement,
        byId('lapToneFadeNone') as HTMLInputElement,
        byId('lapToneFadeLin') as HTMLInputElement);
    AppSettings.initLeaderTone(
        byId('leaderTonePitchRange') as HTMLInputElement,
        byId('leaderToneDurationRange') as HTMLInputElement,
        byId('leaderToneVolumeRange') as HTMLInputElement,
        byId('leaderToneFadeNone') as HTMLInputElement,
        byId('leaderToneFadeLin') as HTMLInputElement);

    if (window.location.hostname != '') {
        connectionController.initDetectorConnection(window.location.hostname);
    }
    else {
        connectionController.showConnectionDialog();
    }
};

let connectionController = new ConnectionController(
    byId("configureConnectionButton") as HTMLButtonElement,
    byId("connectionDialog") as HTMLDialogElement,
    byId("detectorSettingsDialog") as HTMLDialogElement,
    byId("detectorAddressInput") as HTMLInputElement,
    byId("connStatusSpan") as HTMLSpanElement,
);

let driverManager = new DriverManager(
    byId('driverNameInput') as HTMLInputElement,
    byId('driverSpokenNameInput') as HTMLInputElement,
    byId('driverTestSpeechButton') as HTMLButtonElement,
    byId('driverTransponderIdInput') as HTMLInputElement,
    byId('driverNoteInput') as HTMLInputElement,
    byId('addDriverButton') as HTMLButtonElement,
    byId('driversTable') as HTMLTableElement,
    byId('importDriversButton') as HTMLButtonElement,
    byId('exportDriversButton') as HTMLButtonElement,
);

let raceManager = new RaceManager(
    driverManager,
    byId('startButton') as HTMLButtonElement,
    byId('modeSelect') as HTMLSelectElement,
    byId('timeControlSelect') as HTMLSelectElement,
    byId('timeControlInput') as HTMLInputElement,
    byId('elapsedTimeDiv') as HTMLDivElement,
    byId('remainingTimeDiv') as HTMLDivElement,
    byId('scoreBoardTable') as HTMLTableElement,
    byId('lapsBoardDiv') as HTMLDivElement,
    byId("positionGraphDiv") as HTMLDivElement,
    byId("addDriversButton") as HTMLButtonElement,
    byId("registerDriversDialog") as HTMLDialogElement,
    byId("resetDriversButton") as HTMLButtonElement,
    byId("clearDriversButton") as HTMLButtonElement,
    byId("startDelaySelect") as HTMLSelectElement
);

function initDetector() {
    connectionController.connection().send('%I&');
}

function beginSim(e: Event) {
    connectionController.connection().send('%B&');
}

function endSim(e: Event) {
    connectionController.connection().send('%E&');
}