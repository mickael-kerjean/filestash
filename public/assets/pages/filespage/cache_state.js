let backendID = "na";

export function currentBackend() {
    return backendID;
}

export function currentShare() {
    return new window.URL(location.href).searchParams.get("share") || "";
}

export async function init() {
    // TODO: init session with backendID;
}
