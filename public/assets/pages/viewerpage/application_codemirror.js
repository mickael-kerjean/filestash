import { createElement } from "../../lib/skeleton/index.js";
import { loadCSS, loadJS } from "../../helpers/loader.js";

export default async function(render) {
    const $page = createElement(`<div></div>`);
    render($page);

    const editor = window.CodeMirror($page, {
        value: "Hello WOrld",
        lineNumbers: true,
        // mode: mode,
        // keyMap: ["emacs", "vim"].indexOf(CONFIG["editor"]) === -1 ?
        //     "sublime" : CONFIG["editor"],
        lineWrapping: true,
        // readOnly: !this.props.readonly,
        foldOptions: {
            widget: "...",
        },
        matchBrackets: {},
        autoCloseBrackets: true,
        matchTags: { bothTags: true },
        autoCloseTags: true,
    });
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "../../lib/vendor/codemirror/lib/codemirror.css"),
        loadJS(import.meta.url, "../../lib/vendor/codemirror/lib/codemirror.js"),
        loadCSS(import.meta.url, "./application_codemirror.css"),
    ]);
}
