export default async function CSS(importMeta, ...arrayOfFilenames) {
    const sheets = await Promise.all(arrayOfFilenames.map((filename) => loadSingleCSS(importMeta, filename)));
    return sheets.join("\n\n");
}

async function loadSingleCSS(importMeta, filename) {
    const res = await fetch(importMeta.url.replace(/(.*)\/[^\/]+$/, "$1/") + filename);
    if (res.status !== 200) return `/* ERROR: ${res.status} */`;
    else if (!res.headers.get("Content-Type").startsWith("text/css")) return `/* ERROR: wrong type, got "${res.headers.get("Content-Type")}"*/`
    return await res.text();
}
