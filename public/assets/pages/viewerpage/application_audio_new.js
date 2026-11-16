import { createElement, onDestroy } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { qs, safe } from "../../lib/dom.js";
import { ApplicationError } from "../../lib/error.js";
import { loadCSS } from "../../helpers/loader.js";
import { settings_get, settings_put } from "../../lib/settings.js";
import assert from "../../lib/assert.js";

import ctrlError from "../ctrl_error.js";
import { renderMenubar, buttonDownload, buttonChromecast } from "./component_menubar.js";

import { ICON } from "./common_icon.js";
import { formatTimecode } from "./common_player.js";
import { transition } from "./common.js";

const STATUS_PLAYING = "PLAYING";
const STATUS_PAUSED = "PAUSED";
const STATUS_BUFFERING = "BUFFERING";

export default function(render, { getFilename, getDownloadUrl, mime }) {
    const $page = createElement(`
        <div class="component_audioplayer">
            <component-menubar filename="${safe(getFilename())}"></component-menubar>
            <div class="audioplayer_container">
                <div class="audioplayer_box">
                    <div data-bind="loader">
                        <div class="audioplayer_loader"></div>
                        <span class="percent"></span>
                        <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB3aWR0aD0nMTIwcHgnIGhlaWdodD0nMTIwcHgnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIiBjbGFzcz0idWlsLXJpbmctYWx0Ij4KICA8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0ibm9uZSIgY2xhc3M9ImJrIj48L3JlY3Q+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIHN0cm9rZT0ibm9uZSIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48L2NpcmNsZT4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgc3Ryb2tlPSIjNmY2ZjZmIiBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+CiAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJzdHJva2UtZGFzaG9mZnNldCIgZHVyPSIycyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIGZyb209IjAiIHRvPSI1MDIiPjwvYW5pbWF0ZT4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9InN0cm9rZS1kYXNoYXJyYXkiIGR1cj0iMnMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIiB2YWx1ZXM9IjE1MC42IDEwMC40OzEgMjUwOzE1MC42IDEwMC40Ij48L2FuaW1hdGU+CiAgPC9jaXJjbGU+Cjwvc3ZnPgo=" alt="loading">
                    </div>
                    <div class="audioplayer_waveform">
                        <canvas data-bind="wave"></canvas>
                        <canvas data-bind="progress"></canvas>
                        <div class="cursor hidden"></div>
                    </div>
                    <div class="audioplayer_control hidden">
                        <div class="buttons no-select">
                            <span>
                                <img class="component_icon" draggable="false" src="${ICON.PLAY}" alt="play">
                                <img class="component_icon hidden" draggable="false" src="${ICON.PAUSE}" alt="pause">
                                <component-icon name="loading" class="hidden"></component-icon>
                            </span>
                            <span>
                                <img class="component_icon hidden" draggable="false" src="${ICON.VOLUME_MUTE}" alt="volume_mute">
                                <img class="component_icon hidden" draggable="false" src="${ICON.VOLUME_LOW}" alt="volume_low">
                                <img class="component_icon hidden" draggable="false" src="${ICON.VOLUME_NORMAL}" alt="volume">
                            </span>
                            <input type="range" min="0" max="100" value="52">
                        </div>
                        <div class="timecode">
                            <span id="currentTime">00:00</span>
                            <span id="separator" class="no-select">/</span>
                            <span id="totalDuration">00:00</span>
                        </div>
                    </div>
                    <style>${CSS}</style>
                </div>
            </div>
        </div>
    `);
    render($page);
    transition(qs($page, ".audioplayer_box"));

    const waveform = new Waveform(qs($page, ".audioplayer_waveform"));
    const init$ = new rxjs.Subject();

    // a video tag as chrome doesn't expose remote playback devices for audio
    // tags, created programmatically as parser created media elements never
    // report any remote playback device either
    const $audio = document.createElement("video");
    $audio.src = getDownloadUrl();
    qs($page, ".audioplayer_box").appendChild($audio);
    const $loader = qs($page, `[data-bind="loader"]`);
    const $control = {
        main: qs($page, ".audioplayer_control"),
        play: qs($page, `.audioplayer_control [alt="play"]`),
        pause: qs($page, `.audioplayer_control [alt="pause"]`),
        loading: qs($page, `.audioplayer_control component-icon[name="loading"]`),
        time: qs($page, `.audioplayer_control [id="currentTime"]`),
        total: qs($page, `.audioplayer_control [id="totalDuration"]`),
    };
    const $volume = {
        range: qs($page, `input[type="range"]`),
        icon_mute: qs($page, `img[alt="volume_mute"]`),
        icon_low: qs($page, `img[alt="volume_low"]`),
        icon_normal: qs($page, `img[alt="volume"]`),
    };
    renderMenubar(
        qs($page, "component-menubar"),
        buttonDownload(getDownloadUrl()),
        buttonChromecast($audio, true),
    );

    const setVolume = (volume) => {
        settings_put("volume", volume);
        $audio.volume = volume / 100;
        $volume.range.value = volume;
        if (volume === 0) {
            $volume.icon_mute.classList.remove("hidden");
            $volume.icon_low.classList.add("hidden");
            $volume.icon_normal.classList.add("hidden");
        } else if (volume < 50) {
            $volume.icon_mute.classList.add("hidden");
            $volume.icon_low.classList.remove("hidden");
            $volume.icon_normal.classList.add("hidden");
        } else {
            $volume.icon_mute.classList.add("hidden");
            $volume.icon_low.classList.add("hidden");
            $volume.icon_normal.classList.remove("hidden");
        }
    };
    const setStatus = (status) => {
        switch (status) {
        case STATUS_PLAYING:
            $control.play.classList.add("hidden");
            $control.pause.classList.remove("hidden");
            $control.loading.classList.add("hidden");
            $audio.play();
            break;
        case STATUS_PAUSED:
            $control.play.classList.remove("hidden");
            $control.pause.classList.add("hidden");
            $control.loading.classList.add("hidden");
            $audio.pause();
            break;
        case STATUS_BUFFERING:
            $control.play.classList.add("hidden");
            $control.pause.classList.add("hidden");
            $control.loading.classList.remove("hidden");
            break;
        default:
            assert.fail(status);
        }
    };
    const setSeek = (newTime, shouldSet = false) => {
        if (shouldSet) $audio.currentTime = newTime;
        waveform.progress(100 * newTime / $audio.duration);
        $control.time.textContent = formatTimecode(newTime);
    };

    // feature1: initialise
    effect(rxjs.of(getDownloadUrl()).pipe(
        rxjs.mergeMap((url) => new rxjs.Observable((observer) => {
            const controller = new AbortController();
            fetch(url, { signal: controller.signal }).then((resp) => {
                if (!resp.ok) throw new ApplicationError("Not Found", `${resp.status} ${resp.statusText}`);
                const total = parseInt(resp.headers.get("Content-Length"), 10) || 0;
                const reader = resp.body.getReader();
                const chunks = [];
                let loaded = 0;
                const pump = () => reader.read().then(({ done, value }) => {
                    if (value) {
                        chunks.push(value);
                        loaded += value.length;
                    }
                    observer.next({
                        progress: Math.round(100 * loaded / total),
                        blob: new Blob(chunks, { type: mime }),
                    });
                    if (done) observer.complete();
                    else pump();
                });
                return pump();
            }).catch((err) => {
                if (err.name === "AbortError") observer.complete();
                else observer.error(err);
            });
            return () => controller.abort();
        })),
        rxjs.tap(({ progress }) => {
            qs($loader, ".audioplayer_loader").style.width = `${progress}%`;
            qs($loader, ".percent").textContent = `${progress}%`;
        }),
        rxjs.last(),
        rxjs.mergeMap(({ blob }) => {
            const url = URL.createObjectURL(blob);
            onDestroy(() => URL.revokeObjectURL(url));
            // $audio.src = url;
            return waveform.load(blob);
        }),
        rxjs.tap(() => {
            $loader.classList.add("hidden");
            $control.main.classList.remove("hidden");
            $control.total.textContent = formatTimecode($audio.duration);
            setSeek(0);
            init$.next();
        }),
        rxjs.catchError(ctrlError()),
    ));

    // feature2: render progress
    effect(rxjs.animationFrames().pipe(
        rxjs.skipUntil(init$),
        rxjs.tap(() => setSeek($audio.currentTime)),
    ));

    // feature3: redraw on resize
    effect(rxjs.fromEvent(window, "resize").pipe(
        rxjs.skipUntil(init$),
        rxjs.debounceTime(100),
        rxjs.tap(() => waveform.redraw()),
    ));

    // feature4: player control - play/pause
    effect(rxjs.merge(
        rxjs.fromEvent($control.play, "click").pipe(rxjs.mapTo(STATUS_PLAYING)),
        rxjs.fromEvent($control.pause, "click").pipe(rxjs.mapTo(STATUS_PAUSED)),
        rxjs.fromEvent($audio, "ended").pipe(rxjs.mapTo(STATUS_PAUSED)),
        rxjs.fromEvent($audio, "waiting").pipe(rxjs.mapTo(STATUS_BUFFERING)),
        rxjs.fromEvent($audio, "playing").pipe(rxjs.mapTo(STATUS_PLAYING)),
    ).pipe(
        rxjs.skipUntil(init$),
        rxjs.debounceTime(50),
        rxjs.tap(setStatus),
    ));

    // feature5: player control - volume
    effect(rxjs.combineLatest(
        rxjs.fromEvent($volume.range, "input").pipe(
            rxjs.map((e) => parseInt(e.target.value)),
            rxjs.startWith(settings_get("volume") === null ? 80 : settings_get("volume")),
        ),
        rxjs.merge(
            rxjs.fromEvent($volume.icon_mute, "click"),
            rxjs.fromEvent($volume.icon_low, "click"),
            rxjs.fromEvent($volume.icon_normal, "click"),
        ).pipe(
            rxjs.startWith(false),
            rxjs.scan((isMuted) => !isMuted, true),
        ),
    ).pipe(rxjs.tap(([volume, isMuted]) => {
        if (isMuted) setVolume(0);
        else setVolume(volume);
    })));

    // feature6: player control - seek
    effect(rxjs.fromEvent(waveform.$el, "click").pipe(
        rxjs.skipUntil(init$),
        rxjs.map((e) => {
            const rec = waveform.$el.getBoundingClientRect();
            return (e.clientX - rec.x) / rec.width;
        }),
        rxjs.tap((n) => setSeek(n * $audio.duration, true)),
    ));

    // feature7: player control - keyboard shortcut
    effect(rxjs.fromEvent(document, "keydown").pipe(
        rxjs.skipUntil(init$),
        rxjs.map((e) => e.code),
        rxjs.tap((code) => {
            switch (code) {
            case "Space":
            case "KeyK":
                setStatus($audio.paused ? STATUS_PLAYING : STATUS_PAUSED);
                break;
            case "KeyM":
                setVolume($audio.volume > 0 ? 0 : settings_get("volume"));
                break;
            case "ArrowUp":
                setVolume(Math.min($audio.volume * 100 + 10, 100));
                break;
            case "ArrowDown":
                setVolume(Math.max($audio.volume * 100 - 10, 0));
                break;
            case "KeyL":
                setSeek(Math.min($audio.duration, $audio.currentTime + 10), true);
                break;
            case "KeyJ":
                setSeek(Math.max(0, $audio.currentTime - 10), true);
                break;
            case "Home":
            case "Digit0":
                setSeek(0, true);
                break;
            case "Digit1":
                setSeek($audio.duration / 10, true);
                break;
            case "Digit2":
                setSeek($audio.duration * 2 / 10, true);
                break;
            case "Digit3":
                setSeek($audio.duration * 3 / 10, true);
                break;
            case "Digit4":
                setSeek($audio.duration * 4 / 10, true);
                break;
            case "Digit5":
                setSeek($audio.duration * 5 / 10, true);
                break;
            case "Digit6":
                setSeek($audio.duration * 6 / 10, true);
                break;
            case "Digit7":
                setSeek($audio.duration * 7 / 10, true);
                break;
            case "Digit8":
                setSeek($audio.duration * 8 / 10, true);
                break;
            case "Digit9":
                setSeek($audio.duration * 9 / 10, true);
                break;
            case "End":
                setSeek($audio.duration, true);
                break;
            }
        }),
    ));
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "./application_audio.css"),
        loadCSS(import.meta.url, "./component_menubar.css"),
    ]);
}

