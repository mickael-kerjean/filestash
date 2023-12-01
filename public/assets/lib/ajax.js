import rxjs, { ajax } from "./rx.js";
import { AjaxError } from "./error.js";

export default function(opts) {
    if (typeof opts === "string") opts = { url: opts, withCredentials: true };
    else if (typeof opts !== "object") throw new Error("unsupported call");
    if (!opts.headers) opts.headers = {};
    opts.headers["X-Requested-With"] = "XmlHttpRequest";
    return ajax({ withCredentials: true, ...opts, responseType: "text" }).pipe(
        rxjs.map((res) => {
            const result = res.xhr.responseText;
            if (opts.responseType === "json") {
                const json = JSON.parse(result);
                if (json.status !== "ok") {
                    throw new AjaxError("Oups something went wrong", result);
                }
                res.responseJSON = json;
            }
            return res;
        }),
        rxjs.catchError((err) => rxjs.throwError(processError(err.xhr, err))),
    );
}

function processError(xhr, err) {
    const response = (function(content) {
        let message = content;
        try {
            message = JSON.parse(content);
        } catch (err) {
            return {
                message: Array.from(new Set(
                    content.replace(/<[^>]*>/g, "")
                        .replace(/\n{2,}/, "\n")
                        .trim()
                        .split("\n")
                )).join(" ")
            };
        }
        return message || { message: "empty response" };
    })(xhr?.responseText || "");

    const message = response.message || null;

    if (window.navigator.onLine === false) {
        return new AjaxError("Connection Lost", err, "NO_INTERNET");
    }
    switch (parseInt(xhr?.status)) {
    case 500:
        return new AjaxError(
            message || "Oups something went wrong with our servers",
            err, "INTERNAL_SERVER_ERROR"
        );
    case 401:
        return new AjaxError(
            message || "Authentication error",
            err, "Unauthorized"
        );
    case 403:
        return new AjaxError(
            message || "You can't do that",
            err, "FORBIDDEN"
        );
    case 413:
        return new AjaxError(
            message || "Payload too large",
            err, "PAYLOAD_TOO_LARGE"
        );
    case 502:
        return new AjaxError(
            message || "The destination is acting weird",
            err, "BAD_GATEWAY"
        );
    case 409:
        return new AjaxError(
            message || "Oups you just ran into a conflict",
            err, "CONFLICT"
        );
    case 0:
        switch (xhr?.responseText) {
        case "":
            return new AjaxError(
                "Service unavailable, if the problem persist, contact your administrator",
                err, "INTERNAL_SERVER_ERROR"
            );
        default:
            return new AjaxError(xhr.responseText, err, "INTERNAL_SERVER_ERROR");
        }
    default:
        return new AjaxError(message || "Oups something went wrong", err);
    }
}
