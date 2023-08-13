import { onDestroy } from "./skeleton/index.js";

// https://github.com/ReactiveX/rxjs/issues/4416#issuecomment-620847759
import * as rxjs from "./vendor/rxjs.min.js";
import * as ajaxModule from "./vendor/rxjs-ajax.min.js";

export default rxjs;
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
    return rxjs.tap((val) => execute(...val));
}

export function stateMutation($node, attr) {
    if (!$node) throw new Error("undefined node");
    return rxjs.tap((val) => $node[attr] = val);
}

export function preventDefault() {
    return rxjs.tap((e) => e.preventDefault());
}
