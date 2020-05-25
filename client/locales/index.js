export function t(str = "", value){
    const key = str.toUpperCase().replace(/ /g, "_").replace(/[^a-zA-Z0-9\-\_\*\{\}\?]/g, "").replace(/\_+$/, "");
    return reformat(
        (window.LNG && window.LNG[key]) || str || "",
        key
    ).replace("{{VALUE}}", value);
}

function reformat(translated, initial){
    if(initial[0] && initial[0].toLowerCase() === initial[0]){
        return translated || "";
    }
    return (translated[0] && translated[0].toUpperCase() + translated.substring(1)) || "";
}
