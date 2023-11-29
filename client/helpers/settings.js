const settings = JSON.parse(window.localStorage.getItem("settings")) || {};

export function settings_get(key) {
    if (settings[key] === undefined) {
        return null;
    }
    return settings[key];
}

export function settings_put(key, value) {
    settings[key] = value;
    save(settings);
}

function save(d) {
    setTimeout(() => {
        window.localStorage.setItem("settings", JSON.stringify(d));
    }, 500);
}
