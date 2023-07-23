import { onDestroy } from "../skeleton/index.js";

// https://github.com/ReactiveX/rxjs/issues/4416#issuecomment-620847759
const rxjsModule = await import("./vendor/rxjs.min.js");
const ajaxModule = await import("./vendor/rxjs-ajax.min.js")

export default rxjsModule;
export const ajax = (opts) => {
    if (typeof opts === "string") return ajaxModule.ajax({ url: opts, headers: { "X-Requested-With": "XmlHttpRequest" }});
    if (typeof opts !== "object") throw new Error("unsupported call");
    if (!opts.headers) opts.headers = {};
    opts.headers["X-Requested-With"] = "XmlHttpRequest";
    return ajaxModule.ajax(opts);
}
export function effect(obs) {
    const tmp = obs.subscribe(() => {}, (err) => console.error("effect", err));
    onDestroy(() => tmp.unsubscribe());
}

export function applyMutation($node, ...keys) {
    if (!$node) throw new Error("undefined node");
    const getFn = (obj, arg0, ...args) => {
        if (arg0 === undefined) return obj;
        const next = obj[arg0];
        return getFn(next.bind ? next.bind(obj) : next, ...args);
    };
    const execute = getFn($node, ...keys);
    return rxjsModule.tap((val) => execute(...val));
}

export function stateMutation($node, attr) {
    if (!$node) throw new Error("dom not found for '" + selector + "'");
    return rxjsModule.tap((val) => $node[attr] = val);
}

export function preventDefault() {
    return rxjsModule.tap((e) => e.preventDefault());
}

window.logger = function(prefix) {
    return rxjsModule.tap((e) => console.log(prefix || "logger: ", e));
}
