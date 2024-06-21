import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import { getDownloadUrl } from "./common.js";

export const options = (path) => ajax({
    url: `api/files/cat?path=${path}`,
    method: "OPTIONS",
}).pipe(rxjs.map((res) => res.responseHeaders.allow.replace(/\r/, "").split(", ")));

export const cat = () => ajax(getDownloadUrl()).pipe(
    rxjs.map(({ response }) => response),
);

export const save = () => {
    return rxjs.pipe(
        rxjs.delay(2000),
        rxjs.tap((content) => console.log("SAVED")),
    );
};
