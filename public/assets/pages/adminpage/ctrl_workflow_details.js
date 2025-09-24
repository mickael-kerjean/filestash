import { createElement } from "../../lib/skeleton/index.js";

import transition from "./animate.js";

export default async function(render, { name }) {
    const $page = createElement(`
        <div class="component_page_workflow">
            <h2 class="ellipsis">
                <a href="./admin/workflow" data-link>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style="width:20px;fill:var(--color);">
                        <path d="M169.4 297.4C156.9 309.9 156.9 330.2 169.4 342.7L361.4 534.7C373.9 547.2 394.2 547.2 406.7 534.7C419.2 522.2 419.2 501.9 406.7 489.4L237.3 320L406.6 150.6C419.1 138.1 419.1 117.8 406.6 105.3C394.1 92.8 373.8 92.8 361.3 105.3L169.3 297.3z"/>
                    </svg>
                </a>
                ${name}
            </h2>
            <div data-bind="workflow">
                <div class="box status-unpublished">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112C434.9 112 528 205.1 528 320zM64 320C64 461.4 178.6 576 320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z"/></svg>
                    <h3 class="ellipsis no-select">On a Schedule <span>(every day)</span></h3>
                </div>
                <hr>
                <div class="box status-published">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M96 160C96 124.7 124.7 96 160 96L480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160zM240 164C215.7 164 196 183.7 196 208L196 256C196 280.3 215.7 300 240 300L272 300C296.3 300 316 280.3 316 256L316 208C316 183.7 296.3 164 272 164L240 164zM236 208C236 205.8 237.8 204 240 204L272 204C274.2 204 276 205.8 276 208L276 256C276 258.2 274.2 260 272 260L240 260C237.8 260 236 258.2 236 256L236 208zM376 164C365 164 356 173 356 184C356 193.7 362.9 201.7 372 203.6L372 280C372 291 381 300 392 300C403 300 412 291 412 280L412 184C412 173 403 164 392 164L376 164zM228 360C228 369.7 234.9 377.7 244 379.6L244 456C244 467 253 476 264 476C275 476 284 467 284 456L284 360C284 349 275 340 264 340L248 340C237 340 228 349 228 360zM324 384L324 432C324 456.3 343.7 476 368 476L400 476C424.3 476 444 456.3 444 432L444 384C444 359.7 424.3 340 400 340L368 340C343.7 340 324 359.7 324 384zM368 380L400 380C402.2 380 404 381.8 404 384L404 432C404 434.2 402.2 436 400 436L368 436C365.8 436 364 434.2 364 432L364 384C364 381.8 365.8 380 368 380z"/></svg>
                    <h3 class="ellipsis">Execute Program <span>(duplicate)</span></h3>

                    <div style="margin-top: 10px;padding: 10px 0 0 0; border-top: 2px solid rgba(0, 0, 0, 0.1);">
                        <div class="flex">
                            <span class="ellipsis">Frequency:</span>
                            <div style="width:100%;"><select class="component_select" name="params.level" id="log_level"><option name="DEBUG" selected="">DEBUG</option><option name="INFO">INFO</option><option name="WARNING">WARNING</option><option name="ERROR">ERROR</option></select></div>
                        </div>
                        <div class="flex">
                            <span class="ellipsis">Frequency:</span>
                            <div style="width:100%;"><select class="component_select" name="params.level" id="log_level"><option name="DEBUG" selected="">DEBUG</option><option name="INFO">INFO</option><option name="WARNING">WARNING</option><option name="ERROR">ERROR</option></select></div>
                        </div>
                    </div>

                </div>
                <hr>
                <div class="box status-published">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M112 128C85.5 128 64 149.5 64 176C64 191.1 71.1 205.3 83.2 214.4L291.2 370.4C308.3 383.2 331.7 383.2 348.8 370.4L556.8 214.4C568.9 205.3 576 191.1 576 176C576 149.5 554.5 128 528 128L112 128zM64 260L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 260L377.6 408.8C343.5 434.4 296.5 434.4 262.4 408.8L64 260z"/></svg>
                    <h3 class="ellipsis">Notify <span>(john@example.com)</span></h3>
                </div>
                <hr>
                <button class="box">+ Add step</button>
            </div>
            <style>
                .component_page_admin .page_container h2:after { display: none; }
            </style>
        </div>
    `);
    render(transition($page));
}
