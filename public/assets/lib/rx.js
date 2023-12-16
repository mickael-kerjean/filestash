import { onDestroy } from "./skeleton/index.js";
import assert from "./assert.js";
import * as rxjs from "./vendor/rxjs/rxjs.min.js";
import * as ajaxModule from "./vendor/rxjs/rxjs-ajax.min.js"; // https://github.com/ReactiveX/rxjs/issues/4416#issuecomment-620847759

export default rxjs;
export const ajax = ajaxModule.ajax;

export function effect(obs) {
    const sub = obs.subscribe(() => {}, (err) => { throw err; });
    onDestroy(() => sub.unsubscribe());
    return sub.unsubscribe.bind(sub);
}

const getFn = (obj, arg0, ...args) => {
    if (arg0 === undefined) return obj;
    const next = obj[arg0];
    return getFn(next.bind ? next.bind(obj) : next, ...args);
};

export function applyMutation($node, ...keys) {
    assert.type($node, window.HTMLElement);
    const execute = getFn($node, ...keys);
    return rxjs.tap((val) => Array.isArray(val) ? execute(...val) : execute(val));
}

export function applyMutations($node, ...keys) {
    assert.type($node, window.HTMLElement);
    const execute = getFn($node, ...keys);
    return rxjs.tap((vals) => vals.forEach((val) => execute(val)));
}

export function stateMutation($node, attr) {
    assert.type($node, window.HTMLElement);
    return rxjs.tap((val) => $node[attr] = val);
}

export function preventDefault() {
    return rxjs.tap((e) => e.preventDefault());
}

export function onClick($node) {
    assert.type($node, window.HTMLElement);
    return rxjs.fromEvent($node, "click").pipe(
        rxjs.map(() => $node)
    );
}

export function onLoad($node) {
    assert.type($node, window.HTMLElement);
    return new rxjs.Observable((observer) => {
        $node.onload = () => {
            observer.next($node);
            observer.complete();
        };
        $node.onerror = (err) => observer.error(err);
    });
}
