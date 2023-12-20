import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, onClick } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { onDestroy } from "../../lib/skeleton/lifecycle.js";
import { loadCSS, loadJS } from "../../helpers/loader.js";
import { settings_get, settings_put } from "../../lib/settings.js";

import ctrlError from "../ctrl_error.js";

import { ICON } from "./common_icon.js";
import { transition, getDownloadUrl } from "./common.js";

import "../../components/menubar.js";

const STATUS_PLAYING = "PLAYING";
const STATUS_PAUSED = "PAUSED";
const STATUS_BUFFERING = "BUFFERING";

export default function(render) {
    const $page = createElement(`
        <div class="component_audioplayer">
            <component-menubar></component-menubar>
            <div class="audioplayer_container">
                <div class="audioplayer_box">
                    <div data-bind="loader" class="hidde">
                        <div class="audioplayer_loader" style="width: 31%;"></div>
                        <span class="percent">31%</span>
                        <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB3aWR0aD0nMTIwcHgnIGhlaWdodD0nMTIwcHgnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIiBjbGFzcz0idWlsLXJpbmctYWx0Ij4KICA8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0ibm9uZSIgY2xhc3M9ImJrIj48L3JlY3Q+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIHN0cm9rZT0ibm9uZSIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48L2NpcmNsZT4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgc3Ryb2tlPSIjNmY2ZjZmIiBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+CiAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJzdHJva2UtZGFzaG9mZnNldCIgZHVyPSIycyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIGZyb209IjAiIHRvPSI1MDIiPjwvYW5pbWF0ZT4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9InN0cm9rZS1kYXNoYXJyYXkiIGR1cj0iMnMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIiB2YWx1ZXM9IjE1MC42IDEwMC40OzEgMjUwOzE1MC42IDEwMC40Ij48L2FuaW1hdGU+CiAgPC9jaXJjbGU+Cjwvc3ZnPgo=" alt="loading">
                    </div>
                    <div id="waveform"></div>
                    <div class="audioplayer_control" style="opacity: 1;">
                        <div class="buttons no-select">
                            <span>
                                <img class="component_icon" draggable="false" src="${ICON.PLAY}" alt="play">
                                <img class="component_icon hidden" draggable="false" src="${ICON.PAUSE}" alt="pause">
                            </span>
                            <span>
                                <img class="component_icon" draggable="false" src="${ICON.VOLUME_NORMAL}" alt="volume">
                            </span>
                            <input type="range" min="0" max="100" value="52">
                        </div>
                        <div class="timecode">
                            <span id="currentTime">00:00</span>
                            <span id="separator" class="no-select">/</span>
                            <span id="totalDuration">02:13</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
    render($page);
    transition(qs($page, ".audioplayer_box"));

    const $control = {
        play: qs($page, `.audioplayer_control [alt="play"]`),
        pause: qs($page, `.audioplayer_control [alt="pause"]`),
        // loading: qs($page, `.audioplayer_control component-icon[name="loading"]`),
    };
    const $volume = {
        range: qs($page, `input[type="range"]`),
        // icon_mute: qs($page, `img[alt="volume_mute"]`),
        // icon_low: qs($page, `img[alt="volume_low"]`),
        // icon_normal: qs($page, `img[alt="volume"]`),
    };
    const setVolume = (volume, wavesurfer) => {
        wavesurfer.setVolume(volume / 100);
    };
    const currentTime$ = new rxjs.BehaviorSubject([
        0, // time of lastSeek: we want to start from the start
        0, // seek offset to align with wavesurfer currentTime in the audiocontext
    ]);

    // feature1: setup the dom
    const setup$ = rxjs.of(qs($page, "#waveform")).pipe(
        rxjs.mergeMap(($node) => Promise.resolve(WaveSurfer.create({
            container: $node,
            interact: false,

            waveColor: "#323639",
            progressColor: "#808080",
            cursorColor: "#6f6f6f",
            cursorWidth: 3,
            height: 200,
            barWidth: 1,
        }))),
        rxjs.tap((wavesurfer) => {
            window.audio = wavesurfer; // TODO: remove
            wavesurfer.load(getDownloadUrl());
            wavesurfer.on("error", (err) => {
                throw new Error(err)
            });
        }),
        rxjs.tap((wavesurfer) => onDestroy(() => wavesurfer.destroy())),
        rxjs.catchError(ctrlError()),
        rxjs.shareReplay(1),
    );
    effect(setup$);

    // feature2: loading animation
    effect(setup$.pipe(
        rxjs.mergeMap((wavesurfer) => new rxjs.Observable((observer) => {
            wavesurfer.on("loading", (n) => observer.next(n));
            wavesurfer.on("ready", () => observer.next(100));
        })),
        rxjs.mergeMap((n) => {
            const $loader = qs($page, `[data-bind="loader"]`);
            $loader.querySelector(".audioplayer_loader").style.width = `${n}%`;
            $loader.querySelector(".percent").textContent = `${n}%`;
            if (n !== 100) return rxjs.EMPTY;
            return rxjs.of(null).pipe(
                rxjs.delay(200),
                rxjs.tap(() => $loader.classList.add("hidden")),
            );
        }),
    ));

    // feature3: prepare the data source
    const ready$ = setup$.pipe(
        rxjs.mergeMap((wavesurfer) => new rxjs.Observable((observer) => {
            wavesurfer.on("ready", () => observer.next(wavesurfer));
        })),
        rxjs.share(),
    )
    effect(ready$.pipe(rxjs.tap((wavesurfer) => {
        wavesurfer.backend.createSource();
        wavesurfer.backend.startPosition = 0;
        wavesurfer.backend.lastPlay = 0;
        wavesurfer.backend.source.start(0, 0);
    })));

    // feature: player control - volume
    effect(setup$.pipe(
        rxjs.switchMap(() => rxjs.fromEvent($volume.range, "input").pipe(rxjs.map((e) => e.target.value))),
        rxjs.startWith(settings_get("volume") === null ? 80 : settings_get("volume")),
        rxjs.mergeMap((volume) => setup$.pipe(rxjs.tap((wavesurfer) => setVolume(volume, wavesurfer)))),
    ));

    // feature: player control - seek
    effect(setup$.pipe(
        rxjs.mergeMap((wavesurfer) => rxjs.fromEvent(qs($page, "#waveform"), "click").pipe(
            rxjs.map((e) => ({ e, wavesurfer })),
        )),
        rxjs.map(({ e, wavesurfer }) => {
            const rec = e.target.getBoundingClientRect();
            return { wavesurfer, progress: (e.clientX - rec.x) / rec.width };
        }),
        rxjs.tap(({ progress, wavesurfer }) => {
            wavesurfer.drawer.progress(progress);

            const newTime = wavesurfer.getDuration() * progress;

            currentTime$.next([newTime, wavesurfer.backend.ac.currentTime]);
            wavesurfer.backend.source.stop(0);
            wavesurfer.backend.disconnectSource();
            wavesurfer.backend.createSource();
            wavesurfer.backend.startPosition = newTime;
            wavesurfer.backend.source.start(0, newTime);
        }),
    ));

    // feature4: time progression
    effect(ready$.pipe(
        rxjs.mergeMap(() => rxjs.merge(
            onClick($control.play).pipe(rxjs.mapTo(STATUS_PLAYING)),
            onClick($control.pause).pipe(rxjs.mapTo(STATUS_PAUSED)),
        )),
        rxjs.mergeMap((status) => setup$.pipe(rxjs.tap((wavesurfer) => {
            switch (status) {
            case STATUS_PLAYING:
                wavesurfer.backend.ac.resume();
                $control.play.classList.add("hidden");
                $control.pause.classList.remove("hidden");
                break;
            case STATUS_PAUSED:
                wavesurfer.backend.ac.suspend();
                $control.play.classList.remove("hidden");
                $control.pause.classList.add("hidden");
                break;
            default:
                throw new Error("Unknown state");
            }
        }))),
        rxjs.switchMap((wavesurfer) => rxjs.animationFrames().pipe(
            rxjs.tap(() => {
                const percent = (currentTime$.value[0] + (wavesurfer.backend.ac.currentTime - currentTime$.value[1])) / wavesurfer.getDuration();
                if (percent > 1) return;
                wavesurfer.drawer.progress(percent);
            }),
        )),
    ));
}

export function init() {
    return Promise.all([
        loadJS(import.meta.url, "../../lib/vendor/wavesurfer.js"),
        loadCSS(import.meta.url, "./application_audio.css"),
    ]);
}
