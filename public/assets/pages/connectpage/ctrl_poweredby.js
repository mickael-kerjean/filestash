import { createElement } from "../../lib/skeleton/index.js";
import rxjs from "../../lib/rx.js";
import { transition } from "../../lib/animate.js";
import t from "../../lib/locales.js";

import config$ from "./model_config.js";

export default async function(render) {
    const hasFork = await config$.pipe(rxjs.filter(({ fork_button }) => fork_button !== false)).toPromise();
    if (!hasFork) return;

    await new Promise((done) => setTimeout(done, 1000));

    render(transition(createElement(`
        <div class="component_poweredbyfilestash">
            ${t("Powered by")} <strong><a href="https://www.filestash.app">Filestash</a></strong>
            <style>
                .component_poweredbyfilestash{
                    display: inline-block;
                    color: rgba(0, 0, 0, 0.4);
                    font-size: 0.9em;
                    line-height: 20px;

                    position: fixed;
                    bottom: 10px;
                    right: 20px;
                }
                .component_poweredbyfilestash strong{
                    font-weight: normal;
                }
                .component_poweredbyfilestash strong a{
                    text-decoration: underline;
                }
                .dark-mode .component_poweredbyfilestash {
                    color: var(--light);
                }
            </style>
        </div>
    `)));
}
