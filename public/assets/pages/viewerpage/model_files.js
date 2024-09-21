import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import { getCurrentPath } from "./common.js";
import { forwardURLParams } from "../../lib/path.js";

export const options = () => ajax({
    url: forwardURLParams(`api/files/cat?path=${encodeURIComponent(getCurrentPath())}`, ["share"]),
    method: "OPTIONS",
}).pipe(rxjs.map((res) => res.responseHeaders.allow.replace(/\r/, "").split(", ")));

export const cat = () => ajax({
    url: forwardURLParams("api/files/cat?path=" + encodeURIComponent(getCurrentPath()), ["share"]),
    method: "GET",
}).pipe(
    rxjs.map(({ response }) => response),
);

export const save = (content) => ajax({
    url: forwardURLParams("api/files/cat?path=" + encodeURIComponent(getCurrentPath()), ["share"]),
    method: "POST",
    body: content,
});
