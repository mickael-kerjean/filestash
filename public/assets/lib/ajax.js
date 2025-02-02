import rxjs, { ajax } from "./rx.js";
import { AjaxError } from "./error.js";
import { isSDK, urlSDK } from "../helpers/sdk.js";

export default function(opts) {
    if (typeof opts === "string") opts = { url: opts, withCredentials: true };
    else if (typeof opts !== "object") throw new Error("unsupported call");

    if (!opts.headers) opts.headers = {};
    if (!opts.responseType) opts.responseType = "text";
    opts.headers["X-Requested-With"] = "XmlHttpRequest";
    if (window.BEARER_TOKEN) opts.headers["Authorization"] = `Bearer ${window.BEARER_TOKEN}`;

    if (opts.url.startsWith("data:")) return rxjs.of({ response: parseDataUrl(opts.url) });
    if (isSDK()) {
        if (["/api/config"].indexOf(opts.url) === -1) opts.withCredentials = false;
        opts.url = urlSDK(opts.url);
    }

    const responseType = opts.responseType === "json" ? "text" : opts.responseType;
    return ajax({
        withCredentials: true,
        ...opts,
        responseType,
    }).pipe(
        rxjs.map((res) => {
            if (opts.responseType === "json") {
                const result = res.xhr.responseText;
                res.responseJSON = JSON.parse(result);
                if (res.responseJSON.status !== "ok") {
                    throw new AjaxError("Oups something went wrong", result);
                }
            }
            return res;
        }),
        rxjs.catchError((err) => rxjs.throwError(processError(err.xhr, err))),
    );
}

function parseDataUrl(url) {
    const matches = url.match(/^data:(.*?)(;base64)?,(.*)$/);
    if (!matches) throw new Error("Invalid Data URL");

    const isBase64 = !!matches[2];
    const data = matches[3];
    if (isBase64) {
        const binaryString = atob(data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
    const decodedData = decodeURIComponent(data);
    const encoder = new TextEncoder();
    return encoder.encode(decodedData).buffer;
}

function processError(xhr, err) {
    let responseText = "";
    try {
        responseText = xhr?.responseText;
        // InvalidStateError: Failed to read the 'responseText' property from 'XMLHttpRequest': The value is only accessible if the object's 'responseType' is '' or 'text' (was 'arraybuffer').
    } catch (err) {}

    const message = (function(content) {
        try {
            return JSON.parse(content).message;
        } catch (err) {
            return Array.from(new Set(
                content.replace(/<[^>]*>/g, "")
                    .replace(/\n{2,}/, "\n")
                    .trim()
                    .split("\n")
            )).join(" ");
        }
    })(responseText);

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
        switch (responseText) {
        case "":
            return new AjaxError(
                "Service unavailable, if the problem persist, contact your administrator",
                err, "INTERNAL_SERVER_ERROR"
            );
        default:
            return new AjaxError(responseText, err, "INTERNAL_SERVER_ERROR");
        }
    default:
        return new AjaxError(message || "Oups something went wrong", err);
    }
}
