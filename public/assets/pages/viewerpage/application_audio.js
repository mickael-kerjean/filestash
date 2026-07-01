import { createElement, onDestroy } from "../../lib/skeleton/index.js";
import { toHref } from "../../lib/skeleton/router.js";
import rxjs, { effect, onClick } from "../../lib/rx.js";
import { qs, safe } from "../../lib/dom.js";
import { ApplicationError } from "../../lib/error.js";
import { loadCSS, loadJS } from "../../helpers/loader.js";
import { settings_get, settings_put } from "../../lib/settings.js";
import chromecast from "../../lib/chromecast.js";
import assert from "../../lib/assert.js";

import { getSession } from "../../model/session.js";
import { get as getConfig } from "../../model/config.js";

import ctrlError from "../ctrl_error.js";
import { renderMenubar, buttonDownload } from "./component_menubar.js";

import { ICON } from "./common_icon.js";
import { formatTimecode } from "./common_player.js";
import { transition } from "./common.js";

const STATUS_PLAYING = "PLAYING";
const STATUS_PAUSED = "PAUSED";
const STATUS_BUFFERING = "BUFFERING";
const STATUS_IDLE = "IDLE";

class IPlayer {
    play() { throw new Error("NOT_IMPLEMENTED"); }
    pause() { throw new Error("NOT_IMPLEMENTED"); }
    setVolume(volume) { throw new Error("NOT_IMPLEMENTED"); }
    setSeek(position) { throw new Error("NOT_IMPLEMENTED"); }
}

