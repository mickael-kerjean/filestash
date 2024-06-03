import rxjs from "../../lib/rx.js";
import { get as getConfig } from "../../model/config.js";

const config$ = getConfig().pipe(rxjs.shareReplay(1));

export function get() {
    return config$;
}
