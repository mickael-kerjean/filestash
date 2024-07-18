import rxjs, { ajax } from "../lib/rx.js";

let LNG = {};

export default function t(str = "", replacementString, requestedKey) {
    const calculatedKey = str.toUpperCase()
        .replace(/ /g, "_")
        .replace(/[^a-zA-Z0-9\-\_\*\{\}\?]/g, "")
        .replace(/\_+$/, "");

    const value = requestedKey === undefined
        ? LNG && LNG[calculatedKey]
        : LNG && LNG[requestedKey];

    return reformat(
        value || str || "",
        str,
    ).replace("{{VALUE}}", replacementString);
}

export async function init() {
    let selectedLanguage = "en";
    switch (navigator.language) {
    case "zh-TW":
        selectedLanguage = "zh_tw";
        break;
    default:
        const userLanguage = navigator.language.split("-")[0] || "";
        const idx = [
            "az", "be", "bg", "ca", "cs", "da", "de", "el", "es", "et",
            "eu", "fi", "fr", "gl", "hr", "hu", "id", "is", "it", "ja",
            "ka", "ko", "lt", "lv", "mn", "nb", "nl", "pl", "pt", "ro",
            "ru", "sk", "sl", "sr", "sv", "th", "tr", "uk", "vi", "zh",
        ].indexOf(userLanguage);
        if (idx !== -1) {
            selectedLanguage = userLanguage;
        }
    }
    if (selectedLanguage === "en") {
        return Promise.resolve();
    }
    return ajax({
        url: "assets/locales/" + selectedLanguage + ".json",
        responseType: "json",
    }).pipe(rxjs.tap(({ responseHeaders, response }) => {
        const contentType = responseHeaders["content-type"].trim();
        if (contentType === "application/json") {
            LNG = response;
            return;
        }
        throw new Error(`wrong content type '${contentType}'`);
    })).toPromise();
}

function reformat(translated, initial) {
    if (initial[0] && initial[0].toLowerCase() === initial[0]) {
        return translated || "";
    }
    return (translated[0] && translated[0].toUpperCase() + translated.substring(1)) || "";
}
