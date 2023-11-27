import { onDestroy } from "./skeleton/index.js";
import * as rxjs from "./vendor/rxjs.min.js";

// https://github.com/ReactiveX/rxjs/issues/4416#issuecomment-620847759
import * as ajaxModule from "./vendor/rxjs-ajax.min.js";

export default rxjs;
export const ajax = ajaxModule.ajax;

export function effect(obs) {
    const tmp = obs.subscribe(() => {}, (err) => { throw err; });
    onDestroy(() => tmp.unsubscribe());
}

const getFn = (obj, arg0, ...args) => {
    if (arg0 === undefined) return obj;
    const next = obj[arg0];
    return getFn(next.bind ? next.bind(obj) : next, ...args);
};

export function applyMutation($node, ...keys) {
    if (!$node) throw new Error("undefined node");
    const execute = getFn($node, ...keys);
    return rxjs.tap((val) => Array.isArray(val) ? execute(...val) : execute(val));
}

export function applyMutations($node, ...keys) {
    if (!$node) throw new Error("undefined node");
    const execute = getFn($node, ...keys);
    return rxjs.tap((vals) => vals.forEach((val) => {
        execute(val);
    }));
}

export function stateMutation($node, attr) {
    if (!$node) throw new Error("undefined node");
    return rxjs.tap((val) => $node[attr] = val);
}

export function preventDefault() {
    return rxjs.tap((e) => e.preventDefault());
}

export function onClick($node) {
    if (!$node) return rxjs.EMPTY;
    return rxjs.fromEvent($node, "click").pipe(
        rxjs.map(() => $node),
    );
}
