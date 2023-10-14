export function generateSkeleton(n) {
    const tmpl = "<div class=\"component_skeleton\"></div>";
    let html = "";
    for (let i = 0; i < n; i++) {
        html += tmpl;
    }
    return html;
}
