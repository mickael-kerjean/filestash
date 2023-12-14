import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../lib/rx.js";
import WaveSurfer from "../../lib/vendor/wavesurfer.js";

export default function(render) {
    const $page = createElement(`
        <div class="component_formviewer">
            <component-menubar></component-menubar>
            <div id="waveform">
                AUDIO
            </div>
        </div>
    `);
    render($page);

    const wavesurfer = WaveSurfer.create({
        container: "#waveform",
        interact: false,

        waveColor: "#323639",
        progressColor: "#808080",
        cursorColor: "#6f6f6f",
        cursorWidth: 3,
        height: 200,
        barWidth: 1,
    });
    // onDestroy(() => wavesurfer.destroy());
}
