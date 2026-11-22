// Diplodoc's synchronous include plugin sees only files loaded through the Filestash API.
export const files = Object.create(null);
export const missing = new Set();

export function resetFiles(loaded) {
    for (const path of Object.keys(files)) delete files[path];
    for (const [path, text] of loaded) {
        if (text !== null) files[path] = text || "\n";
    }
    missing.clear();
}

export function readFileSync(path) {
    if (Object.hasOwn(files, path)) return files[path];
    missing.add(path);
    throw Object.assign(new Error("Include unavailable"), {path, code: "ENOENT"});
}

export function realpathSync(path) {
    return path;
}

export function statSync(path) {
    return {isFile: () => Object.hasOwn(files, path)};
}
