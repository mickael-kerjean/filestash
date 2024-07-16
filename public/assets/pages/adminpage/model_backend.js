import rxjs from "../../lib/rx.js";

import { getBackends as _getBackends } from "../../model/backend.js";
import { isSaving } from "./model_config.js";

const backend$ = _getBackends().pipe(rxjs.shareReplay(1));

export function getBackends() {
    return isSaving().pipe(
        rxjs.filter((loading) => !loading),
        rxjs.mergeMap(() => backend$),
    );
}
