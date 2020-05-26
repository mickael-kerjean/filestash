export function t(str = "", replacementString, requestedKey){
    const calculatedKey = str.toUpperCase().replace(/ /g, "_").replace(/[^a-zA-Z0-9\-\_\*\{\}\?]/g, "").replace(/\_+$/, "");
    const value = requestedKey === undefined ? window.LNG && window.LNG[calculatedKey] : window.LNG && window.LNG[requestedKey];
    return reformat(
        value || str || "",
        str
    ).replace("{{VALUE}}", replacementString);
}

function reformat(translated, initial){
    if(initial[0] && initial[0].toLowerCase() === initial[0]){
        return translated || "";
    }
    return (translated[0] && translated[0].toUpperCase() + translated.substring(1)) || "";
}
