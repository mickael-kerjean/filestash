const settings = JSON.parse(window.localStorage.getItem("settings") || "null") || {};

export function settings_get(key, def = null) {
    if (settings[key] === undefined) {
        return def;
    }
    return settings[key];
}

export function settings_put(key, value) {
    settings[key] = value;
    setTimeout(() => {
        window.localStorage.setItem("settings", JSON.stringify(settings));
    }, 0);
}
