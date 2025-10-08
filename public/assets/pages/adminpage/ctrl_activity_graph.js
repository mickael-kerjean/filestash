import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { get as getLogs } from "./model_log.js";
import { loadCSS } from "../../helpers/loader.js";

export default async function(render) {
    await loadCSS(import.meta.url, "./ctrl_activity_graph.css");

    effect(getLogs().pipe(
        rxjs.map((log) => {
            const times = log.trim().split("\n").map((line) => new Date(line.substring(0, 19)).getTime());
            const start = times[0];
            const end = times[times.length - 1];

            const size = 30
            const bars = Array(size).fill(0);
            const width = (end - start) / size;
            for (const t of times) {
                const idx = Math.min(size - 1, Math.max(0, Math.floor((t - start) / width)));
                bars[idx] += 1;
            }
            return {
                bars,
                start: new Date(start).toLocaleTimeString(),
                end: new Date(end).toLocaleTimeString(),
            };
        }),
        rxjs.tap(({ bars, start, end }) => {
            const max = Math.max(1, ...bars);
            const $root = document.createDocumentFragment();
            const $chart = createElement(`<div class="chart"></div>`);
            for (let i = 0; i < bars.length; i++) {
                const $bar = createElement(`<div class="bar" title="${bars[i]}"></div>`)
                $bar.style.height = Math.sqrt(bars[i]) / Math.sqrt(max) * 100 + "%";
                $chart.appendChild($bar);
            }
            $root.appendChild($chart);
            $root.appendChild(createElement(`
                <div class="legend">
                    <span>${start}</span>
                    <span>${end}</span>
                </div>
            `));
            render($root);
        }),
        rxjs.catchError(() => rxjs.EMPTY),
    ));
}
