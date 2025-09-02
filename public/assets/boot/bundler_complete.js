document.head.appendChild(Object.assign(document.createElement("script"), {
    type: "importmap",
    textContent: JSON.stringify({
        imports: window.bundler.esModules,
    }, null, 4),
}));
