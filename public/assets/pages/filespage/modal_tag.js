import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, onClick } from "../../lib/rx.js";
import { forwardURLParams } from "../../lib/path.js";
import ajax from "../../lib/ajax.js";
import { qs } from "../../lib/dom.js";
import assert from "../../lib/assert.js";
import { generateSkeleton } from "../../components/skeleton.js";
import t from "../../locales/index.js";


const shareID = new URLSearchParams(location.search).get("share");

const $tmpl = createElement(`
    <div class="tag no-select">
        <div class="ellipsis">Projects</div>
        <svg style="${shareID ? "opacity:0.2" : ""}" class="component_icon" draggable="false" alt="close" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    </div>
`);

export default async function(render, { path }) {
    const $modal = createElement(`
        <div class="component_tag">
            <form class="${shareID ? "hidden" : ""}">
                <input name="tag" type="text" placeholder="${t("Add a Tag")}" value="">
            </form>
            <div class="scroll-y" data-bind="taglist">
                ${generateSkeleton(1)}
            </div>
        </div>
    `);
    render($modal);

    const tags$ = new rxjs.BehaviorSubject(await rxjs.zip(
        ajax({ url: forwardURLParams(`api/metadata?path=${path}`, ["share"]), method: "GET", responseType: "json" }).pipe(
            rxjs.map(({ responseJSON }) =>
                responseJSON.results
                    .reduce((acc, { id, value }) => {
                        if (id !== "tags") return acc;
                        acc = acc.concat(value.split(", ").map(
                            (name) => ({ name, active: true })
                        ));
                        return acc;
                    }, [])
            ),
        ),
        ajax({ url: forwardURLParams("api/metadata/search", ["share"]), method: "POST", responseType: "json", body: { path: "/" }}).pipe(
            rxjs.map(({ responseJSON }) =>
                responseJSON.results
                    .filter(({ type, name }) => type === "folder")
                    .map(({ name }) => ({ name, active: false }))
            ),
        ),
    ).pipe(rxjs.map(([currentTags, allTags]) => {
        for (let i=0; i<allTags.length; i++) {
            for (let j=0; j<currentTags.length; j++) {
                if (currentTags[j].name === allTags[i].name) {
                    allTags[i].active = true;
                    break;
                }
            }
        }
        if (!shareID && allTags.length === 0) {
            return [{ name: t("bookmark"), active: false }];
        }
        if (shareID) return allTags.filter(({ active }) => active);
        return allTags;
    })).toPromise());
    const save = (tags) => ajax({
        url: forwardURLParams(`api/metadata?path=${path}`, ["share"]),
        method: "POST",
        body: tags.length === 0 ? [] : [{
            id: "tags",
            type: "hidden",
            value: tags.join(", "),
        }],
    }).pipe(rxjs.tap(() => window.dispatchEvent(new Event("filestash::tag"))));

    // feature: create DOM
    const dom$ = tags$.pipe(
        rxjs.map((tags) => tags.sort((a, b) => a.name > b.name ? 1 : -1)),
        rxjs.map((tags) => tags.map(({ name, active }) => {
            const $el = assert.type($tmpl, HTMLElement).cloneNode(true);
            $el.firstElementChild.innerText = name;
            if (active) $el.classList.add("active");
            qs($el, "svg").onclick = (e) => {
                if (shareID) return;
                e.preventDefault();
                e.stopPropagation();
                $el.classList.remove("active");
                tags$.next(tags$.value.filter((tag) => {
                    return tag.name !== $el.innerText.trim();
                }));
                save(tags$.value
                     .filter(({ active }) => active)
                     .map(({ name }) => name)).toPromise();
            }
            return $el;
        })),
        rxjs.tap(($nodes) => {
            const $container = qs($modal, `[data-bind="taglist"]`);
            if ($nodes.length === 0) $container.replaceChildren(createElement(`<div class="center full-width">∅</div>`));
            else $container.replaceChildren(...$nodes);
        }),
    );

    // feature: tag creation
    effect(rxjs.fromEvent(qs($modal, "form"), "submit").pipe(
        rxjs.filter(() => !shareID),
        rxjs.tap((e) => {
            e.preventDefault();
            const tagname = new FormData(e.target).get("tag").toLowerCase().trim();
            if (!tagname) return;
            else if (tags$.value.find(({ name }) => name === tagname)) return;
            qs($modal, `input[name="tag"]`).value = "";
            tags$.next(tags$.value.concat({
                name: tagname,
                active: true,
            }));
        }),
        rxjs.mergeMap(() => save(
            tags$.value
                .filter(({ active }) => !!active)
                .map(({ name }) => name)
        )),
    ));

    // feature: toggle tags
    effect(dom$.pipe(
        rxjs.mergeMap(($nodes) => rxjs.merge(
            ...$nodes.map(($node) => onClick($node)),
        ).pipe(
            rxjs.filter(() => !shareID),
            rxjs.tap(($node) => $node.classList.toggle("active")),
            rxjs.debounceTime(800),
            rxjs.map(() =>
                $nodes
                    .filter(($node) => $node.classList.contains("active"))
                    .map(($node) => $node.innerText.trim())
                    .filter((text) => !!text)
            ),
        )),
        rxjs.mergeMap((tags) => save(tags)),
    ));
}
