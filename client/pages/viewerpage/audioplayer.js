import React, { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import filepath from "path";

import { MenuBar } from "./menubar";
import { NgIf, Icon } from "../../components/";
import { settings_get, settings_put, notify, getMimeType, basename } from "../../helpers/";
import { Chromecast } from "../../model/";
import { t } from "../../locales/";
import "./audioplayer.scss";

export function AudioPlayer({ filename, data }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [purcentLoading, setPurcentLoading] = useState(0);
    const [volume, setVolume] = useState(settings_get("volume") === null ? 50 : settings_get("volume"));
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isChromecast, setIsChromecast] = useState(false);
    const [error, setError] = useState(null);
    const [render, setRender] = useState(0);
    const wavesurfer = useRef(null);

    useEffect(() => {
        wavesurfer.current = WaveSurfer.create({
            container: "#waveform",
            waveColor: "#323639",
            progressColor: "#808080",
            cursorColor: "#6f6f6f",
            cursorWidth: 3,
            height: 200,
            barWidth: 1,
        });
        window.wavesurfer = wavesurfer.current; // TODO: remove this
        wavesurfer.current.load(data);
        wavesurfer.current.on("ready", () => {
            setPurcentLoading(100);
            setIsLoading(false);
            wavesurfer.current.setVolume(volume / 100);
            setDuration(wavesurfer.current.getDuration());
        });
        wavesurfer.current.on("audioprocess", () => {
            const t = wavesurfer.current.getCurrentTime()
            _currentTime = t;
            setCurrentTime(t);
        });
        wavesurfer.current.on("loading", (n) => {
            setPurcentLoading(n);
        });
        wavesurfer.current.on("error", (err) => {
            setIsLoading(false);
            setError(err);
        });
        return () => wavesurfer.current.destroy();
    }, [data]);

    useEffect(() => {
        const onKeyPressHandler = (e) => {
            if(e.code !== "Space") {
                return
            }
            // TODO: write shortcut
            isPlaying ? onPause(e) : onPlay(e);
        };

        window.addEventListener("keypress", onKeyPressHandler);
        return () => window.removeEventListener("keypress", onKeyPressHandler);
    }, [isPlaying, isChromecast]);

    useEffect(() => {
        const context = Chromecast.context();
        if (!context) return;
        document.getElementById("chromecast-target").append(document.createElement("google-cast-launcher"));
        _currentTime = 0;

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
        if (!wavesurfer) return;
        const onSeek = (s) => {
            if (isChromecast === false) return
            else if (Math.abs(s * duration - _currentTime) < 1) {
                // wavesurfer trigger a seek event when trying to synchronise the remote to the local
                // which we want to ignore as we're only interested in user requested seek
                return;
            }
            const media = Chromecast.media();
            if (!media) return;

            wavesurfer.current.pause();
            const seekRequest = new chrome.cast.media.SeekRequest();
            seekRequest.currentTime = s*duration;
            media.seek(seekRequest);
        }
        wavesurfer.current.on("seek", onSeek);
        return () => {
            wavesurfer.current.un("seek", onSeek);
        };
    }, [wavesurfer.current, isChromecast]);

    useEffect(() => {
        const media = Chromecast.media();
        if (!media) return;

        const remotePlayer = new cast.framework.RemotePlayer();
        const remotePlayerController = new cast.framework.RemotePlayerController(remotePlayer);
        const onPlayerStateChangeHandler = (event) => {
            switch(event.value) {
            case "BUFFERING":
                wavesurfer.current.pause();
                break
            case "PLAYING":
                wavesurfer.current.play();
                break;
            }
        };
        const onPlayerCurrentTimeChangeHandler = (event) => {
            _currentTime = event.value;
            setCurrentTime(event.value);
            if (event.value > 0) wavesurfer.current.seekTo(event.value / duration);
        };
        const onMediaChange = (isAlive) => {
            if (media.playerState !== chrome.cast.media.PlayerState.IDLE) return;
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
            cast.framework.RemotePlayerEventType.PLAYER_STATE_CHANGED,
            onPlayerStateChangeHandler,
        );
        remotePlayerController.addEventListener(
            cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
            onPlayerCurrentTimeChangeHandler,
        );
        return () => {
            media.removeUpdateListener(onMediaChange);
            remotePlayerController.removeEventListener(
                cast.framework.RemotePlayerEventType.PLAYER_STATE_CHANGED,
                onPlayerStateChangeHandler,
            );
            remotePlayerController.removeEventListener(
                cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
                onPlayerCurrentTimeChangeHandler,
            );
        };
    }, [isChromecast, isLoading, render, duration]);

    const onPlay = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsPlaying(true);
        if (wavesurfer.current) wavesurfer.current.play();
        if (isChromecast) {
            const media = Chromecast.media();
            if (media) media.play();
        }
    };

    const onPause = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsPlaying(false);
        if (wavesurfer.current) wavesurfer.current.pause();
        if (isChromecast) {
            const media = Chromecast.media();
            if (media) media.pause();
        }
    };

    const onVolumeChange = (v) => {
        setVolume(v);
        if (isChromecast) {
            const session = Chromecast.session()
            if (session) session.setVolume(v / 100);
            else {
                setIsChromecast(false);
                notify.send(t("Cannot establish a connection"), "error");
            }
        } else {
            wavesurfer.current.setVolume(v / 100);
            settings_put("volume", v);
        }
    };

    const onVolumeClick = () => {
        onVolumeChange(0);
    };

    const formatTimecode = (seconds) => {
        return String(parseInt(seconds / 60)).padStart(2, "0") +
            ":"+
            String(parseInt(seconds % 60)).padStart(2, "0");
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
                req.currentTime = _currentTime;
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
                        <Icon name="fullscreen" onClick={() => chromecastLoader()} />
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
                        <div id="waveform"></div>
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
                                <span><Icon onClick={onVolumeClick} name={volume === 0 ? "volume_mute" : volume < 50 ? "volume_low" : "volume"}/></span>
                                <input onChange={(e) => onVolumeChange(Number(e.target.value) || 0)} type="range" min="0" max="100" value={volume}/>
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
