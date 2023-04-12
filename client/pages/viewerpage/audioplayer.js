import React, { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

import { MenuBar } from "./menubar";
import { NgIf, Icon } from "../../components/";
import { settings_get, settings_put } from "../../helpers/";
import "./audioplayer.scss";

export function AudioPlayer({ filename, data }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [purcentLoading, setPurcentLoading] = useState(0);
    const [volume, setVolume] = useState(settings_get("volume") === null ? 50 : settings_get("volume"));
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
            setIsLoading(false);
            wavesurfer.current.setVolume(volume / 100);
            $totalDuration.innerHTML = formatTimecode(wavesurfer.current.getDuration());
        });
        wavesurfer.current.on("audioprocess", () => {
            $currentTime.innerHTML = formatTimecode(wavesurfer.current.getCurrentTime());
        })
        wavesurfer.current.on("loading", (n) => {
            setPurcentLoading(n);
        });
        wavesurfer.current.on("error", (err) => {
            setIsLoading(false);
            setError(err);
        });
        return () => wavesurfer.current.destroy();
    }, []);

    useEffect(() => {
        if(wavesurfer.current === null) return;
        window.addEventListener("keypress", onKeyPressHandler);
        return () => window.removeEventListener("keypress", onKeyPressHandler);
    }, [isPlaying])

    const onKeyPressHandler = (e) => {
        if(e.code !== "Space") {
            return
        }
        isPlaying ? onPause(e) : onPlay(e);
    };

    const onPlay = (e) => {
        e.preventDefault();
        e.stopPropagation();
        wavesurfer.current.play();
        setIsPlaying(true);
    };

    const onPause = (e) => {
        e.preventDefault();
        e.stopPropagation();
        wavesurfer.current.pause();
        setIsPlaying(false);
    };

    const onVolumeChange = (e) => {
        const v = Number(e.target.value);
        settings_put("volume", v);
        setVolume(v);
        wavesurfer.current.setVolume(v / 100);
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
                            <div className="audioplayer_loader" style={{width: purcentLoading + "%"}}></div>
                            <Icon name="loading"/>
                            <span className="percent">{purcentLoading}%</span>
                        </NgIf>
                        <div id="waveform"></div>
                        <div className="audioplayer_control" style={{ opacity: isLoading? 0 : 1 }}>
                            <div className="buttons">
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
                                <span id="separator">/</span>
                                <span id="totalDuration">00:00:00</span>
                            </div>
                        </div>
                    </div>
                </NgIf>
            </div>
        </div>
    )
}
