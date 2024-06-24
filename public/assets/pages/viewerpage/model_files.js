import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import { getDownloadUrl, getCurrentPath } from "./common.js";

export const options = () => ajax({
    url: `api/files/cat?path=${encodeURIComponent(getCurrentPath())}`,
    method: "OPTIONS",
}).pipe(rxjs.map((res) => res.responseHeaders.allow.replace(/\r/, "").split(", ")));

export const cat = () => ajax(getDownloadUrl()).pipe(
    rxjs.map(({ response }) => response),
);

export const save = (content) => ajax({
    url: getDownloadUrl(),
    method: "POST",
    body: content,
});