class Waveform {
    static COLOR_WAVE = "#323639";
    static COLOR_PROGRESS = "#808080";
    static BAR_WIDTH = 2;
    static BAR_GAP = 1;
    static NB_BUCKETS = 4000;

    constructor($el) {
        this.$el = $el;
        this.$wave = qs($el, `[data-bind="wave"]`);
        this.$progress = qs($el, `[data-bind="progress"]`);
        this.$cursor = qs($el, ".cursor");
        this.peaks = null;
    }

    load(blob) {
        return blob.arrayBuffer()
            .then((ab) => new OfflineAudioContext(1, 2, 8000).decodeAudioData(ab))
            .then((ab) => this._computePeaks(ab))
            .catch(() => new Float32Array(Waveform.NB_BUCKETS).fill(0.05))
            .then((peaks) => {
                this.peaks = peaks;
                this.$cursor.classList.remove("hidden");
                this.redraw();
            });
    }

    progress(percent) {
        this.$progress.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
        this.$cursor.style.left = `calc(${percent}% - ${3 * percent / 100}px)`;
    }

    redraw() {
        if (!this.peaks) return;
        this._draw(this.$wave, Waveform.COLOR_WAVE);
        this._draw(this.$progress, Waveform.COLOR_PROGRESS);
    }

    _draw($canvas, color) {
        const dpr = window.devicePixelRatio || 1;
        const { width, height } = $canvas.getBoundingClientRect();
        $canvas.width = width * dpr;
        $canvas.height = height * dpr;
        const ctx = $canvas.getContext("2d");
        ctx.scale(dpr, dpr);
        ctx.fillStyle = color;
        const n = Math.floor(width / (Waveform.BAR_WIDTH + Waveform.BAR_GAP));
        for (let i = 0; i < n; i++) {
            const h = Math.max(1, this.peaks[Math.floor(i * this.peaks.length / n)] * height);
            ctx.fillRect(i * (Waveform.BAR_WIDTH + Waveform.BAR_GAP), (height - h) / 2, Waveform.BAR_WIDTH, h);
        }
    }

