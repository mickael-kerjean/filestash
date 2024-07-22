export async function loadJS(baseURL, path, opts = {}) {
    const $script = document.createElement("script");
    const link = new URL(path, baseURL);
    $script.setAttribute("src", link.toString());
    for (const key in opts) {
        $script.setAttribute(key, opts[key]);
    }
    if (document.head.querySelector(`[src="${link.toString()}"]`)) return Promise.resolve();
    document.head.appendChild($script);
    return new Promise((done) => {
        $script.onload = () => done();
        $script.onerror = () => done();
    });
}

export async function loadCSS(baseURL, path) {
    const $style = document.createElement("link");
    const link = new URL(path, baseURL);
    $style.setAttribute("href", link.toString());
    $style.setAttribute("rel", "stylesheet");
    if (document.head.querySelector(`[href="${link.toString()}"]`)) return Promise.resolve();
    document.head.appendChild($style);
    return new Promise((done) => {
        $style.onload = done;
        $style.onerror = done;
    });
}

export async function loadCSSInline(baseURL, filename) {
    const res = await fetch(new URL(filename, baseURL).pathname, {
        cache: "force-cache",
    });
    if (res.status !== 200) return `/* ERROR: ${res.status} */`;
    else if (!res.headers.get("Content-Type")?.startsWith("text/css")) return `/* ERROR: wrong type, got "${res.headers?.get("Content-Type")}"*/`;
    return await res.text();
}

export async function CSS(baseURL, ...arrayOfFilenames) {
    const sheets = await Promise.all(arrayOfFilenames.map((filename) => loadCSSInline(baseURL, filename)));
    return sheets.join("\n\n");
}
