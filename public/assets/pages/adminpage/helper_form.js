import { createElement } from "../../lib/skeleton/index.js";
import rxjs from "../../lib/rx.js";

export function renderLeaf({ format, label, description, type }) {
    if (label === "banner") return createElement(`
        <div class="banner">
            ${fromMarkdown(description)}
        </div>
    `);
    const $el = createElement(`
        <label class="no-select">
            <div class="flex">
                <span class="ellipsis">
                    ${format(label)}:
                </span>
                <div style="width:100%;" data-bind="children"></div>
            </div>
        </label>
    `);
    if (type === "hidden") $el.classList.add("hidden");
    if (description) $el.appendChild(createElement(`
        <div class="flex">
            <span class="nothing"></span>
            <div style="width:100%;">
                <div class="description">${description}</div>
            </div>
        </div>
    `));
    return $el;
}

function fromMarkdown(str = "") {
    str = str.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href=\"$2\">$1</a>");
    str = str.replaceAll("\n", "<br>");
    return str;
}

export function useForm$($inputNodeList) {
    return rxjs.pipe(
        rxjs.mergeMap(() => $inputNodeList()),
        rxjs.mergeMap(($el) => rxjs.fromEvent($el, "input")),
        rxjs.mergeMap(($el) => {
            if ($el.target.checkValidity() === false) {
                $el.target.reportValidity();
                return rxjs.EMPTY;
            }
            return rxjs.of($el);
        }),
        rxjs.mergeMap(async(e) => ({
            name: e.target.getAttribute("name"),
            value: await (async function() {
                switch (e.target.getAttribute("type")) {
                case "checkbox":
                    return e.target.checked;
                case "file":
                    if (e.target.files.length === 0) return null;
                    return await new Promise((done) => {
                        const reader = new window.FileReader();
                        reader.readAsDataURL(e.target.files[0]);
                        reader.onload = () => done(reader.result);
                    });
                default:
                    return e.target.value;
                }
            }()),
        })),
        rxjs.scan((store, keyValue) => {
            store[keyValue.name] = keyValue.value;
            return store;
        }, {})
    );
}

export function formObjToJSON$() {
    const formObjToJSON = (o, level = 0) => {
        const obj = Object.assign({}, o);
        Object.keys(obj).forEach((key) => {
            const t = obj[key];
            if ("label" in t && "type" in t && "default" in t && "value" in t) {
                let value = obj[key].value;
                if (t.type === "number") value = parseInt(value);
                obj[key] = value;
            } else {
                obj[key] = formObjToJSON(obj[key], level + 1);
            }
        });
        return obj;
    };
    return rxjs.map(formObjToJSON);
}
