export function settingsGet(initialValues, prefix = "") {
    const raw = JSON.parse(localStorage.getItem("settings") || "{}") || {};
    const currentSettings = {};
    Object.keys(initialValues).forEach((key) => {
        const settingsKey = prefix ? `${prefix}_${key}` : key;
        if (settingsKey in raw) currentSettings[key] = raw[settingsKey];
        else currentSettings[key] = initialValues[key];
    });
    return currentSettings;
}

export function settingsSave(currentValues, prefix = "") {
    const raw = JSON.parse(localStorage.getItem("settings") || "{}") || {};
    Object.keys(currentValues).forEach((key) => {
        const settingsKey = prefix ? `${prefix}_${key}` : key;
        raw[settingsKey] = currentValues[key];
    });
    localStorage.setItem("settings", JSON.stringify(raw));
}
