import React, { useState, useEffect, useLayoutEffect } from "react";
import WaveSurfer from "wavesurfer.js";

import { MenuBar } from "./menubar";
import { NgIf, Icon } from "../../components/";
import "./audioplayer.scss";

export function AudioPlayer({ filename, data }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [wavesurfer, setWavesurfer] = useState(null);
    const [error, setError] = useState(null);

    useLayoutEffect(() => {
        const _ws = WaveSurfer.create({
            container: "#waveform",
            waveColor: "#323639",
            progressColor: "#6f6f6f",
            cursorColor: "#323639",
            cursorWidth: 2,
            height: 250,
            barWidth: 1,
        });

        _ws.on("ready", () => {
            setIsLoading(false);
        });
        _ws.on("error", (err) => {
            setIsLoading(false);
            setError(err)
        });
        _ws.load(data);
        setWavesurfer(_ws);
        return () => _ws.destroy();
    }, []);

    useEffect(() => {
        if(wavesurfer === null) return;
        window.addEventListener("keypress", onKeyPressHandler);
        return () => window.removeEventListener("keypress", onKeyPressHandler);
    }, [wavesurfer, isPlaying])

    const onKeyPressHandler = (e) => {
        if(e.code !== "Space") {
            return
        }
        isPlaying ? onPause(e) : onPlay(e);
    };

    const onPlay = (e) => {
        e.preventDefault();
        e.stopPropagation();
        wavesurfer.play();
        setIsPlaying(true);
    }

    const onPause = (e) => {
        e.preventDefault();
        e.stopPropagation();
        wavesurfer.pause();
        setIsPlaying(false);
    }

    return (
        <div className="component_audioplayer">
            <MenuBar title={filename} download={data} />
            <div className="audioplayer_container">
                <NgIf cond={error !== null} className="audioplayer_error">
                    {error}
                </NgIf>
                <NgIf cond={error === null}>
                    <NgIf cond={isLoading === true}>
                        <Icon name="loading" />
                    </NgIf>
                    <div className="audioplayer_box"
                         style={{ opacity: isLoading? "0" : "1" }}>
                        <div className="audioplayer_control">
                            <NgIf cond={isPlaying === false}>
                                <span onClick={onPlay}>
                                    <Icon name="play"/>
                                </span>
                            </NgIf>
                            <NgIf cond={isPlaying === true}>
                                <span onClick={onPause}>
                                    <Icon name="pause"/>
                                </span>
                            </NgIf>
                        </div>
                        <div id="waveform"></div>
                    </div>
                </NgIf>
            </div>
        </div>
    )
}
