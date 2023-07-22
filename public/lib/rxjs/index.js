import { onDestroy } from "../skeleton/index.js";

// https://github.com/ReactiveX/rxjs/issues/4416#issuecomment-620847759
const rxjsModule = await import("./vendor/rxjs.min.js");
const ajaxModule = await import("./vendor/rxjs-ajax.min.js")

export default rxjsModule;
export {
    textContent, htmlContent, setAttribute, getAttribute, removeAttribute,
    setValue, addClassList, removeClassList,
} from "./dom.js";
export const ajax = ajaxModule.ajax;
export function effect(obs) {
    const tmp = obs.subscribe(() => {}, (err) => console.error("effect", err));
    onDestroy(() => tmp.unsubscribe());
}
