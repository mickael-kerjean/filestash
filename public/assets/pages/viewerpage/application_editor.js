import { createElement, onDestroy } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { animate, slideXIn, opacityOut } from "../../lib/animate.js";
import { qs } from "../../lib/dom.js";
import { createLoader } from "../../components/loader.js";
import { createModal, MODAL_RIGHT_BUTTON } from "../../components/modal.js";
import { loadCSS, loadJS } from "../../helpers/loader.js";
import ajax from "../../lib/ajax.js";
import { extname } from "../../lib/path.js";
import { get as getConfig } from "../../model/config.js";
import t from "../../locales/index.js";

import ctrlError from "../ctrl_error.js";
import ctrlDownloader, { init as initDownloader } from "./application_downloader.js";
import { transition, getFilename, getCurrentPath } from "./common.js";
import { $ICON } from "./common_fab.js";
import { options, cat, save } from "./model_files.js";

import "../../components/menubar.js";
import "../../components/fab.js";
import "../../components/icon.js";

const TIME_BEFORE_ABORT_EDIT = 5000;

export default async function(render) {
    const $page = createElement(`
        <div class="component_ide">
            <component-menubar class="hidden"></component-menubar>
            <div class="component_editor hidden"></div>
            <button is="component-fab" class="hidden"></button>
        </div>
    `);
    render($page);

    const $dom = {
        editor: () => qs($page, ".component_editor"),
        menubar: () => qs($page, "component-menubar"),
        fab: () => qs($page, `[is="component-fab"]`),
    };
    const getConfig$ = getConfig().pipe(rxjs.shareReplay(1));
    const content$ = new rxjs.ReplaySubject(1);

    // feature1: setup the dom
    const removeLoader = createLoader($page);
    const setup$ = rxjs.race(
        cat(),
        ajax("about").pipe(rxjs.delay(TIME_BEFORE_ABORT_EDIT), rxjs.map(() => null)),
    ).pipe(
        rxjs.mergeMap((content) => {
            if (content === null || has_binary(content)) {
                return rxjs.from(initDownloader()).pipe(
                    removeLoader,
                    rxjs.mergeMap(() => {
                        ctrlDownloader(render);
                        return rxjs.EMPTY;
                    }),
                );
            }
            return rxjs.of(content);
        }),
        rxjs.mergeMap((content) => getConfig$.pipe(
            rxjs.mergeMap((config) => rxjs.from(loadKeybinding(config.editor)).pipe(rxjs.mapTo(config))),
            rxjs.map((config) => [content, config]),
            rxjs.mergeMap((arr) => rxjs.from(loadMode(extname(getFilename()))).pipe(
                rxjs.map((mode) => arr.concat([mode])),
            )),
            rxjs.mergeMap((arr) => options().pipe(
                rxjs.map((acl) => arr.concat([acl])),
            )),
        )),
        removeLoader,
        rxjs.map(([content, config, mode, acl]) => {
            const $editor = $dom.editor();
            content$.next(content);
            $editor.classList.remove("hidden");
            const editor = window.CodeMirror($editor, {
                value: content,
                lineNumbers: true,
                mode: window.CodeMirror.__mode,
                keyMap: ["emacs", "vim"].indexOf(config["editor"]) === -1 ? "sublime" : config["editor"],
                lineWrapping: true,
                readOnly: !/PUT/.test(acl),
                foldOptions: { widget: "..." },
                matchBrackets: {},
                autoCloseBrackets: true,
                matchTags: { bothTags: true },
                autoCloseTags: true,
            });
            // transition($editor);
            editor.getWrapperElement().setAttribute("mode", mode);
            if (!("ontouchstart" in window)) editor.focus();
            if (config["editor"] === "emacs") editor.addKeyMap({
                "Ctrl-X Ctrl-C": (cm) => window.history.back(),
            });
            onDestroy(() => editor.clearHistory());
            $dom.menubar().classList.remove("hidden");
            editor.execCommand("save");
            return editor;
        }),
        // rxjs.tap(() => { debugger; }),
        rxjs.tap((editor) => requestAnimationFrame(() => editor.refresh())),
        rxjs.catchError(ctrlError()),
        rxjs.share(),
    );
    effect(setup$);

    // feature2: handle resize
    effect(setup$.pipe(
        rxjs.mergeMap((editor) => rxjs.fromEvent(window, "resize").pipe(
            rxjs.tap(() => editor.refresh()),
        )),
    ));

    // feature3: handle UI for edit
    effect(setup$.pipe(
        rxjs.switchMap((editor) => new rxjs.Observable((observer) => editor.on("change", (cm) => observer.next(cm)))),
        rxjs.mergeMap((editor) => content$.pipe(rxjs.map((oldContent) => [editor, editor.getValue(), oldContent]))),
        rxjs.tap(async([editor, newContent = "", oldContent = ""]) => {
            const $fab = $dom.fab();
            if ($fab.disabled) return;
            const $breadcrumb = qs(document.body, `[is="component-breadcrumb"]`);
            if (newContent === oldContent) {
                await animate($fab, { time: 100, keyframes: opacityOut() });
                $fab.classList.add("hidden");
                $breadcrumb.removeAttribute("indicator");
                return;
            }
            $breadcrumb.setAttribute("indicator", "true");
            const shouldAnimate = $fab.classList.contains("hidden");
            $fab.classList.remove("hidden");
            $fab.render($ICON.SAVING);
            $fab.onclick = () => window.CodeMirror.commands.save(editor);

            if (shouldAnimate) await animate($fab, { time: 100, keyframes: slideXIn(40) });
        }),
    ));

    // feature4: save
    effect(setup$.pipe(
        rxjs.mergeMap((editor) => new rxjs.Observable((observer) => {
            window.CodeMirror.commands.save = (cm) => observer.next(cm);
        })),
        rxjs.mergeMap((cm) => {
            const $fab = $dom.fab();
            $fab.classList.remove("hidden");
            $fab.render($ICON.LOADING);
            $fab.disabled = true;
            const content = cm.getValue();
            return save(content).pipe(rxjs.tap(() => {
                $fab.removeAttribute("disabled");
                content$.next(content);
            }));
        }),
        rxjs.catchError(ctrlError()),
    ));

    // feature5: save on exit
    effect(setup$.pipe(
        rxjs.tap((cm) => window.history.block = async (href) => {
            const block = qs(document.body, `[is="component-breadcrumb"]`).hasAttribute("indicator");
            if (block === false) return false;
            const userAction = await new Promise((done) => {
                createModal({
                    withButtonsRight: t("Yes"),
                    withButtonsLeft: t("No"),
                })(
                    createElement(`
                        <div style="text-align:center;padding-bottom:5px;">
                            Do you want to save the changes ?
                        </div>
                    `),
                    (val) => done(val),
                );
            });
            if (userAction === MODAL_RIGHT_BUTTON) {
                const $fab = $dom.fab();
                $fab.render($ICON.LOADING);
                $fab.disabled = true;
                await save(cm.getValue()).toPromise();
            }
            return false;
        }),
    ));
}

