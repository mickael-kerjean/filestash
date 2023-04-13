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
    const [isChromecast, setIsChromecast] = useState(false);
    const [error, setError] = useState(null);
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
        wavesurfer.current.load(data);

        let $currentTime = document.getElementById("currentTime");
        let $totalDuration = document.getElementById("totalDuration");
        wavesurfer.current.on("ready", () => {
            setPurcentLoading(100);
            setIsLoading(false);
            wavesurfer.current.setVolume(volume / 100);
            $totalDuration.innerHTML = formatTimecode(wavesurfer.current.getDuration());
        });
        wavesurfer.current.on("audioprocess", () => {
            $currentTime.innerHTML = formatTimecode(wavesurfer.current.getCurrentTime());
        });
        wavesurfer.current.on("loading", (n) => {
            setPurcentLoading(n);
        });
        wavesurfer.current.on("error", (err) => {
            setIsLoading(false);
            setError(err);
        });
        wavesurfer.current.on("seek", (s) => {
            const media = Chromecast.media();
            if (!media) return;
            const seekRequest = new chrome.cast.media.SeekRequest();
            seekRequest.currentTime = parseInt(s*wavesurfer.current.getDuration());
            media.seek(seekRequest);
        });

        return () => wavesurfer.current.destroy();
    }, []);

    useEffect(() => {
        window.addEventListener("keypress", onKeyPressHandler);
        return () => window.removeEventListener("keypress", onKeyPressHandler);
    }, [isPlaying])

    const chromecastSetup = (event) => {
        switch (event.sessionState) {
        case cast.framework.SessionState.SESSION_STARTING:
            setIsChromecast(true);
            setIsLoading(true);
            break;
        case cast.framework.SessionState.SESSION_START_FAILED:
            notify.send(t("Cannot establish a connection"), "error");
            setIsChromecast(false);
            setIsLoading(false);
            break;
        case cast.framework.SessionState.SESSION_STARTED:
            chromecastHandler()
            break;
        case cast.framework.SessionState.SESSION_ENDING:
            wavesurfer.current.setMute(false);
            setIsChromecast(false);
            break;
        }
    };

    const chromecastHandler = () => {
        setIsLoading(true);
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
        const session = Chromecast.session();
        if (!session) return;

        Chromecast.createRequest(media)
            .then((req) => {
                req.currentTime = parseInt(wavesurfer.current.getCurrentTime());
                return session.loadMedia(req)
            })
            .then(() => {
                setIsPlaying(true);
                setIsLoading(false);
                wavesurfer.current.play();
                wavesurfer.current.setMute(true);

                const media = Chromecast.media();
                if (!media) return;
                wavesurfer.current.seekTo(media.getEstimatedTime() / wavesurfer.current.getDuration());
                media.addUpdateListener(chromecastAlive);
            }).catch((err) => {
                console.error(err);
                notify.send(t("Cannot establish a connection"), "error");
                setIsChromecast(false);
                setIsLoading(false);
            });
    }

    const chromecastAlive = (isAlive) => {
        if (isAlive) return;
        const session = Chromecast.session();
        if (session) {
            session.endSession();
            wavesurfer.current.setMute(false);
        }
    };

    useEffect(() => {
        const context = Chromecast.context();
        if (!context) return;
        chromecastAlive(false);
        document.getElementById("chromecast-target").append(document.createElement("google-cast-launcher"));        
        context.addEventListener(
            cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            chromecastSetup,
        );
        return () => {
            context.removeEventListener(
                cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                chromecastSetup,
            );
            const media = Chromecast.media();
            if (!media) return
            media.removeUpdateListener(chromecastAlive);
            chromecastAlive(false);
        };
    }, []);

    const onKeyPressHandler = (e) => {
        if(e.code !== "Space") {
            return
        }
        isPlaying ? onPause(e) : onPlay(e);
    };

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

    const onVolumeChange = (e) => {
        const v = Number(e.target.value);
        settings_put("volume", v);
        setVolume(v);
        if (isChromecast) {
            const session = Chromecast.session()
            if (session) session.setVolume(v / 100);
        } else wavesurfer.current.setVolume(v / 100);
    };
    const onVolumeClick = () => {
        onVolumeChange({ target: { value: 0 }});
    };

    const formatTimecode = (seconds) => (new Date(seconds * 1000).toISOString().substr(11, 8));

    return (
        <div className="component_audioplayer">
            <MenuBar title={filename} download={data} />
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
                                <input onChange={onVolumeChange} type="range" min="0" max="100" value={volume}/>
                            </div>

                            <div className="timecode">
                                <span id="currentTime">00:00:00</span>
                                <span id="separator" className="no-select">/</span>
                                <span id="totalDuration">00:00:00</span>
                            </div>
                        </div>
                    </div>
                </NgIf>
            </div>
        </div>
    )
}
