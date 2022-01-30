import React, { useEffect, useRef } from "react";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";

import { Pager } from "./pager";
import { MenuBar } from "./menubar";
import { getMimeType } from "../../helpers/";
import videojs from "video.js";
import "videojs-contrib-hls";

import "video.js/dist/video-js.css";
import "./videoplayer.scss";

export function VideoPlayer({ filename, data, path }) {
    const $video = useRef();
    if (!window.overrides["video-map-sources"]) {
        window.overrides["video-map-sources"] = (s) => (s);
    }

    useEffect(() => {
        const player = videojs($video.current, {
            controls: true,
            sources: window.overrides["video-map-sources"]([{
                src: data,
                type: getMimeType(data),
            }]),
        });
        return () => {
            player.dispose();
        };
    }, [data]);

    return (
        <div className="component_videoplayer">
            <MenuBar title={filename} download={data} />
            <div className="video_container">
                <ReactCSSTransitionGroup
                    transitionName="video"
                    transitionAppear={true}
                    transitionLeave={false}
                    transitionEnter={true}
                    transitionEnterTimeout={300}
                    transitionAppearTimeout={300}>
                    <div key={data} data-vjs-player>
                        <video
                            ref={$video}
                            className="video-js vjs-fill vjs-default-skin vjs-big-play-centered"
                            style={{
                                boxShadow: "rgba(0, 0, 0, 0.14) 0px 4px 5px 0px, " +
                                    "rgba(0, 0, 0, 0.12) 0px 1px 10px 0px, " +
                                    "rgba(0, 0, 0, 0.2) 0px 2px 4px -1px",
                            }}>
                        </video>
                    </div>
                </ReactCSSTransitionGroup>
                <Pager path={path} />
            </div>
        </div>
    );
}