    _computePeaks(audioBuffer) {
        const data = audioBuffer.getChannelData(0);
        const bucketSize = Math.floor(data.length / Waveform.NB_BUCKETS) || 1;
        const peaks = new Float32Array(Waveform.NB_BUCKETS);
        let max = 0;
        for (let i = 0; i < Waveform.NB_BUCKETS; i++) {
            let peak = 0;
            const end = Math.min((i + 1) * bucketSize, data.length);
            for (let j = i * bucketSize; j < end; j++) {
                const v = Math.abs(data[j]);
                if (v > peak) peak = v;
            }
            peaks[i] = peak;
            if (peak > max) max = peak;
        }
        if (max > 0) for (let i = 0; i < Waveform.NB_BUCKETS; i++) peaks[i] /= max;
        return peaks;
    }
}

const CSS = `
.component_audioplayer .audioplayer_container .audioplayer_box video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    pointer-events: none;
}
.component_audioplayer .audioplayer_container .audioplayer_box .audioplayer_waveform {
    position: relative;
    height: 200px;
    cursor: pointer;
}
.component_audioplayer .audioplayer_container .audioplayer_box .audioplayer_waveform canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}
.component_audioplayer .audioplayer_container .audioplayer_box .audioplayer_waveform .cursor {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 3px;
    background: #6f6f6f;
}
`;