function has_binary(str) {
    let countUnrepresentableChar = 0;
    for (let i=0; i<str.length; i++) {
        if (countUnrepresentableChar > 2) return true;
        else if (str[i] === "\ufffd") countUnrepresentableChar += 1;
    }
    return false;
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "../../lib/vendor/codemirror/lib/codemirror.css"),
        loadJS(import.meta.url, "../../lib/vendor/codemirror/lib/codemirror.js"),
        loadCSS(import.meta.url, "./application_editor.css"),
    ]).then(() => Promise.all([
        loadJS(import.meta.url, "../../lib/vendor/codemirror/keymap/emacs.js"),
        // search
        loadJS(import.meta.url, "../../lib/vendor/codemirror/addon/search/searchcursor.js"),
        loadJS(import.meta.url, "../../lib/vendor/codemirror/addon/search/search.js"),
        loadJS(import.meta.url, "../../lib/vendor/codemirror/addon/comment/comment.js"),
        loadJS(import.meta.url, "../../lib/vendor/codemirror/addon/dialog/dialog.js"),
        // folding
        loadJS(import.meta.url, "../../lib/vendor/codemirror/addon/fold/foldcode.js"),
        loadJS(import.meta.url, "../../lib/vendor/codemirror/addon/fold/foldgutter.js"),
        loadCSS(import.meta.url, "../../lib/vendor/codemirror/addon/fold/foldgutter.css"),
        // editing feature
        loadJS(import.meta.url, "../../lib/vendor/codemirror/addon/edit/matchbrackets.js"),
        loadJS(import.meta.url, "../../lib/vendor/codemirror/addon/edit/closebrackets.js"),
        loadJS(import.meta.url, "../../lib/vendor/codemirror/addon/edit/closetag.js"),
    ]));
}

