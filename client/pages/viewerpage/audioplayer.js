import React, { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import filepath from "path";

import { MenuBar } from "./menubar";
import { NgIf, Icon } from "../../components/";
import { settings_get, settings_put, notify, getMimeType, basename, formatTimecode } from "../../helpers/";
import { Chromecast } from "../../model/";
import { t } from "../../locales/";
import "./audioplayer.scss";

export function AudioPlayer({ filename, data }) {
    const wavesurfer = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [volume, setVolume] = useState(settings_get("volume") === null ? 50 : settings_get("volume"));
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isChromecast, setIsChromecast] = useState(false);
    const [render, setRender] = useState(0);
    const [error, setError] = useState(null);
    const [purcentLoading, setPurcentLoading] = useState(0);

    useEffect(() => {
        _currentTime = 0;
        wavesurfer.current = WaveSurfer.create({
            container: "#waveform",
            interact: false,

            waveColor: "#323639",
            progressColor: "#808080",
            cursorColor: "#6f6f6f",
            cursorWidth: 3,
            height: 200,
            barWidth: 1,
        });
        window.wavesurfer = {};

        wavesurfer.current.load(data);
        wavesurfer.current.on("ready", () => {
            setPurcentLoading(100);
            setIsLoading(false);
            setDuration(wavesurfer.current.getDuration());
            wavesurfer.current.setVolume(volume / 100);

            wavesurfer.current.backend.createSource();
            wavesurfer.current.backend.startPosition = 0;
            wavesurfer.current.backend.lastPlay = 0;
            wavesurfer.current.backend.source.start(0, 0);
            isPlaying ? wavesurfer.current.backend.ac.resume() : wavesurfer.current.backend.ac.suspend();
        });

        wavesurfer.current.on("loading", (n) => {
            setPurcentLoading(n);
        });
        wavesurfer.current.on("error", (err) => {
            setIsLoading(false);
            setError(err);
        });

        return () => {
            wavesurfer.current.destroy();
        };
    }, [data]);

    useEffect(() => {
        const onKeyPressHandler = (e) => {
            switch(e.code) {
            case "Space":
            case "KeyK": return isPlaying ? onPause() : onPlay();
            case "KeyM": return onVolume(0);
            case "ArrowUp": return onVolume(Math.min(volume + 10, 100));
            case "ArrowDown": return onVolume(Math.max(volume - 10, 0));
            case "KeyL": return onSeek(_currentTime + 10);
            case "KeyJ": return onSeek(_currentTime - 10);
            case "KeyF": return chromecastLoader();
            case "Digit0": return onSeek(0);
            case "Digit1": return onSeek(duration / 10);
            case "Digit2": return onSeek(2 * duration / 10);
            case "Digit3": return onSeek(3 * duration / 10);
            case "Digit4": return onSeek(4 * duration / 10);
            case "Digit5": return onSeek(5 * duration / 10);
            case "Digit6": return onSeek(6 * duration / 10);
            case "Digit7": return onSeek(7 * duration / 10);
            case "Digit8": return onSeek(8 * duration / 10);
            case "Digit9": return onSeek(9 * duration / 10);
            }
        };

        window.addEventListener("keydown", onKeyPressHandler);
        return () => window.removeEventListener("keydown", onKeyPressHandler);
    }, [render, isPlaying, isChromecast, duration, volume]);

    useEffect(() => {
        const context = Chromecast.context();
        if (!context) return;
        document.getElementById("chromecast-target").append(document.createElement("google-cast-launcher"));

        const chromecastSetup = (event) => {
            switch (event.sessionState) {
            case cast.framework.SessionState.SESSION_STARTING:
                setIsChromecast(true);
                setIsLoading(true);
                break;
            case cast.framework.SessionState.SESSION_START_FAILED:
                setIsChromecast(false);
                setIsLoading(false);
                break;
            case cast.framework.SessionState.SESSION_STARTED:
                chromecastLoader()
                break;
            case cast.framework.SessionState.SESSION_ENDING:
                wavesurfer.current.setMute(false);
                wavesurfer.current.seekTo(_currentTime / wavesurfer.current.getDuration());
                setIsChromecast(false);
                setVolume(wavesurfer.current.getVolume() * 100)
                const media = Chromecast.media();
                if (media && media.playerState === "PLAYING") wavesurfer.current.play();
                else if (media && media.playerState === "PAUSED") wavesurfer.current.pause();
                break;
            case cast.framework.SessionState.SESSION_ENDED:
                wavesurfer.current.seekTo(_currentTime / wavesurfer.current.getDuration());
                wavesurfer.current.setMute(false);
                setIsChromecast(false);
                setVolume(wavesurfer.current.getVolume() * 100)
                break
            }
        };
        context.addEventListener(
            cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            chromecastSetup,
        );
        return () => {
            context.removeEventListener(
                cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                chromecastSetup,
            );
        };
    }, []);

    useEffect(() => {
        if (isLoading === true) return;
        else if (isPlaying === false) return;
        else if (isChromecast === false) {
            const t = 20
            const interval = setInterval(() => {
                _currentTime += t/1000;
                setCurrentTime(_currentTime);
                wavesurfer.current.drawer.progress(_currentTime / duration);
            }, t);
            return () => clearInterval(interval);
        }

        const media = Chromecast.media();
        if (!media) return;

        const remotePlayer = new cast.framework.RemotePlayer();
        const remotePlayerController = new cast.framework.RemotePlayerController(remotePlayer);
        const onPlayerCurrentTimeChangeHandler = (event) => {
            _currentTime = event.value;
            setCurrentTime(event.value);
            wavesurfer.current.drawer.progress(event.value / duration);
        };
        const onMediaChange = (isAlive) => {
            if (media.playerState !== chrome.cast.media.PlayerState.IDLE)  return;
            switch(media.idleReason) {
            case chrome.cast.media.IdleReason.FINISHED:
                wavesurfer.current.seekTo(_currentTime / wavesurfer.current.getDuration());
                wavesurfer.current.pause();
                wavesurfer.current.setMute(false);
                setVolume(wavesurfer.current.getVolume() * 100)
                setIsChromecast(false);
                setIsPlaying(false);
                break;
            }
        };

        media.addUpdateListener(onMediaChange);
        remotePlayerController.addEventListener(
            cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
            onPlayerCurrentTimeChangeHandler,
        );
        return () => {
            media.removeUpdateListener(onMediaChange);
            remotePlayerController.removeEventListener(
                cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
                onPlayerCurrentTimeChangeHandler,
            );
        };
    }, [isChromecast, isLoading, isPlaying, render, duration]);

    const onVolume = (v) => {
        setVolume(v);
        if (!isChromecast) {
            wavesurfer.current.setVolume(v / 100);
            settings_put("volume", v);
        } else {
            const session = Chromecast.session()
            if (session) session.setVolume(v / 100);
            else {
                setIsChromecast(false);
                notify.send(t("Cannot establish a connection"), "error");
            }
        }
    };

    const onPlay = (e) => {
        setIsPlaying(true);
        if (!isChromecast) {
            wavesurfer.current.backend.disconnectSource() ;
            wavesurfer.current.backend.createSource();
            wavesurfer.current.backend.source.start(0, _currentTime);
            wavesurfer.current.backend.ac.resume()
        } else {
            const media = Chromecast.media();
            if (media) media.play();
        }
    };

    const onPause = (e) => {
        setIsPlaying(false);
        if (!isChromecast) {
            wavesurfer.current.backend.ac.suspend();
            wavesurfer.current.backend.source.stop(0);
        } else {
            const media = Chromecast.media();
            if (media) media.pause();
        }
    };

    const onSeek = (newTime) => {
        _currentTime = newTime;
        setCurrentTime(_currentTime);
        wavesurfer.current.drawer.progress(_currentTime / duration);

        if (!isChromecast) {
            wavesurfer.current.backend.source.stop(0);
            wavesurfer.current.backend.disconnectSource();
            wavesurfer.current.backend.createSource();
            wavesurfer.current.backend.startPosition = _currentTime;
            wavesurfer.current.backend.source.start(0, currentTime);
            isPlaying ? wavesurfer.current.backend.ac.resume() : wavesurfer.current.backend.ac.suspend();
        } else {
            const media = Chromecast.media();
            if (!media) return;
            const seekRequest = new chrome.cast.media.SeekRequest();
            seekRequest.currentTime = parseInt(_currentTime);
            media.seek(seekRequest);
        }
    };

    const onClickSeek = (e) => {
        const rec = e.target.getBoundingClientRect();
        _currentTime = duration * (e.clientX - rec.x) / rec.width;
        onSeek(_currentTime);
    };

    const onClickFullscreen = () => {
        const session = Chromecast.session();
        if (session) chromecastLoader();
    };

    const chromecastLoader = () => {
        const link = Chromecast.createLink(data);
        const media = new chrome.cast.media.MediaInfo(
            link,
            getMimeType(data),
        );
        media.metadata = new chrome.cast.media.MusicTrackMediaMetadata()
        media.metadata.title = filename.substr(0, filename.lastIndexOf(filepath.extname(filename)));
        media.metadata.subtitle = CONFIG.name;
        media.metadata.albumName = CONFIG.name;
        media.metadata.images = [
            new chrome.cast.Image(origin + "/assets/icons/music.png"),
        ];

        setIsChromecast(true);
        setIsLoading(false);
        setIsPlaying(true);
        wavesurfer.current.setMute(true);
        wavesurfer.current.pause();

        const session = Chromecast.session();
        if (!session) return;
        setVolume(session.getVolume() * 100);
        Chromecast.createRequest(media)
            .then((req) => {
                req.currentTime = parseInt(_currentTime);
                return session.loadMedia(req)
            })
            .then(() => {
                setRender(render + 1);
            })
            .catch((err) => {
                console.error(err);
                notify.send(t("Cannot establish a connection"), "error");
                setIsChromecast(false);
                setIsLoading(false);
            });
    }

    return (
        <div className="component_audioplayer">
            <MenuBar title={filename} download={data}>
                {
                    Chromecast.session() && isChromecast === false && (
                        <Icon name="fullscreen" onClick={() => onClickFullscreen()} />
                    )
                }
            </MenuBar>
            <div className="audioplayer_container">
                <NgIf cond={error !== null} className="audioplayer_error">
                    {error}
                </NgIf>
                <NgIf cond={error === null}>
                    <div className="audioplayer_box">
                        <NgIf cond={isLoading}>
                            {
                                isChromecast ? (
                                    <div className="chromecast_loader">
                                        <Icon name="loading" />
                                    </div>
                                ) : (
                                    <React.Fragment>
                                        <div className="audioplayer_loader" style={{width: purcentLoading + "%"}}></div>
                                        <span className="percent">{purcentLoading}%</span>
                                        <Icon name="loading" />
                                    </React.Fragment>
                                )
                            }
                        </NgIf>
                        <div id="waveform" onClick={(e) => onClickSeek(e)}></div>
                        <div className="audioplayer_control" style={{ opacity: isLoading? 0 : 1 }}>
                            <div className="buttons no-select">
                                {
                                    isPlaying ? (
                                        <span onClick={onPause}>
                                            <Icon name="pause"/>
                                        </span>
                                    ) : (
                                        <span onClick={onPlay}>
                                            <Icon name="play"/>
                                        </span>
                                    )
                                }
                                <span><Icon onClick={() => onVolume(0)} name={volume === 0 ? "volume_mute" : volume < 50 ? "volume_low" : "volume"}/></span>
                                <input onChange={(e) => onVolume(Number(e.target.value) || 0)} type="range" min="0" max="100" value={volume}/>
                            </div>
                            <div className="timecode">
                                <span id="currentTime">{ formatTimecode(currentTime) }</span>
                                <span id="separator" className="no-select">/</span>
                                <span id="totalDuration">{ formatTimecode(duration) }</span>
                            </div>
                        </div>
                    </div>
                </NgIf>
            </div>
        </div>
    )
}

let _currentTime = 0; // trick to avoid making too many call to the chromecast SDK
