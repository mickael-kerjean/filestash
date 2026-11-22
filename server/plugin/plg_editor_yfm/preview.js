const preview = document.getElementById("preview");
const scroller = document.scrollingElement;
let sourceLines = 0;
let scrollPoints;
let ignoreScrollTop;

window.addEventListener("message", (event) => {
    if (event.source !== window.parent || event.origin !== new URL(location.href).origin) return;
    const message = event.data;
    if (message.type === "scroll") {
        scrollToSource(message.position);
        return;
    }
    if (message.type === "theme" || message.type === "render") document.documentElement.dataset.theme = message.theme;
    if (message.type !== "render") return;

    const template = document.createElement("template");
    template.innerHTML = message.html || "";
    for (const embed of template.content.querySelectorAll("iframe, object, embed")) embed.remove();
    for (const link of template.content.querySelectorAll("a[href]")) {
        const href = link.getAttribute("href");
        if (href.startsWith("#")) continue;
        if (!/^(https?:\/\/|mailto:|tel:)/i.test(href)) {
            link.removeAttribute("href");
            continue;
        }
        link.target = "_blank";
        link.rel = "noopener noreferrer";
    }
    preview.replaceChildren(template.content);
    sourceLines = message.lines;
    scrollPoints = undefined;
    if (message.anchor) scrollToAnchor(message.anchor);
    else scrollToSource(message.position);
});

new ResizeObserver(() => { scrollPoints = undefined; }).observe(preview);

window.addEventListener("scroll", () => {
    const top = scroller.scrollTop;
    if (Math.abs(top - ignoreScrollTop) < 1) return;
    ignoreScrollTop = undefined;
    if (!sourceLines) return;
    const max = scroller.scrollHeight - scroller.clientHeight;
    if (max < 1) return;
    const position = top < 1 ? "top" : max - top < 1 ? "bottom" : interpolate(top, "top", "line");
    window.parent.postMessage({type: "scroll", position}, new URL(location.href).origin);
});

function scrollToSource(position) {
    if (!sourceLines) return;
    const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const top = position === "top" ? 0 : position === "bottom" ? max :
        Math.min(max, interpolate(position, "line", "top"));
    // Replacing the preview HTML can clamp its scroll before the browser dispatches the event.
    scroller.scrollTop = top;
    ignoreScrollTop = scroller.scrollTop;
}

function getScrollPoints() {
    if (scrollPoints) return scrollPoints;
    const points = [{line: 0, top: 0}];
    for (const marker of preview.querySelectorAll(".yfm-scroll-anchor[data-yfm-line]")) {
        const line = Number(marker.dataset.yfmLine);
        const top = marker.getBoundingClientRect().top + scroller.scrollTop;
        const previous = points.at(-1);
        if (line > previous.line && line < sourceLines && top > previous.top) points.push({line, top});
    }
    points.push({line: sourceLines, top: Math.max(preview.offsetHeight, points.at(-1).top + 1)});
    return scrollPoints = points;
}

function interpolate(value, from, to) {
    const points = getScrollPoints();
    let left = 0;
    let right = points.length - 1;
    while (right - left > 1) {
        const middle = Math.floor((left + right) / 2);
        if (points[middle][from] > value) right = middle;
        else left = middle;
    }
    const start = points[left], end = points[right];
    const fraction = Math.min(1, Math.max(0, (value - start[from]) / (end[from] - start[from])));
    return start[to] + fraction * (end[to] - start[to]);
}

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
