import rxjs from "../../lib/rx.js";
import { basename, forwardURLParams } from "../../lib/path.js";
import ajax from "../../lib/ajax.js";

export const tagFilter = (path) => rxjs.mergeMap((resp) => {
    const tags = new URLSearchParams(location.search).getAll("tag");
    if (tags.length === 0) return rxjs.of(resp);
    return ajax({
        url: forwardURLParams(`api/metadata/search`, ["share"]),
        body: JSON.stringify({
            "tags": new URLSearchParams(location.search).getAll("tag"),
            path,
        }),
        method: "POST",
        responseType: "json",
    }).pipe(
        rxjs.mergeMap((tags) => rxjs.of(Object.keys(tags.responseJSON.results).map((fullpath) => ({
            name: basename(fullpath.replace(new RegExp("/$"), "")),
            type: fullpath.slice(-1) === "/" ? "directory" : "file",
            size: -1,
            path: fullpath,
        })))),
        rxjs.map((files) => {
            resp.files = files;
            return resp;
        }),
    );
});
