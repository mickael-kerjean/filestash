import { createElement } from "../../lib/skeleton/index.js";
import rxjs from "../../lib/rx.js";

export function renderLeaf({ format, label, description }) {
    return createElement(`
        <label class="no-select">
            <div class="flex">
                <span>
                    ${format(label)}:
                </span>
                <div style="width:100%;" data-bind="children"></div>
            </div>
            <div class="flex">
                <span class="nothing"></span>
                <div style="width:100%;">
                    <div class="description">${(description || "").replaceAll("\n", "<br>")}</div>
                </div>
            </div>
        </label>
    `);
}

export function useForm$($inputNodeList) {
    return rxjs.pipe(
        rxjs.mergeMap(() => $inputNodeList()),
        rxjs.mergeMap(($el) => rxjs.fromEvent($el, "input")),
        rxjs.map((e) => ({
            name: e.target.getAttribute("name"),
            value: (function() {
                switch (e.target.getAttribute("type")) {
                case "checkbox":
                    return e.target.checked;
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
                obj[key] = obj[key].value;
            } else {
                obj[key] = formObjToJSON(obj[key], level + 1);
            }
        });
        return obj;
    };
    return rxjs.map(formObjToJSON);
}
