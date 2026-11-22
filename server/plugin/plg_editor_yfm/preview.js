const preview = document.getElementById("preview");

window.addEventListener("message", (event) => {
    if (event.source !== window.parent || event.origin !== new URL(location.href).origin) return;
    const template = document.createElement("template");
    template.innerHTML = event.data.html || "";
    for (const embed of template.content.querySelectorAll("iframe, object, embed")) embed.remove();
    for (const link of template.content.querySelectorAll("a[href]")) {
        if (link.getAttribute("href").startsWith("#")) continue;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
    }
    preview.replaceChildren(template.content);
    if (event.data.anchor) scrollToAnchor(event.data.anchor);
});

preview.addEventListener("click", (event) => {
    const href = event.target.closest('a[href^="#"]')?.getAttribute("href");
    if (!href) return;
    event.preventDefault();
    scrollToAnchor(href);
});

function scrollToAnchor(href) {
    try {
        document.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView();
    } catch {
        // A malformed fragment has no destination.
    }
}
