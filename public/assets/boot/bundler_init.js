window.bundler = (function(origin) {
    const esModules = {};
    return {
        register: (path, code) => {
            const fullpath = origin + path;
            if (path.endsWith(".js")) {
                code = code.replace(/from\s?"([^"]+)"/g, (_, spec) =>
                    `from "${new URL(spec, fullpath).href}"`,
                );
                code = code.replace(/\bimport\s+"([^"]+)"/g, (_, spec) =>
                    `import "${new URL(spec, fullpath).href}"`,
                );
                code = code.replace(
                    /(?<!["])\bimport\.meta\.url\b(?!["])/g,
                    `"${fullpath}"`,
                );
                esModules[fullpath] = "data:text/javascript," + encodeURIComponent(
                    code + `\n//# sourceURL=${path}`,
                );
            } else if (path.endsWith(".css")) {
                code = code.replace(/@import url\("([^"]+)"\);/g, (m, rel) => {
                    const $style = document.head.querySelector(
                        `style[id="${new URL(rel, fullpath).href}"]`
                    );
                    if (!$style) throw new DOMException(
                        `Missing CSS dependency: ${rel} (referenced from ${path})`,
                        "NotFoundError",
                    );
                    return `/* ${m} */`;
                });
                document.head.appendChild(Object.assign(document.createElement("style"), {
                    innerHTML: code + `\n/*# sourceURL=${path} */`,
                    id: fullpath,
                }));
            }
        },
        esModules,
    };
})(new URL(import.meta.url).origin);
