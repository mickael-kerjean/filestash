const MIN = 20;
const MAX = 80;

export function addDivider(host, editor, label) {
    const divider = document.createElement("div");
    divider.className = "yfm-divider";
    divider.hidden = true;
    divider.tabIndex = 0;
    divider.setAttribute("role", "separator");
    divider.setAttribute("aria-label", label);
    divider.setAttribute("aria-controls", "filestash-yfm-panel");
    divider.setAttribute("aria-valuemin", MIN);
    divider.setAttribute("aria-valuemax", MAX);
    host.append(divider);

    const narrow = matchMedia("(max-width: 760px)");
    let position = 50;
    let refresh;

    function move(value) {
        position = Math.min(MAX, Math.max(MIN, value));
        host.style.setProperty("--yfm-split", position + "%");
        divider.setAttribute("aria-valuenow", Math.round(position));
        cancelAnimationFrame(refresh);
        refresh = requestAnimationFrame(() => editor.refresh());
    }

    function orientation() {
        divider.setAttribute("aria-orientation", narrow.matches ? "horizontal" : "vertical");
    }

    divider.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        divider.setPointerCapture(event.pointerId);
        host.classList.add("yfm-resizing");
    });
    divider.addEventListener("pointermove", (event) => {
        if (!divider.hasPointerCapture(event.pointerId)) return;
        const bounds = host.getBoundingClientRect();
        move(narrow.matches ?
            100 * (event.clientY - bounds.top) / bounds.height :
            100 * (event.clientX - bounds.left) / bounds.width);
    });
    divider.addEventListener("lostpointercapture", () => host.classList.remove("yfm-resizing"));
    divider.addEventListener("keydown", (event) => {
        const decrease = narrow.matches ? "ArrowUp" : "ArrowLeft";
        const increase = narrow.matches ? "ArrowDown" : "ArrowRight";
        const positions = {[decrease]: position - 5, [increase]: position + 5, Home: MIN, End: MAX};
        if (!Object.hasOwn(positions, event.key)) return;
        event.preventDefault();
        move(positions[event.key]);
    });

    divider.setAttribute("aria-valuenow", position);
    orientation();
    return {
        show() {
            orientation();
            narrow.addEventListener("change", orientation);
            divider.hidden = false;
        },
        hide() {
            divider.hidden = true;
            host.classList.remove("yfm-resizing");
            narrow.removeEventListener("change", orientation);
            cancelAnimationFrame(refresh);
        },
    };
}

export function editorScrollPosition(editor) {
    const {top, height, clientHeight} = editor.getScrollInfo();
    if (top < 1) return "top";
    if (height - clientHeight - top < 1) return "bottom";
    const line = editor.lineAtHeight(top, "local");
    const start = editor.heightAtLine(line, "local");
    const end = editor.heightAtLine(line + 1, "local");
    return line + Math.min(1, Math.max(0, (top - start) / Math.max(1, end - start)));
}

export function editorScrollTarget(editor, position) {
    if (position === "top") return 0;
    const {height, clientHeight} = editor.getScrollInfo();
    const max = Math.max(0, height - clientHeight);
    if (position === "bottom") return max;
    const line = Math.min(Math.floor(position), editor.lastLine());
    const start = editor.heightAtLine(line, "local");
    const end = editor.heightAtLine(line + 1, "local");
    return Math.min(max, start + (position - line) * (end - start));
}
