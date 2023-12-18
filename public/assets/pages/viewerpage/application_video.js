import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { loadCSS, loadJS } from "../../helpers/loader.js";
import { qs } from "../../lib/dom.js";
import { settings_get, settings_put } from "../../lib/settings.js";
import assert from "../../lib/assert.js";

import Hls from "../../lib/vendor/hlsjs/hls.js";

import ctrlError from "../ctrl_error.js";

import { transition, getDownloadUrl } from "./common.js";

import "../../components/menubar.js";
import "../../components/icon.js";

const STATUS_PLAYING = "PLAYING";
const STATUS_PAUSED = "PAUSED";
const STATUS_BUFFERING = "BUFFERING";

export default function(render, { mime }) {
    if (!Hls.isSupported()) {
        ctrlError()(new Error("browser not supporting hls"));
        return;
    }
    const $page = createElement(`
        <div class="component_videoplayer">
            <component-menubar></component-menubar>
            <div class="video_container">
                <span>
                    <div class="video_screen video-state-pause is-casting-no">
                        <div class="video_wrapper" style="max-height: 819px;">
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
                            <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzZmNmY2ZiIgc3Ryb2tlLXdpZHRoPSIyLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGggZD0iTSA4LjkyODE3MjQsMi41OTk4MDI5IEMgOC4yMjE2MTQ5LDIuMTUzMjg3MyA3LjA3MjExNDMsMi4zOTIwOTE4IDcuMDcxODI3NywzLjQwMDE5NzEgbCAtMC4wMDQ4OSwxNy4yMDUwNDU5IGMgLTIuODg5ZS00LDEuMDE1NzE1IDEuMjEyMTk3OSwxLjE2MDM3MiAxLjg2NjEzMDcsMC43ODk1MTMgQyAyMy45NzU3NCw4LjcyODk4NTYgMjMuOTMwMTUyLDE0LjEwNDQ2MyA4LjkyODE1ODQsMi41OTk4MDI5IFoiIC8+Cjwvc3ZnPgo=" alt="play">
                            <img class="component_icon hidden" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgZmlsbD0iIzZmNmY2ZiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNIDMyMCw4MS45ODc4NjggViA0MjcuNzY5MzEgYyAwLDkuMzQzMzYgNy42NDQ2LDE2Ljk4Nzg4IDE2Ljk4NzksMTYuOTg3ODggaCAyNS45NzU3IGMgOS4zNDMzLDAgMTYuOTg3OCwtNy42NDQ1MiAxNi45ODc4LC0xNi45ODc4OCBWIDgxLjk4Nzg2OCBDIDM3OS45NTE0LDcyLjY0NDUzNiAzNzIuMzA2OSw2NSAzNjIuOTYzNiw2NSBIIDMzNi45ODc5IEMgMzI3LjY0NDYsNjUgMzIwLDcyLjY0NDUzNiAzMjAsODEuOTg3ODY4IFoiIC8+CiAgPHBhdGggZD0iTSAxNTAsODEuOTg3ODY4IFYgNDI3Ljc2OTMxIGMgMCw5LjM0MzM2IDcuNjQ0NTUsMTYuOTg3ODggMTYuOTg3NzksMTYuOTg3ODggaCAyNS45NzU1MiBjIDkuMzQzMjQsMCAxNi45ODc2OSwtNy42NDQ1MiAxNi45ODc2OSwtMTYuOTg3ODggViA4MS45ODc4NjggQyAyMDkuOTUxLDcyLjY0NDUzNiAyMDIuMzA2NTUsNjUgMTkyLjk2MzMxLDY1IEggMTY2Ljk4Nzc5IEMgMTU3LjY0NDU1LDY1IDE1MCw3Mi42NDQ1MzYgMTUwLDgxLjk4Nzg2OCBaIiAvPgo8L3N2Zz4K" alt="pause">
                            <component-icon name="loading" class="hidden"></component-icon>

                            <img class="component_icon hidden" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzZmNmY2ZiIgc3Ryb2tlLXdpZHRoPSIyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxwYXRoIGQ9Im0gMjEuOTgzODgzLDE0Ljg4Mzg4MyAtNiwtNS45OTk5OTk1IG0gNiwwIC02LDUuOTk5OTk5NSIgLz4KICA8cGF0aCBkPSJNIDEuMTI1MzM1NiwxNS4yMTc4OTcgViA4Ljc4MTAzMjggYyAwLC0wLjYyNDIyMDUgMC40ODcxOTY3LC0xLjEzMDk5MTcgMS4wODc0OTIzLC0xLjEzMDk5MTcgSCA2LjExMjU3NDggQSAxLjA2NTc0MjIsMS4wNjU3NDIyIDAgMCAwIDYuODgxNDMxOCw3LjMxODM1NjIgTCAxMC4xNDM5MDksMy42MzM5MzI4IGMgMC42ODUxMiwtMC43MTMzOTUgMS44NTYzNDUsLTAuMjA3NzExMSAxLjg1NjM0NSwwLjgwMDM5NDIgdiAxNS4xMzEzNjggYyAwLDEuMDE1NzE1IC0xLjE4NTM2MiwxLjUxNzA0NSAtMS44NjYxMzEsMC43ODk1MTMgTCA2Ljg4MjUxOSwxNi42OTE0NSBBIDEuMDY1NzQyMiwxLjA2NTc0MjIgMCAwIDAgNi4xMDM4NzQ4LDE2LjM0OTk3NSBIIDIuMjEyODI3OSBjIC0wLjYwMDI5NTYsMCAtMS4wODc0OTIzLC0wLjUwNjc2OCAtMS4wODc0OTIzLC0xLjEzMjA3OCB6IiAvPgo8L3N2Zz4K" alt="volume_mute">
                            <img class="component_icon hidden" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzZmNmY2ZiIgc3Ryb2tlLXdpZHRoPSIyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxwYXRoIGQ9Im0gMTYuMzUwMjI1LDguMTkzNzg3IGMgMS40NDk2MjYsMS45MzM1NTkgMS40NDk2MjYsNS42Nzg4ODQgMCw3LjYxMjQ0NiIgLz4KICA8cGF0aCBkPSJNIDEuMTI1MzM1NiwxNS4yMTc4OTcgViA4Ljc4MTAzMjggYyAwLC0wLjYyNDIyMDUgMC40ODcxOTY3LC0xLjEzMDk5MTcgMS4wODc0OTIzLC0xLjEzMDk5MTcgSCA2LjExMjU3NDggQSAxLjA2NTc0MjIsMS4wNjU3NDIyIDAgMCAwIDYuODgxNDMxOCw3LjMxODM1NjIgTCAxMC4xNDM5MDksMy42MzM5MzI4IGMgMC42ODUxMiwtMC43MTMzOTUgMS44NTYzNDUsLTAuMjA3NzExMSAxLjg1NjM0NSwwLjgwMDM5NDIgdiAxNS4xMzEzNjggYyAwLDEuMDE1NzE1IC0xLjE4NTM2MiwxLjUxNzA0NSAtMS44NjYxMzEsMC43ODk1MTMgTCA2Ljg4MjUxOSwxNi42OTE0NSBBIDEuMDY1NzQyMiwxLjA2NTc0MjIgMCAwIDAgNi4xMDM4NzQ4LDE2LjM0OTk3NSBIIDIuMjEyODI3OSBjIC0wLjYwMDI5NTYsMCAtMS4wODc0OTIzLC0wLjUwNjc2OCAtMS4wODc0OTIzLC0xLjEzMjA3OCB6IiAvPgo8L3N2Zz4K" alt="volume_low">
                            <img class="component_icon hidden" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzZmNmY2ZiIgc3Ryb2tlLXdpZHRoPSIyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxwYXRoIGQ9Im0gMTYuMzUwMjI1LDguMTkzNzg3IGMgMS40NDk2MjYsMS45MzM1NTkgMS40NDk2MjYsNS42Nzg4ODQgMCw3LjYxMjQ0NiIgLz4KICA8cGF0aCBkPSJtIDE5LjYxMjcwMyw0LjM4NzU2NDQgYyA0LjMzNjkxOSw0LjE0MTE3MDQgNC4zNjMwMTQsMTEuMTEwOTA4NiAwLDE1LjIyNDg4NzYiIC8+CiAgPHBhdGggZD0iTSAxLjEyNTMzNTYsMTUuMjE3ODk3IFYgOC43ODEwMzI4IGMgMCwtMC42MjQyMjA1IDAuNDg3MTk2NywtMS4xMzA5OTE3IDEuMDg3NDkyMywtMS4xMzA5OTE3IEggNi4xMTI1NzQ4IEEgMS4wNjU3NDIyLDEuMDY1NzQyMiAwIDAgMCA2Ljg4MTQzMTgsNy4zMTgzNTYyIEwgMTAuMTQzOTA5LDMuNjMzOTMyOCBjIDAuNjg1MTIsLTAuNzEzMzk1IDEuODU2MzQ1LC0wLjIwNzcxMTEgMS44NTYzNDUsMC44MDAzOTQyIHYgMTUuMTMxMzY4IGMgMCwxLjAxNTcxNSAtMS4xODUzNjIsMS41MTcwNDUgLTEuODY2MTMxLDAuNzg5NTEzIEwgNi44ODI1MTksMTYuNjkxNDUgQSAxLjA2NTc0MjIsMS4wNjU3NDIyIDAgMCAwIDYuMTAzODc0OCwxNi4zNDk5NzUgSCAyLjIxMjgyNzkgYyAtMC42MDAyOTU2LDAgLTEuMDg3NDkyMywtMC41MDY3NjggLTEuMDg3NDkyMywtMS4xMzIwNzggeiIgLz4KPC9zdmc+Cg==" alt="volume">
                            <input type="range" min="0" max="100" value="13">
                            <span class="timecode">
                                <div class="current"></div>
                                <div class="hint hidden"></div>
                            </span>
                        </div>
                    </div>
                </span>

                <div class="component_pager">
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
        switch(status) {
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
    const setSeek = (newTime, shouldSet = false)  => {
        if (shouldSet) $video.currentTime = newTime;
        const width = 100 * (newTime / $video.duration)
        qs($page, ".progress .progress-active").style.width = `${width}%`;
        if (!isNaN($video.duration)) {
            qs($page, ".timecode .current").textContent = formatTimecode($video.currentTime) + " / " + formatTimecode($video.duration);
        }
    };

    // feature1: setup the dom
    const setup$ = rxjs.of(null).pipe(
        rxjs.tap(() => {
            const hls = new Hls();
            const sources = window.overrides["video-map-sources"]([{
                src: getDownloadUrl(),
                type: mime,
            }]);
            for (let i=0; i<sources.length; i++) {
                hls.loadSource(sources[i].src, sources[i].type);
            }
            hls.attachMedia($video);
        }),
        rxjs.mergeMap(() => rxjs.fromEvent($video, "loadeddata")),
        rxjs.tap(() => {
            qs($page, ".loader").classList.add("hidden");
            qs($page, ".videoplayer_control").classList.remove("hidden");
            setSeek(0);
        }),
        rxjs.share(),
    );
    effect(setup$);
    effect(setup$.pipe(rxjs.mergeMap(() => rxjs.fromEvent($video, "error").pipe(rxjs.tap(() => {
        console.error(err);
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
    ))
    effect(setup$.pipe(
        rxjs.switchMap(() => rxjs.fromEvent(qs($page, ".progress"), "mouseleave")),
        rxjs.tap(() => $hint.classList.add("hidden")),
    ));

    // feature5: player control - seek
    effect(setup$.pipe(
        rxjs.switchMap(() => rxjs.fromEvent(qs($page, ".progress"), "click").pipe(
            rxjs.map((e) => {
                let $progress = e.target;
                if (e.target.classList.contains("progress") == false) {
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
        rxjs.switchMap(() => rxjs.fromEvent(document, "keydown").pipe(rxjs.map((e) => e.code))),
        rxjs.tap((code) => {
            switch(code) {
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
            if ($video.buffered.length !== $container.children.length ) {
                console.log("RESET");
                $container.innerHTML = "";
                const $fragment = document.createDocumentFragment();
                Array.apply(null, { length: $video.buffered.length })
                    .map(() => $fragment.appendChild(createElement(`
                        <div className="progress-buffer" style=""></div>
                    `)));
                $container.appendChild($fragment);
            }

            for (let i=0;i<$video.buffered.length;i++) {
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
    ]).then(async () => {
        if (typeof window.overrides["video-map-sources"] !== "function") window.overrides["video-map-sources"] = (s) => (s);
    });
}

function formatTimecode(seconds) {
    return String(parseInt(seconds / 60)).padStart(2, "0") +
        ":"+
        String(parseInt(seconds % 60)).padStart(2, "0");
}
