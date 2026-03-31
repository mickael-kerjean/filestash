import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { generateSkeleton } from "../../components/skeleton.js";
import { loadCSS } from "../../helpers/loader.js";

import { get as getLogs } from "./model_log.js";

const NUMBER_BUCKETS = 30;
const MIN_TIME_WIDTH = 5000;

export default async function(render) {
    render(createElement(`<div>${generateSkeleton(3)}</div>`));
    await loadCSS(import.meta.url, "./ctrl_activity_graph.css");

    effect(getLogs(300).pipe(
        rxjs.first(),
        rxjs.repeat({ delay: 2500 }),
        rxjs.scan(({ start, end, width, max, init = true, buckets = Array(NUMBER_BUCKETS).fill(0) }, logfile) => {
            const times = [];
            let i = 0; while (i < logfile.length) {
                const t = new Date(logfile.substring(i, i + 19)).getTime();
                if (!isNaN(t)) times.push(t);
                const end = logfile.indexOf("\n", i);
                i = end === -1 ? logfile.length : end + 1;
            }
            if (init === true) {
                start = times[0];
                end = times[times.length - 1];
                width = Math.max((end - start) / NUMBER_BUCKETS, MIN_TIME_WIDTH);
                for (let i=times.length-1; i>=0; i--) {
                    let idx = Math.floor((times[i] - start) / width);
                    if (idx === NUMBER_BUCKETS) idx -= 1;
                    buckets[idx] += 1;
                }
                for (let i=buckets.length-1; i>=0; i--) {
                    if (buckets[i] === 0) buckets[i] = -1;
                    else break;
                }
                max = Math.max(1, ...buckets);
                init = false;
            } else {
                for (let i=times.length-1; i>=0; i--) {
                    const current = times[i];
                    // start          end       current
                    //   |             |           |
                    //   |=============|<--  new -->
                    if (current <= end) {
                        break;
                    }
                    const idx = Math.floor((times[i] - start) / width);
                    if (!buckets[idx]) buckets[idx] = 0;
                    buckets[idx] += 1;
                }
                const shift = buckets.length - NUMBER_BUCKETS;
                for (let i=0; i<shift; i++) {
                    buckets.shift();
                    start += width;
                }
                end = times[times.length - 1];
            }
            return { start, end, width, buckets, max, init };
        }, {}),
        rxjs.tap(({ buckets, start, end, max }) => {
            const $root = document.createDocumentFragment();
            const $chart = createElement(`<div class="chart"></div>`);
            let display = true;
            for (let i = 0; i < buckets.length; i++) {
                if (buckets[i] < 0) {
                    display = false;
                    continue;
                }
                const $bar = createElement(`<div class="bar" title="${buckets[i]}"></div>`);
                const height = Math.sqrt(buckets[i]) / Math.sqrt(max) * 100;
                $bar.style.height = Math.min(height, 120) + "%";
                $chart.appendChild($bar);
            }
            $root.appendChild($chart);
            $root.appendChild(createElement(`
                <div class="legend">
                    <span>${new Date(start).toLocaleTimeString()}</span>
                    <span class="title">Log Events</span>
                    <span>${new Date(end).toLocaleTimeString()}</span>
                </div>
            `));
            if (display) render($root);
        }),
        rxjs.catchError((err) => rxjs.EMPTY),
    ));
}