function loadMode(ext) {
    let mode = "text";
    let before = Promise.resolve();

    if (ext === "org" || ext === "org_archive") {
        mode = "orgmode";
        before = loadJS(import.meta.url, "../../lib/vendor/codemirror/addon/fold/xml-fold.js").then(() => loadJS(import.meta.url, "../../lib/vendor/codemirror/addon/edit/matchtags.js"));
    } else if (ext === "sh") mode = "shell";
    else if (ext === "py") mode = "python";
    else if (ext === "html" || ext === "htm") {
        mode = "htmlmixed";
        before = Promise.all([
            loadJS(import.meta.url, "../../lib/vendor/codemirror/mode/xml/xml.js"),
            loadJS(import.meta.url, "../../lib/vendor/codemirror/mode/javascript/javascript.js"),
            loadJS(import.meta.url, "../../lib/vendor/codemirror/mode/css/css.js"),
        ]);
    } else if (ext === "css") mode = "css";
    else if (ext === "less" || ext === "scss" || ext === "sass") mode = "sass";
    else if (ext === "js" || ext === "json") mode = "javascript";
    else if (ext === "jsx") mode = "jsx";
    else if (ext === "php" || ext === "php5" || ext === "php4") mode = "php";
    else if (ext === "elm") mode = "elm";
    else if (ext === "erl") mode = "erlang";
    else if (ext === "go") mode = "go";
    else if (ext === "markdown" || ext === "md") {
        mode = "yaml-frontmatter";
        before = Promise.all([
            loadJS(import.meta.url, "../../lib/vendor/codemirror/mode/markdown/markdown.js"),
            loadJS(import.meta.url, "../../lib/vendor/codemirror/mode/gfm/gfm.js"),
            loadJS(import.meta.url, "../../lib/vendor/codemirror/mode/yaml/yaml.js"),
            loadJS(import.meta.url, "../../lib/vendor/codemirror/addon/mode/overlay.js"),
        ]);
    } else if (ext === "pl" || ext === "pm") mode = "perl";
    else if (ext === "clj") mode = "clojure";
    else if (ext === "el" || ext === "lisp" || ext === "cl" ||
             ext === "emacs") mode = "commonlisp";
    else if (ext === "dockerfile") {
        mode = "dockerfile";
        before = loadJS(import.meta.url, "../../lib/vendor/codemirror/addon/mode/simple.js");
    } else if (ext === "R") mode = "r";
    else if (ext === "makefile") mode = "cmake";
    else if (ext === "rb") mode = "ruby";
    else if (ext === "sql") mode = "sql";
    else if (ext === "xml" || ext === "rss" || ext === "svg" ||
             ext === "atom") mode = "xml";
    else if (ext === "yml" || ext === "yaml") mode = "yaml";
    else if (ext === "lua") mode = "lua";
    else if (ext === "csv") mode = "spreadsheet";
    else if (ext === "rs" || ext === "rlib") mode = "rust";
    else if (ext === "latex" || ext === "tex") mode = "stex";
    else if (ext === "diff" || ext === "patch") mode = "diff";
    else if (ext === "sparql") mode = "sparql";
    else if (ext === "properties") mode = "properties";
    else if (ext === "c" || ext === "cpp" || ext === "h") mode = "clike";
    else if (ext === "java") mode = "java";

    return before.then(() => loadJS(import.meta.url, `./application_editor/${mode}.js`, { type: "module" }))
        .catch(() => loadJS(import.meta.url, "./application_editor/text.js", { type: "module" }))
        .then((module) => Promise.resolve(mode));
}

function loadKeybinding(editor) {
    if (editor === "emacs" || !editor) {
        return Promise.resolve();
    }
    return loadJS(import.meta.url, `./application_editor/keymap_${editor}.js`, { type: "module" });
}
