import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { loadCSS } from "../../helpers/loader.js";
import { qs } from "../../lib/dom.js";
import Hls from "../../lib/vendor/hlsjs/hls.js";

import ctrlError from "../ctrl_error.js";

import { getDownloadUrl } from "./common.js";

import "../../components/menubar.js";

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
                        <div class="videoplayer_control no-select">
                            <div class="progress">
                                <div class="progress-buffer" style="left: 0.0155149%; width: 4.58182%;"></div>
                                <div class="progress-active" style="width: 0%;">
                                    <div class="thumb"></div>
                                </div>
                                <div class="progress-placeholder"></div>
                            </div>
                            <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzZmNmY2ZiIgc3Ryb2tlLXdpZHRoPSIyLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGggZD0iTSA4LjkyODE3MjQsMi41OTk4MDI5IEMgOC4yMjE2MTQ5LDIuMTUzMjg3MyA3LjA3MjExNDMsMi4zOTIwOTE4IDcuMDcxODI3NywzLjQwMDE5NzEgbCAtMC4wMDQ4OSwxNy4yMDUwNDU5IGMgLTIuODg5ZS00LDEuMDE1NzE1IDEuMjEyMTk3OSwxLjE2MDM3MiAxLjg2NjEzMDcsMC43ODk1MTMgQyAyMy45NzU3NCw4LjcyODk4NTYgMjMuOTMwMTUyLDE0LjEwNDQ2MyA4LjkyODE1ODQsMi41OTk4MDI5IFoiIC8+Cjwvc3ZnPgo=" alt="play">
                            <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzZmNmY2ZiIgc3Ryb2tlLXdpZHRoPSIyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxwYXRoIGQ9Im0gMTYuMzUwMjI1LDguMTkzNzg3IGMgMS40NDk2MjYsMS45MzM1NTkgMS40NDk2MjYsNS42Nzg4ODQgMCw3LjYxMjQ0NiIgLz4KICA8cGF0aCBkPSJNIDEuMTI1MzM1NiwxNS4yMTc4OTcgViA4Ljc4MTAzMjggYyAwLC0wLjYyNDIyMDUgMC40ODcxOTY3LC0xLjEzMDk5MTcgMS4wODc0OTIzLC0xLjEzMDk5MTcgSCA2LjExMjU3NDggQSAxLjA2NTc0MjIsMS4wNjU3NDIyIDAgMCAwIDYuODgxNDMxOCw3LjMxODM1NjIgTCAxMC4xNDM5MDksMy42MzM5MzI4IGMgMC42ODUxMiwtMC43MTMzOTUgMS44NTYzNDUsLTAuMjA3NzExMSAxLjg1NjM0NSwwLjgwMDM5NDIgdiAxNS4xMzEzNjggYyAwLDEuMDE1NzE1IC0xLjE4NTM2MiwxLjUxNzA0NSAtMS44NjYxMzEsMC43ODk1MTMgTCA2Ljg4MjUxOSwxNi42OTE0NSBBIDEuMDY1NzQyMiwxLjA2NTc0MjIgMCAwIDAgNi4xMDM4NzQ4LDE2LjM0OTk3NSBIIDIuMjEyODI3OSBjIC0wLjYwMDI5NTYsMCAtMS4wODc0OTIzLC0wLjUwNjc2OCAtMS4wODc0OTIzLC0xLjEzMjA3OCB6IiAvPgo8L3N2Zz4K" alt="volume_low">
                            <input type="range" min="0" max="100" value="13">
                            <span class="timecode">00:00&nbsp; / &nbsp;02:17</span>
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

    const $video = qs($page, "video");

    const hls = new Hls();
    hls.loadSource(getDownloadUrl(), mime);
    hls.attachMedia($video);
    hls.on(Hls.Events.MEDIA_ATTACHED, function () {
      console.log('video and hls.js are now bound together !');
    });
    hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
      console.log(
        'manifest loaded, found ' + data.levels.length + ' quality level',
      );
    });

    effect(rxjs.fromEvent($video, "loadeddata").pipe())
    effect(rxjs.fromEvent($video, "ended").pipe())
    effect(rxjs.merge(
        // rxjs.from(qsa($page, "source")).pipe(rxjs.mergeMap(
        // ))
        rxjs.fromEvent($video, "error")
    ).pipe());
    effect(rxjs.fromEvent($video, "waiting").pipe());
    effect(rxjs.fromEvent($video, "playing").pipe());
    effect(rxjs.fromEvent(document.body, "keypress").pipe(
    ));
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "./application_video.css"),
        loadCSS(import.meta.url, "./component_pager.css"),
    ]);
}