export default function(render, { getFilename, getDownloadUrl }) {
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
                    <div id="waveform"></div>
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
                            <span id="totalDuration">02:13</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
    render($page);
    transition(qs($page, ".audioplayer_box"));
    const $menubar = renderMenubar(
        qs($page, "component-menubar"),
        buttonDownload(getDownloadUrl()),
    );

    const $control = {
        main: qs($page, `.audioplayer_control`),
        play: qs($page, `.audioplayer_control [alt="play"]`),
        pause: qs($page, `.audioplayer_control [alt="pause"]`),
        loading: qs($page, `.audioplayer_control component-icon[name="loading"]`),
    };
    const $volume = {
        range: qs($page, `input[type="range"]`),
        icon_mute: qs($page, `img[alt="volume_mute"]`),
        icon_low: qs($page, `img[alt="volume_low"]`),
        icon_normal: qs($page, `img[alt="volume"]`),
    };
    const currentTime$ = new rxjs.BehaviorSubject([
        0, // starting time - does change when seeking to another point
        0, // offset to align the audio context currentTime. otherwise when seeking, the
        // wavesurfer currentTime keep growing and progress bar goes haywire
    ]);
    const currentTime = (wavesurfer) => {
        return currentTime$.value[0] + (wavesurfer.backend.ac.currentTime - currentTime$.value[1]);
    };
    const setVolume = (volume, player) => {
        settings_put("volume", volume);
        if (player) player.setVolume(volume);
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
    const setStatus = (status, player) => {
        switch (status) {
        case STATUS_PLAYING:
            $control.play.classList.add("hidden");
            $control.pause.classList.remove("hidden");
            $control.loading.classList.add("hidden");
            if (player) player.play();
            break;
        case STATUS_PAUSED:
            $control.play.classList.remove("hidden");
            $control.pause.classList.add("hidden");
            $control.loading.classList.add("hidden");
            if (player) player.pause();
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
    const setSeek = (newTime, wavesurfer, player) => {
        if (player) player.setSeek(newTime);
        currentTime$.next([newTime, wavesurfer.backend.ac.currentTime]);
    };

    // feature1: setup the dom
    const setup$ = rxjs.of(qs($page, "#waveform")).pipe(
        rxjs.mergeMap(($node) => Promise.resolve(window.WaveSurfer.create({
            container: $node,
            interact: false,
            waveColor: "#323639",
            progressColor: "#808080",
            cursorColor: "#6f6f6f",
            cursorWidth: 3,
            height: 200,
            barWidth: 1,
        }))),
        rxjs.tap((ws) => window.wavesurfer = ws),
        rxjs.shareReplay(1),
    );
    effect(setup$.pipe(
        rxjs.mergeMap((wavesurfer) => new Promise((resolve, reject) => {
            wavesurfer.load(getDownloadUrl());
            wavesurfer.on("error", (err) => reject(new ApplicationError(err)));
            wavesurfer.on("ready", () => {
                $control.main.classList.remove("hidden");
                qs($control.main, "#totalDuration").textContent = formatTimecode(wavesurfer.getDuration());
                resolve(null);
            });
            onDestroy(() => wavesurfer.destroy());
        })),
        rxjs.catchError(ctrlError()),
    ));

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

    // feature3: connect the audio
    const ready$ = setup$.pipe(
        rxjs.mergeMap((wavesurfer) => new rxjs.Observable((observer) => {
            wavesurfer.on("ready", () => observer.next(wavesurfer));
        })),
        rxjs.share(),
    );
    effect(ready$.pipe(rxjs.tap((wavesurfer) => {
        wavesurfer.backend.createSource();
        wavesurfer.backend.source.start(0, 0);
        wavesurfer.backend.ac.suspend();
        currentTime$.next([0, wavesurfer.backend.ac.currentTime]);
    })));

    // feature4: hint of song progress
    effect(setup$.pipe(
        rxjs.mergeMap(() => rxjs.merge(
            onClick($control.play).pipe(rxjs.mapTo(STATUS_PLAYING)),
            rxjs.fromEvent(document, "keydown").pipe(rxjs.mapTo(STATUS_PLAYING)),
        )),
        rxjs.first(),
        rxjs.mergeMap((status) => setup$.pipe(rxjs.tap((wavesurfer) => setStatus(status, resolvePlayer(wavesurfer))))),
        rxjs.switchMap((wavesurfer) => rxjs.animationFrames().pipe(rxjs.tap(() => {
            const _currentTime = currentTime(wavesurfer);
            const percent = _currentTime / wavesurfer.getDuration();
            if (percent > 1) return;
            wavesurfer.drawer.progress(percent);
            qs($control.main, "#currentTime").textContent = formatTimecode(_currentTime);
        }))),
    ));

    // feature5: player control - play / pause
    effect(setup$.pipe(
        rxjs.mergeMap((wavesurfer) => rxjs.merge(
            onClick($control.play).pipe(rxjs.mapTo(STATUS_PLAYING)),
            onClick($control.pause).pipe(rxjs.mapTo(STATUS_PAUSED)),
        ).pipe(
            rxjs.tap((status) => setStatus(status, resolvePlayer(wavesurfer))),
        )),
    ));

    // feature6: player control - volume
    effect(setup$.pipe(
        rxjs.switchMap((wavesurfer) => rxjs.fromEvent($volume.range, "input").pipe(rxjs.map((e) => e.target.value))),
        rxjs.startWith(settings_get("volume") === null ? 80 : settings_get("volume")),
        rxjs.mergeMap((volume) => setup$.pipe(rxjs.tap((wavesurfer) => setVolume(parseInt(volume), resolvePlayer(wavesurfer))))),
    ));

    // feature7: player control - seek
    effect(ready$.pipe(
        rxjs.mergeMap((wavesurfer) => rxjs.fromEvent(qs($page, "#waveform"), "click").pipe(
            rxjs.map((e) => ({ e, wavesurfer })),
        )),
        rxjs.map(({ e, wavesurfer }) => {
            const rec = e.target.closest("#waveform").getBoundingClientRect();
            return { wavesurfer, progress: (e.clientX - rec.x) / rec.width };
        }),
        rxjs.tap(({ progress, wavesurfer }) => {
            wavesurfer.drawer.progress(progress);
            const newTime = wavesurfer.getDuration() * progress;
            setSeek(newTime, wavesurfer, resolvePlayer(wavesurfer));
        }),
    ));

    // feature8: player control - keyboard shortcut
    effect(ready$.pipe(
        rxjs.switchMap((wavesurfer) => rxjs.fromEvent(document, "keydown").pipe(
            rxjs.map((e) => e.code),
            rxjs.tap((code) => {
                const player = resolvePlayer(wavesurfer);
                switch (code) {
                case "Space":
                case "KeyK":
                    setStatus(
                        wavesurfer.backend.ac.state === "suspended"
                            ? STATUS_PLAYING
                            : STATUS_PAUSED,
                        player,
                    );
                    break;
                case "KeyM":
                    setVolume(wavesurfer.getVolume() > 0 ? 0 : settings_get("volume"), wavesurfer, player);
                    break;
                case "ArrowUp":
                    setVolume(Math.min(wavesurfer.getVolume()*100 + 10, 100), wavesurfer, player);
                    break;
                case "ArrowDown":
                    setVolume(Math.max(wavesurfer.getVolume()*100 - 10, 0), wavesurfer, player);
                    break;
                case "KeyL":
                    setSeek(Math.min(wavesurfer.getDuration(), currentTime(wavesurfer) + 10), wavesurfer, player);
                    break;
                case "KeyJ":
                    setSeek(Math.max(0, currentTime(wavesurfer) - 10), wavesurfer, player);
                    break;
                case "Digit0":
                    setSeek(0, wavesurfer, player);
                    break;
                case "Digit1":
                    setSeek(wavesurfer.getDuration() / 10, wavesurfer, player);
                    break;
                case "Digit2":
                    setSeek(2 * wavesurfer.getDuration() / 10, wavesurfer, player);
                    break;
                case "Digit3":
                    setSeek(3 * wavesurfer.getDuration() / 10, wavesurfer, player);
                    break;
                case "Digit4":
                    setSeek(4 * wavesurfer.getDuration() / 10, wavesurfer, player);
                    break;
                case "Digit5":
                    setSeek(5 * wavesurfer.getDuration() / 10, wavesurfer, player);
                    break;
                case "Digit6":
                    setSeek(6 * wavesurfer.getDuration() / 10, wavesurfer, player);
                    break;
                case "Digit7":
                    setSeek(7 * wavesurfer.getDuration() / 10, wavesurfer, player);
                    break;
                case "Digit8":
                    setSeek(8 * wavesurfer.getDuration() / 10, wavesurfer, player);
                    break;
                case "Digit9":
                    setSeek(9 * wavesurfer.getDuration() / 10, wavesurfer, player);
                    break;
                }
            }),
        )),
    ));

    // feature9: setup chromecast
    effect(rxjs.of(chromecast.$dom()).pipe(
        rxjs.filter(() => chromecast.isAvailable()),
        rxjs.tap(() => $menubar.add(chromecast.$dom())),
        rxjs.mergeMap(() => chromecast.ready$()),
        rxjs.filter(({ mediaCategory }) => mediaCategory === null || mediaCategory === "AUDIO"),
        rxjs.mergeMap(() => rxjs.combineLatest(setup$, getSession(), rxjs.of(getConfig())).pipe(rxjs.first())),
        rxjs.mergeMap(([wavesurfer, user, config]) => {
            const link = chromecast.createLink(toHref(getDownloadUrl()), user.authorization);
            const media = new window.chrome.cast.media.MediaInfo(link);
            media.metadata = new window.chrome.cast.media.MusicTrackMediaMetadata();
            media.metadata.title = getFilename();
            media.metadata.subtitle = config.name;
            media.metadata.albumName = config.name;
            media.contentId = link;
            const session = chromecast.session();
            if (!session) return rxjs.EMPTY;
            setVolume(session.getVolume() * 100);
            return chromecast.load$(media).pipe(rxjs.mapTo(wavesurfer));
        }),
        rxjs.mergeMap((wavesurfer) => {
            const context = chromecast.context();
            if (!context) return rxjs.EMPTY;
            const wasMuted = wavesurfer.getMute();
            wavesurfer.setMute(true);

            const events$ = chromecast.events$().pipe(
                rxjs.tap(({ playerState, currentTime, ...args }) => {
                    switch (playerState) {
                    case STATUS_PAUSED:
                        wavesurfer.pause();
                        setSeek(currentTime, wavesurfer);
                        setStatus(playerState);
                        break;
                    case STATUS_PLAYING:
                        wavesurfer.play();
                        setSeek(currentTime, wavesurfer);
                        setStatus(playerState);
                        break;
                    case STATUS_BUFFERING:
                        wavesurfer.pause();
                        setStatus(playerState);
                        break;
                    case STATUS_IDLE:
                        setStatus(STATUS_PAUSED);
                        wavesurfer.setMute(wasMuted);
                        context.endCurrentSession(true);
                        break;
                    }
                }),
            );

            return rxjs.merge(events$);
        }),
    ));
}

export function init() {
    return Promise.all([
        loadJS(import.meta.url, "../../lib/vendor/wavesurfer.js"),
        loadCSS(import.meta.url, "./application_audio.css"),
        chromecast.init(),
    ]);
}

function resolvePlayer(wavesurfer) {
    let player = new WavesurferPlayer(wavesurfer);
    const session = chromecast.session();
    const media = session?.getMediaSession();
    if (media?.media?.mediaCategory === "AUDIO") {
        player = new ChromecastPlayer(session);
    }
    return player;
}

class WavesurferPlayer extends IPlayer {
    constructor(wavesurfer) {
        super();
        this.wavesurfer = wavesurfer;
    }

    play() {
        this.wavesurfer.backend.ac.resume();
    }

    pause() {
        this.wavesurfer.backend.ac.suspend();
    }

    setVolume(volume) {
        this.wavesurfer.setVolume(volume / 100);
    }

    setSeek(time) {
        this.wavesurfer.backend.source.stop(0);
        this.wavesurfer.backend.disconnectSource();
        this.wavesurfer.backend.createSource();
        this.wavesurfer.backend.source.start(0, time);
    }
}

class ChromecastPlayer extends IPlayer {
    constructor(session) {
        super();
        this.session = session;
    }

    play() {
        const media = this.session.getMediaSession();
        if (!media) return Promise.reject(new Error("CHROMECAST_MEDIA_NOT_FOUND"));
        const request = new window.chrome.cast.media.PlayRequest();
        return new Promise((resolve, reject) => {
            media.play(request, resolve, reject);
        });
    }

    pause() {
        const media = this.session.getMediaSession();
        if (!media) return Promise.reject(new Error("CHROMECAST_MEDIA_NOT_FOUND"));
        const request = new window.chrome.cast.media.PauseRequest();
        return new Promise((resolve, reject) => {
            media.pause(request, resolve, reject);
        });
    }

    setVolume(volume) {
        return this.session.setVolume(volume / 100);
    }

    setSeek(position) {
        const media = this.session.getMediaSession();
        if (!media) return Promise.reject(new Error("CHROMECAST_MEDIA_NOT_FOUND"));
        const request = new window.chrome.cast.media.SeekRequest();
        request.currentTime = position;
        return new Promise((resolve, reject) => {
            media.seek(request, resolve, reject);
        });
    }
}
