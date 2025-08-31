import rxjs, { effect } from "../lib/rx.js";
import { createElement, createRender } from "../lib/skeleton/index.js";
import { toHref } from "../lib/skeleton/router.js";
import ajax from "../lib/ajax.js";
import { qs, safe } from "../lib/dom.js";
import { forwardURLParams } from "../lib/path.js";
import { get as getConfig } from "../model/config.js";
import { isMobile } from "../pages/filespage/helper.js";
import t from "../locales/index.js";

export default async function ctrlTagPane(render, { tags, path }) {
    if (getConfig("enable_tags", false) === false) {
        render(document.createElement("div"));
        return;
    }
    const $page = createElement(`
        <div>
            <h3 class="no-select">
                <img src="data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjE2IiB2aWV3Qm94PSIwIDAgMTYgMTYiIHZlcnNpb249IjEuMSIgd2lkdGg9IjE2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICAgIDxwYXRoIHN0eWxlPSJmaWxsOiAjNTc1OTVhOyIgZD0iTTEgNy43NzVWMi43NUMxIDEuNzg0IDEuNzg0IDEgMi43NSAxaDUuMDI1Yy40NjQgMCAuOTEuMTg0IDEuMjM4LjUxM2w2LjI1IDYuMjVhMS43NSAxLjc1IDAgMCAxIDAgMi40NzRsLTUuMDI2IDUuMDI2YTEuNzUgMS43NSAwIDAgMS0yLjQ3NCAwbC02LjI1LTYuMjVBMS43NTIgMS43NTIgMCAwIDEgMSA3Ljc3NVptMS41IDBjMCAuMDY2LjAyNi4xMy4wNzMuMTc3bDYuMjUgNi4yNWEuMjUuMjUgMCAwIDAgLjM1NCAwbDUuMDI1LTUuMDI1YS4yNS4yNSAwIDAgMCAwLS4zNTRsLTYuMjUtNi4yNWEuMjUuMjUgMCAwIDAtLjE3Ny0uMDczSDIuNzVhLjI1LjI1IDAgMCAwLS4yNS4yNVpNNiA1YTEgMSAwIDEgMSAwIDIgMSAxIDAgMCAxIDAtMloiPjwvcGF0aD4NCjwvc3ZnPg0K" alt="tag">
                ${t("Tags")}
            </h3>
            <ul>
                <li data-bind="taglist"></li>
            </ul>
        </div>
    `);
    const renderTaglist = createRender(qs($page, `[data-bind="taglist"]`));
    effect(rxjs.merge(
        tags.length === 0 ? rxjs.EMPTY : rxjs.of({ tags }),
        ajax({
            url: forwardURLParams(`api/metadata/search`, ["share"]),
            method: "POST",
            responseType: "json",
            body: {
                tags: [],
                path,
            },
        }).pipe(
            rxjs.map(({ responseJSON }) => {
                const tags = {};
                Object.values(responseJSON.results).forEach((forms) => {
                    forms.forEach(({ id, value = "" }) => {
                        if (id !== "tags") return;
                        value.split(",").forEach((tag) => {
                            tags[tag.trim()] = null;
                        });
                    });
                });
                return { tags: Object.keys(tags).sort(), response: responseJSON.results };
            }),
            rxjs.catchError(() => rxjs.of({ tags: [] })),
        ),
    ).pipe(
        // feature: create the DOM
        rxjs.mergeMap(({ tags, response }) => {
            render($page);
            if (tags.length === 0) {
                renderTaglist(document.createElement("div"));
                return rxjs.EMPTY;
            }
            const $fragment = document.createDocumentFragment();
            tags.forEach((name) => {
                const $tag = createElement(`
                    <a data-link draggable="false" class="no-select">
                        <div class="ellipsis">
                            <span class="hash"></span>
                            ${safe(name)}
                        </div>
                        <svg class="component_icon" draggable="false" alt="close" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </a>
                `);
                const url = new URL(location.href);
                if (url.searchParams.getAll("tag").indexOf(name) === -1) {
                    $tag.setAttribute("href", forwardURLParams(toHref("/files" + path.replace(new RegExp("[^\/]+$"), "") + "?tag=" + name), ["share", "tag"]));
                } else {
                    url.searchParams.delete("tag", name);
                    $tag.setAttribute("href", url.toString());
                    $tag.setAttribute("aria-selected", "true");
                }
                $fragment.appendChild($tag);
            });
            return rxjs.of({ $list: renderTaglist($fragment), response });
        }),
        // feature: tag mouse hover effect
        rxjs.tap(({ $list, response }) => {
            if (isMobile) return;
            else if (!response) return;
            $list.childNodes.forEach(($tag) => {
                if ($tag.getAttribute("aria-selected") === "true") return;
                const tagname = $tag.innerText.trim();
                const paths = [];
                for (const path in response) {
                    const form = response[path].find(({ id }) => id === "tags");
                    if (!form) continue;
                    const tags = form.value.split(",").map((val) => val.trim());
                    if (tags.indexOf(tagname) === -1) continue;
                    paths.push(path);
                }
                $tag.onmouseenter = () => {
                    const $things = document.querySelectorAll(".component_thing");
                    $things.forEach(($thing) => {
                        const thingpath = $thing.getAttribute("data-path");
                        for (let i=0; i<paths.length; i++) {
                            if (paths[i].indexOf(thingpath) === 0) {
                                $thing.classList.add("hover");
                                break;
                            }
                        }
                    });
                    $tag.onmouseleave = () => $things.forEach(($thing) => $thing.classList.remove("hover"));
                };
            });
        }),
    ));
}
