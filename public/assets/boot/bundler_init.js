window.bundler = (function(origin) {
    const esModules = {};
    return {
        register: (path, code) => {
            if (path.endsWith(".js")) {
                code = code.replace(/from\s?"([^"]+)"/g, (_, spec) =>
                    `from "${new URL(spec, origin + path).href}"`,
                );
                code = code.replace(/\bimport\s+"([^"]+)"/g, (_, spec) =>
                    `import "${new URL(spec, origin + path).href}"`,
                );
                code = code.replace(/(?<!["])\bimport\.meta\.url\b(?!["])/g, `"${origin + path}"`);
                code += `\n//# sourceURL=${path}`;
                esModules[origin + path] = "data:text/javascript," + encodeURIComponent(code);
            } else if (path.endsWith(".css")) {
                code = code.replace(/@import url\("([^"]+)"\);/g, (m, rel) => {
                    const $style = document.head.querySelector(`style[id="${new URL(rel, origin + path).href}"]`);
                    if (!$style) throw new DOMException(
                        `Missing CSS dependency: ${rel} (referenced from ${path})`,
                        "NotFoundError",
                    );
                    return `/* ${m} */`;
                });
                code += `\n/*# sourceURL=${path} */`;
                document.head.appendChild(Object.assign(document.createElement("style"), {
                    innerHTML: code,
                    id: origin + path,
                }));
            }
        },
        esModules,
    };
})(new URL(import.meta.url).origin);
