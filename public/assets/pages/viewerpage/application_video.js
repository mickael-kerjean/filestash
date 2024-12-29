import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { animate, slideYIn } from "../../lib/animate.js";
import { loadCSS, loadJS } from "../../helpers/loader.js";
import { qs, qsa } from "../../lib/dom.js";
import { settings_get, settings_put } from "../../lib/settings.js";
import { ApplicationError } from "../../lib/error.js";
import assert from "../../lib/assert.js";
import Hls from "../../lib/vendor/hlsjs/hls.js";

import ctrlError from "../ctrl_error.js";

import { transition } from "./common.js";
import { formatTimecode } from "./common_player.js";
import { ICON } from "./common_icon.js";
import { renderMenubar, buttonDownload, buttonFullscreen } from "./component_menubar.js";

import "../../components/icon.js";

const STATUS_PLAYING = "PLAYING";
const STATUS_PAUSED = "PAUSED";
const STATUS_BUFFERING = "BUFFERING";

export default function(render, { mime, getFilename, getDownloadUrl }) {
    const $page = createElement(`
        <div class="component_videoplayer">
            <component-menubar filename="${getFilename()}"></component-menubar>
            <div class="video_container">
                <span>
                    <div class="video_screen video-state-pause is-casting-no">
                        <div class="video_wrapper">
                            <video></video>
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

                <div class="component_pager hidden">
                    <div class="wrapper no-select">
                        <span>
                            <a href="/view/Videos/Animation Movie.webm">
                                <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPHBhdGggc3R5bGU9ImZpbGw6I2YyZjJmMjtmaWxsLW9wYWNpdHk6MTtzdHJva2Utd2lkdGg6MS41MTE4MTEwMjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZSIgZD0ibSAxNiw3LjE2IC00LjU4LDQuNTkgNC41OCw0LjU5IC0xLjQxLDEuNDEgLTYsLTYgNiwtNiB6IiAvPgogIDxwYXRoIGZpbGw9Im5vbmUiIGQ9Ik0wLS4yNWgyNHYyNEgweiIgLz4KPC9zdmc+Cg==" alt="arrow_left_white">
                            </a>
                            <label class="pager">
                                <form>
                                    <input class="prevent" type="number" value="1" style="width: 12px;">
                                </form>
                                <span class="separator">/</span>
                                <span>3</span>
                            </label>
                            <a href="/view/Videos/Animation Movie 2.webm">
                              <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPHBhdGggc3R5bGU9ImZpbGw6I2YyZjJmMjtmaWxsLW9wYWNpdHk6MTtzdHJva2Utd2lkdGg6MS41MTE4MTEwMjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZSIgZD0iTTguNTkgMTYuMzRsNC41OC00LjU5LTQuNTgtNC41OUwxMCA1Ljc1bDYgNi02IDZ6IiAvPgogIDxwYXRoIGZpbGw9Im5vbmUiIGQ9Ik0wLS4yNWgyNHYyNEgweiIgLz4KPC9zdmc+Cg==" alt="arrow_right_white">
                            </a>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `);
    render($page);
    renderMenubar(
        qs($page, "component-menubar"),
        buttonDownload(getFilename(), getDownloadUrl()),
        buttonFullscreen(qs($page, "video")),
    );
    transition(qs($page, ".video_container"));

    const $video = qs($page, "video");
    const $control = {
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
    const setup$ = rxjs.of(null).pipe(
        rxjs.map(() => {
            const loadPolicy = { default: { maxLoadTimeMs: 3600000, maxTimeToFirstByteMs: Infinity, timeoutRetry: { maxNumRetry: 0 } } };
            const hls = new Hls({
                debug: !!new URLSearchParams(location.search).get("debug"),
                manifestLoadPolicy: loadPolicy,
            });
            const sources = window.overrides["video-map-sources"]([{
                src: getDownloadUrl(),
                type: mime,
            }]);
            for (let i=0; i<sources.length; i++) {
                if (sources[i].type !== "application/x-mpegURL") {
                    const $source = document.createElement("source");
                    $source.setAttribute("type", "video/mp4");
                    $source.setAttribute("src", sources[i].src);
                    $video.appendChild($source);
                    return [{ ...sources[i], type: "video/mp4" }];
                }
                hls.loadSource(sources[i].src);
            }
            hls.attachMedia($video);
            return sources;
        }),
        rxjs.mergeMap((sources) => rxjs.merge(
            rxjs.fromEvent($video, "loadeddata"),
            ...[...qsa($page, "source")].map(($source) => rxjs.fromEvent($source, "error").pipe(rxjs.tap(() => {
                throw new ApplicationError("NOT_SUPPORTED", JSON.stringify({ mime, sources }, null, 2));
            }))),
        )),
        rxjs.mergeMap(() => {
            const $loader = qs($page, ".loader");
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
            ).pipe(rxjs.mapTo($loader));
        }),
        rxjs.tap(($loader) => {
            $loader.classList.add("hidden");
            const $control = qs($page, ".videoplayer_control");
            $control.classList.remove("hidden");
            animate($control, { time: 300, keyframes: slideYIn(5) });
            setStatus(STATUS_PLAYING);
        }),
        rxjs.catchError(ctrlError()),
        rxjs.share(),
    );
    effect(setup$);
    effect(setup$.pipe(rxjs.mergeMap(() => rxjs.fromEvent($video, "error").pipe(rxjs.tap(() => {
        // console.error(err);
        // notify.send(t("Not supported"), "error");
        // setIsPlaying(false);
        // setIsLoading(false);
    })))));

    // feature2: player control - volume
    effect(setup$.pipe(
        rxjs.switchMap(() => rxjs.fromEvent($volume.range, "input").pipe(rxjs.map((e) => e.target.value))),
        rxjs.startWith(settings_get("volume") === null ? 80 : settings_get("volume")),
        rxjs.tap((volume) => setVolume(parseInt(volume))),
    ));

    // feature3: player control - play/pause
    effect(setup$.pipe(
        rxjs.mergeMap(() => rxjs.merge(
            rxjs.fromEvent($control.play, "click").pipe(rxjs.mapTo(STATUS_PLAYING)),
            rxjs.fromEvent($control.pause, "click").pipe(rxjs.mapTo(STATUS_PAUSED)),
            rxjs.fromEvent($video, "ended").pipe(rxjs.mapTo(STATUS_PAUSED)),
            rxjs.fromEvent($video, "waiting").pipe(rxjs.mapTo(STATUS_BUFFERING)),
            rxjs.fromEvent($video, "playing").pipe(rxjs.mapTo(STATUS_PLAYING)),
        )),
        rxjs.debounceTime(50),
        rxjs.tap((status) => setStatus(status)),
    ));

    // feature4: hint
    const $hint = qs($page, `.hint`);
    effect(setup$.pipe(
        rxjs.switchMap(() => rxjs.fromEvent(qs($page, ".progress"), "mousemove")),
        rxjs.map((e) => {
            const rec = e.target.getBoundingClientRect();
            const width = e.clientX - rec.x;
            const time = $video.duration * width / rec.width;
            let posX = width;
            posX = Math.max(posX, 30);
            posX = Math.min(posX, e.target.clientWidth - 30);
            return { x: `${posX}px`, time };
        }),
        rxjs.tap(({ x, time }) => {
            $hint.classList.remove("hidden");
            $hint.style.left = x;
            $hint.textContent = formatTimecode(time);
        }),
    ));
    effect(setup$.pipe(
        rxjs.switchMap(() => rxjs.fromEvent(qs($page, ".progress"), "mouseleave")),
        rxjs.tap(() => $hint.classList.add("hidden")),
    ));

    // feature5: player control - seek
    effect(setup$.pipe(
        rxjs.switchMap(() => rxjs.fromEvent(qs($page, ".progress"), "click").pipe(
            rxjs.map((e) => { // TODO: use onClick instead?
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
        )),
    ));

    // feature6: player control - keyboard shortcut
    effect(setup$.pipe(
        rxjs.switchMap(() => rxjs.merge(
            rxjs.fromEvent(document, "keydown").pipe(rxjs.map((e) => e.code)),
            rxjs.fromEvent($video, "click").pipe(rxjs.mapTo("Space")),
        )),
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
            case "KeyF":
                // TODO
                break;
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
            }
        }),
    ));

    // feature7: render the progress bar
    effect(setup$.pipe(
        rxjs.mergeMap(() => rxjs.fromEvent($video, "timeupdate")),
        rxjs.tap(() => setSeek($video.currentTime)),
    ));

    // feature8: render loading buffer
    effect(setup$.pipe(
        rxjs.mergeMap(() => rxjs.fromEvent($video, "timeupdate")),
        rxjs.tap(() => {
            const calcWidth = (i) => {
                return ($video.buffered.end(i) - $video.buffered.start(i)) / $video.duration * 100;
            };
            const calcLeft = (i) => {
                return $video.buffered.start(i) / $video.duration * 100;
            };
            const $container = qs($page, `[data-bind="progress-buffer"]`);
            if ($video.buffered.length !== $container.children.length) {
                $container.innerHTML = "";
                const $fragment = document.createDocumentFragment();
                Array.from({ length: $video.buffered.length })
                    .map(() => $fragment.appendChild(createElement(`
                        <div className="progress-buffer" style=""></div>
                    `)));
                $container.appendChild($fragment);
            }
            for (let i=0; i<$video.buffered.length; i++) {
                $container.children[i].style.left = calcLeft(i) + "%";
                $container.children[i].style.width = calcWidth(i) + "%";
            }
        }),
    ));
}

export function init() {
    if (!window.overrides) window.overrides = {};
    return Promise.all([
        loadCSS(import.meta.url, "./application_video.css"),
        loadCSS(import.meta.url, "./component_pager.css"),
        loadJS(import.meta.url, "/overrides/video-transcoder.js"),
    ]).then(async() => {
        if (typeof window.overrides["video-map-sources"] !== "function") window.overrides["video-map-sources"] = (s) => (s);
    });
}
