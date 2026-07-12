import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { animate, slideYIn } from "../../lib/animate.js";
import { qs, safe } from "../../lib/dom.js";
import { settings_get, settings_put } from "../../lib/settings.js";
import { ApplicationError } from "../../lib/error.js";
import assert from "../../lib/assert.js";
import Hls from "../../lib/vendor/hlsjs/hls.js";
import { loadCSS } from "../../helpers/loader.js";
import ctrlError from "../ctrl_error.js";

import createSources from "./application_video/sources.js";
import { transition } from "./common.js";
import { formatTimecode } from "./common_player.js";
import { ICON } from "./common_icon.js";
import { renderMenubar, buttonDownload, buttonFullscreen, buttonChromecast } from "./component_menubar.js";
import ctrlDownloader, { init as initDownloader } from "./application_downloader.js";

import "../../components/icon.js";

const STATUS_PLAYING = "PLAYING";
const STATUS_PAUSED = "PAUSED";
const STATUS_BUFFERING = "BUFFERING";

export default function(render, { getFilename, getDownloadUrl, acl$, mime }) {
    const $page = createElement(`
        <div class="component_videoplayer">
            <component-menubar filename="${safe(getFilename())}"></component-menubar>
            <div class="video_container">
                <span>
                    <div class="video_screen">
                        <div class="video_wrapper">
                            <video controlslist="noremoteplayback"></video>
                        </div>
                        <div class="loader no-select">
                            <component-icon name="loading"></component-icon>
                        </div>
                        <div class="videoplayer_control no-select hidden">
                            <div class="progress">
                                <div data-bind="progress-buffer">
                                   <div class="progress-buffer" style="left: 0%; width: 0%;"></div>
                                </div>
                                <div class="progress-active" style="width: 0%;">
                                    <div class="thumb"></div>
                                </div>
                                <div class="progress-placeholder"></div>
                            </div>
                            <img class="component_icon" draggable="false" src="${ICON.PLAY}" alt="play">
                            <img class="component_icon hidden" draggable="false" src="${ICON.PAUSE}" alt="pause">
                            <component-icon name="loading" class="hidden"></component-icon>

                            <img class="component_icon hidden" draggable="false" src="${ICON.VOLUME_MUTE}" alt="volume_mute">
                            <img class="component_icon hidden" draggable="false" src="${ICON.VOLUME_LOW}" alt="volume_low">
                            <img class="component_icon hidden" draggable="false" src="${ICON.VOLUME_NORMAL}" alt="volume">
                            <input type="range" min="0" max="100" value="13">
                            <span class="timecode">
                                <div class="current"></div>
                                <div class="hint hidden"></div>
                            </span>
                        </div>
                    </div>
                </span>
            </div>
        </div>
    `);
    render($page);
    transition(qs($page, ".video_container"));

    const init$ = new rxjs.Subject();
    const $video = qs($page, "video");
    const $loader = qs($page, ".loader");
    const $control = {
        main: qs($page, ".videoplayer_control"),
        play: qs($page, `.videoplayer_control [alt="play"]`),
        pause: qs($page, `.videoplayer_control [alt="pause"]`),
        loading: qs($page, `.videoplayer_control component-icon[name="loading"]`),
    };
    const $volume = {
        range: qs($page, `input[type="range"]`),
        icon_mute: qs($page, `img[alt="volume_mute"]`),
        icon_low: qs($page, `img[alt="volume_low"]`),
        icon_normal: qs($page, `img[alt="volume"]`),
    };
    const $hint = qs($page, ".hint");
    const $progress = qs($page, ".progress");
    renderMenubar(
        qs($page, "component-menubar"),
        buttonDownload(getDownloadUrl()),
        buttonFullscreen($video),
        buttonChromecast($video),
    );

    const setVolume = (volume) => {
        settings_put("volume", volume);
        $video.volume = volume / 100;
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
        case "PLAYING":
            $control.play.classList.add("hidden");
            $control.pause.classList.remove("hidden");
            $control.loading.classList.add("hidden");
            $video.play();
            break;
        case "PAUSED":
            $control.play.classList.remove("hidden");
            $control.pause.classList.add("hidden");
            $control.loading.classList.add("hidden");
            $video.pause();
            break;
        case "BUFFERING":
            $control.play.classList.add("hidden");
            $control.pause.classList.add("hidden");
            $control.loading.classList.remove("hidden");
            break;
        default:
            assert.fail(status);
        }
        $loader.classList.add("hidden");
        $control.main.classList.remove("hidden");
    };
    const setSeek = (newTime, shouldSet = false) => {
        if (shouldSet) $video.currentTime = newTime;
        const width = 100 * (newTime / $video.duration);
        qs($page, ".progress .progress-active").style.width = `${width}%`;
        if (!isNaN($video.duration)) {
            qs($page, ".timecode .current").textContent = formatTimecode($video.currentTime) + " / " + formatTimecode($video.duration);
        }
    };

    // feature1: setup the dom
    effect(rxjs.of(createSources(mime, getDownloadUrl())).pipe(
        rxjs.mergeMap((sources) => {
            const $sources = [];
            for (const [type, src] of sources) {
                const $source = document.createElement("source");
                $source.setAttribute("type", type);
                $source.setAttribute("src", src);
                if ($video.canPlayType(type)) $sources.push($source);
            }

            // Native Playback -> best case
            if ($sources.length > 0) {
                $video.append(...$sources);
                return rxjs.merge(
                    rxjs.fromEvent($video, "loadeddata"),
                    ...$sources.map(($source) => rxjs.fromEvent($source, "error").pipe(rxjs.mergeMap(() =>
                        rxjs.throwError(() => new ApplicationError("Not Supported", JSON.stringify({ type: $source.type, src: $source.src }, null, 2))),
                    ))),
                );
            }

            // MSE Playback -> fallback as it break $video.remote functionalities
            if (Hls.isSupported()) {
                const hls = new Hls();
                for (const [type, src] of sources) {
                    if (type !== "application/x-mpegURL") continue;
                    hls.loadSource(src);
                    hls.attachMedia($video);
                    return rxjs.fromEvent($video, "loadeddata");
                }
            }

            return rxjs.from(initDownloader()).pipe(rxjs.mergeMap(() => {
                ctrlDownloader(render, { acl$, getFilename, getDownloadUrl });
                return rxjs.EMPTY;
            }));
        }),
        rxjs.mergeMap(() => {
            $loader.replaceChildren(createElement(`<img src="${ICON.PLAY}" />`));
            animate($loader, {
                time: 150,
                keyframes: [
                    { transform: "scale(0.7)" },
                    { transform: "scale(1)" },
                ],
            });
            setSeek(0);
            return rxjs.race(
                rxjs.fromEvent($loader, "click").pipe(rxjs.mapTo($loader)),
                rxjs.fromEvent(document, "keydown").pipe(rxjs.filter((e) => e.code === "Space"), rxjs.first()),
            );
        }),
        rxjs.tap(() => {
            setStatus(STATUS_PLAYING);
            animate($control.main, { time: 300, keyframes: slideYIn(5) });
        }),
        rxjs.catchError(ctrlError()),
        rxjs.tap(() => init$.next()),
    ));

    // feature2: player control - volume
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

    // feature3: player control - play/pause
    effect(rxjs.merge(
        rxjs.fromEvent($control.play, "click").pipe(rxjs.mapTo(STATUS_PLAYING)),
        rxjs.fromEvent($control.pause, "click").pipe(rxjs.mapTo(STATUS_PAUSED)),
        rxjs.fromEvent($video, "ended").pipe(rxjs.mapTo(STATUS_PAUSED)),
        rxjs.fromEvent($video, "waiting").pipe(rxjs.mapTo(STATUS_BUFFERING)),
        rxjs.fromEvent($video, "playing").pipe(rxjs.mapTo(STATUS_PLAYING)),
    ).pipe(
        rxjs.skipUntil(init$),
        rxjs.debounceTime(50),
        rxjs.tap(setStatus),
    ));

    // feature4: player control - seek
    effect(rxjs.fromEvent($progress, "click").pipe(
        rxjs.skipUntil(init$),
        rxjs.map((e) => {
            let $progress = e.target;
            if (e.target.classList.contains("progress") === false) {
                $progress = e.target.parentElement;
            }
            const rec = $progress.getBoundingClientRect();
            return (e.clientX - rec.x) / rec.width;
        }),
        rxjs.tap((n) => {
            if (n < 2/100) {
                setStatus(STATUS_PAUSED);
                n = 0;
            }
            setSeek(n * $video.duration, true);
        }),
    ));

    // feature5: render the progress bar
    effect(rxjs.fromEvent($video, "timeupdate").pipe(
        rxjs.skipUntil(init$),
        rxjs.tap(() => setSeek($video.currentTime)),
    ));

    // feature6: render loading buffer
    effect(rxjs.fromEvent($video, "timeupdate").pipe(
        rxjs.skipUntil(init$),
        rxjs.tap(() => {
            const $container = qs($page, `[data-bind="progress-buffer"]`);
            if ($video.buffered.length !== $container.children.length) {
                $container.innerHTML = "";
                for (let i = 0; i < $video.buffered.length; i++) $container.appendChild(createElement(`
                    <div class="progress-buffer"></div>
                `));
            }
            for (let i=0; i<$video.buffered.length; i++) {
                const width = ($video.buffered.end(i) - $video.buffered.start(i)) / $video.duration * 100;
                const left = $video.buffered.start(i) / $video.duration * 100;
                $container.children[i].style.left = left + "%";
                $container.children[i].style.width = width + "%";
            }
        }),
    ));

    // feature7: hint
    effect(rxjs.merge(
        rxjs.fromEvent($progress, "mousemove"),
        rxjs.fromEvent($progress, "mouseleave"),
    ).pipe(
        rxjs.skipUntil(init$),
        rxjs.map((e) => ({
            type: e.type,
            clientX: e.clientX,
            clientWidth: e.target.clientWidth,
            rec: e.target.getBoundingClientRect(),
            duration: $video.duration,
        })),
        rxjs.map(({ type, clientX, clientWidth, rec, duration }) => {
            switch (type) {
            case "mouseleave":
                return { visible: false };
            case "mousemove":
                const width = clientX - rec.x;
                const time = duration * width / rec.width;
                let posX = width;
                posX = Math.max(posX, 30);
                posX = Math.min(posX, clientWidth - 30);
                return { x: `${posX}px`, time, visible: true };
            default:
                assert.fail(`unexpected event: ${type}`);
            }
            return null;
        }),
        rxjs.tap(({ visible, x, time }) => {
            if (!visible) return $hint.classList.add("hidden");
            $hint.classList.remove("hidden");
            $hint.style.left = x;
            $hint.textContent = formatTimecode(time);
        }),
    ));

    // feature8: player control - keyboard shortcut
    effect(rxjs.merge(
        rxjs.fromEvent(document, "keydown").pipe(rxjs.map((e) => e.code)),
        rxjs.fromEvent($video, "click").pipe(rxjs.mapTo("Space")),
    ).pipe(
        rxjs.skipUntil(init$),
        rxjs.tap((code) => {
            switch (code) {
            case "Space":
            case "KeyK":
                setStatus($video.paused ? STATUS_PLAYING : STATUS_PAUSED);
                break;
            case "KeyM":
                setVolume($video.volume > 0 ? 0 : settings_get("volume"));
                break;
            case "ArrowUp":
                setVolume(Math.min($video.volume*100 + 10, 100));
                break;
            case "ArrowDown":
                setVolume(Math.max($video.volume*100 - 10, 0));
                break;
            case "KeyL":
                setSeek(Math.min($video.duration, $video.currentTime + 10), true);
                break;
            case "KeyJ":
                setSeek(Math.max(0, $video.currentTime - 10), true);
                break;
            case "Home":
            case "Digit0":
                setSeek(0, true);
                break;
            case "Digit1":
                setSeek($video.duration / 10, true);
                break;
            case "Digit2":
                setSeek($video.duration * 2 / 10, true);
                break;
            case "Digit3":
                setSeek($video.duration * 3 / 10, true);
                break;
            case "Digit4":
                setSeek($video.duration * 4 / 10, true);
                break;
            case "Digit5":
                setSeek($video.duration * 5 / 10, true);
                break;
            case "Digit6":
                setSeek($video.duration * 6 / 10, true);
                break;
            case "Digit7":
                setSeek($video.duration * 7 / 10, true);
                break;
            case "Digit8":
                setSeek($video.duration * 8 / 10, true);
                break;
            case "Digit9":
                setSeek($video.duration * 9 / 10, true);
                break;
            case "End":
                setSeek($video.duration, true);
                break;
            }
        }),
    ));
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "./application_video.css"),
        loadCSS(import.meta.url, "./component_menubar.css"),
    ]);
}
