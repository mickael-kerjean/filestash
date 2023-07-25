import { onDestroy } from "./skeleton/index.js";

// https://github.com/ReactiveX/rxjs/issues/4416#issuecomment-620847759
const rxjsModule = await import("./vendor/rxjs.min.js");
const ajaxModule = await import("./vendor/rxjs-ajax.min.js")

export default rxjsModule;
export const ajax = ajaxModule.ajax;

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

window.dbg = function(prefix) {
    return rxjsModule.tap((e) => console.log(prefix || "logger: ", e));
}
