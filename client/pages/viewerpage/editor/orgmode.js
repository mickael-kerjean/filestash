import 'codemirror/addon/mode/simple';
import {
    org_cycle, org_shifttab, org_metaleft, org_metaright, org_meta_return, org_metaup,
    org_metadown, org_insert_todo_heading, org_shiftleft, org_shiftright, fold, unfold,
    isFold, org_set_fold, org_shiftmetaleft, org_shiftmetaright
} from './emacs-org';

CodeMirror.__mode = 'orgmode';

CodeMirror.defineSimpleMode("orgmode", {
    start: [
        {regex: /^(\*{1,}\s)(TODO|DOING|WAITING|NEXT|)(CANCELLED|CANCEL|DEFERRED|DONE|REJECTED|STOP|STOPPED|)(\s+\[\#[A-C]\]\s+|)(.*?)(?:(\s{10,}|))(\:[\S]+\:|)$/, token: ["header org-level-star","header org-todo","header org-done", "header org-priority", "header", "header void", "header comment"]},
        {regex: /(\+[^\+]+\+)/, token: ["strikethrough"]},
        {regex: /(\*[^\*]+\*)/, token: ["strong"]},
        {regex: /(\/[^\/]+\/)/, token: ["em"]},
        {regex: /(\_[^\_]+\_)/, token: ["link"]},
        {regex: /(\~[^\~]+\~)/, token: ["comment"]},
        {regex: /(\=[^\=]+\=)/, token: ["comment"]},
        {regex: /\[\[[^\[\]]*\]\[[^\[\]]*\]\]/, token: "url"}, // links
        {regex: /\[[xX\s\-\_]?\]/, token: 'qualifier org-toggle'}, // checkbox
        {regex: /\#\+BEGIN_[A-Z]*/, token: "comment", next: "env"}, // comments
        {regex: /:?[A-Z_]+\:.*/, token: "comment"}, // property drawers
        {regex: /(\#\+[A-Z_]*)(\:.*)/, token: ["keyword", 'qualifier']}, // environments
        {regex: /(CLOCK\:|SHEDULED\:|DEADLINE\:)(\s.+)/, token: ["comment", "keyword"]}
    ],
    env: [
        {regex: /.*?\#\+END_[A-Z]*/, token: "comment", next: "start"},
        {regex: /.*/, token: "comment"}
    ]
});
CodeMirror.registerHelper("fold", "orgmode", function(cm, start) {
    // init
    const levelToMatch = headerLevel(start.line);

    // no folding needed
    if(levelToMatch === null) return;

    // find folding limits
    const lastLine = cm.lastLine();
    let end = start.line;
    while(end < lastLine){
        end += 1;
        let level = headerLevel(end);
        if(level && level <= levelToMatch) {
            end = end - 1;
            break;
        };
    }

    return {
        from: CodeMirror.Pos(start.line, cm.getLine(start.line).length),
        to: CodeMirror.Pos(end, cm.getLine(end).length)
    };

    function headerLevel(lineNo) {
        var line = cm.getLine(lineNo);
        var match = /^\*+/.exec(line);
        if(match && match.length === 1 && /header/.test(cm.getTokenTypeAt(CodeMirror.Pos(lineNo, 0)))){
            return match[0].length;
        }
        return null;
    }
});
CodeMirror.registerGlobalHelper("fold", "drawer", function(mode) {
    return mode.name === 'orgmode' ? true : false;
}, function(cm, start) {
    const drawer = isBeginningOfADrawer(start.line);
    if(drawer === false) return;

    // find folding limits
    const lastLine = cm.lastLine();
    let end = start.line;
    while(end < lastLine){
        end += 1;
        if(isEndOfADrawer(end)){
            break
        }
    }
    return {
        from: CodeMirror.Pos(start.line, cm.getLine(start.line).length),
        to: CodeMirror.Pos(end, cm.getLine(end).length)
    };

    function isBeginningOfADrawer(lineNo) {
        var line = cm.getLine(lineNo);
        var match = /^\:.*\:$/.exec(line);
        if(match && match.length === 1 && match[0] !== ':END:'){
            return true;
        }
        return false;
    }
    function isEndOfADrawer(lineNo){
        var line = cm.getLine(lineNo);
        return line.trim() === ':END:' ? true : false;
    }
});



CodeMirror.registerHelper("orgmode", "init", (editor, fn) => {
    editor.setOption("extraKeys", {
        "Tab": function(cm) { org_cycle(cm); },
        "Shift-Tab": function(cm){ fn('shifttab', org_shifttab(cm)); },
        "Alt-Left": function(cm){ org_metaleft(cm); },
        "Alt-Right": function(cm){ org_metaright(cm); },
        "Alt-Enter": function(cm){ org_meta_return(cm); },
        "Alt-Up": function(cm){ org_metaup(cm); },
        "Alt-Down": function(cm){ org_metadown(cm); },
        "Shift-Alt-Left": function(cm){ org_shiftmetaleft(cm); },
        "Shift-Alt-Right": function(cm){ org_shiftmetaright(cm); },
        "Shift-Alt-Enter": function(cm){ org_insert_todo_heading(cm); },
        "Shift-Left": function(cm){ org_shiftleft(cm); },
        "Shift-Right": function(cm){ org_shiftright(cm); },
    });
    fn('shifttab', org_set_fold(editor));

    editor.addKeyMap({
        "Ctrl-X Ctrl-C": function(cm){
            cm.execCommand('quit');
        }
    });


    // Toggle headline on org mode by clicking on the heading ;)
    editor.on('mousedown', toggleHandler);
    editor.on('touchstart', toggleHandler);
    function toggleHandler(cm, e){
        const position = cm.coordsChar({
            left: e.clientX || (e.targetTouches && e.targetTouches[0].clientX),
            top: e.clientY || (e.targetTouches && e.targetTouches[0].clientY)
        }, "page"),
              token = cm.getTokenAt(position);

        if(/org-level-star/.test(token.type)){
            _preventIfShould();
            _foldHeadline();
        }else if(/org-toggle/.test(token.type)){
            _preventIfShould();
            _toggleCheckbox();
        }else if(/org-todo/.test(token.type)){
            _preventIfShould();
            _toggleTodo();
        }else if(/org-done/.test(token.type)){
            _preventIfShould();
            _toggleDone();
        }else if(/org-priority/.test(token.type)){
            _preventIfShould();
            _togglePriority();
        }


        function _preventIfShould(){
            if('ontouchstart' in window) e.preventDefault();
        }

        function _foldHeadline(){
            const line = position.line;
            if(line >= 0){
                const cursor = {line: line, ch: 0};
                isFold(cm, cursor) ? unfold(cm, cursor) : fold(cm, cursor);
            }
        }
        function _toggleCheckbox(){
            const line = position.line;
            const content = cm.getRange({line: line, ch: token.start}, {line: line, ch: token.end});
            let new_content = content === "[X]" || content === "[x]" ? "[ ]" : "[X]";
            cm.replaceRange(new_content, {line: line, ch: token.start}, {line: line, ch: token.end});
        }
        function _toggleTodo(){
            const line = position.line;
            cm.replaceRange("DONE", {line: line, ch: token.start}, {line: line, ch: token.end});
        }
        function _toggleDone(){
            const line = position.line;
            cm.replaceRange("TODO", {line: line, ch: token.start}, {line: line, ch: token.end});
        }
        function _togglePriority(){
            const PRIORITIES = [" [#A] ", " [#B] ", " [#C] ", " [#A] "];
            const line = position.line;
            const content = cm.getRange({line: line, ch: token.start}, {line: line, ch: token.end});
            let new_content = PRIORITIES[PRIORITIES.indexOf(content) + 1];
            cm.replaceRange(new_content, {line: line, ch: token.start}, {line: line, ch: token.end});
        }
    }
    editor.on('gutterClick', function(cm, line){
        const cursor = {line: line, ch: 0};
        isFold(cm, cursor) ? unfold(cm, cursor) : fold(cm, cursor);
    });

    // fold everything except headers by default
    editor.operation(function() {
        for (var i = 0; i < editor.lineCount() ; i++) {
            if(/header/.test(editor.getTokenTypeAt(CodeMirror.Pos(i, 0))) === false){
                fold(editor, CodeMirror.Pos(i, 0));
            }
        }
    });
});

export default CodeMirror;
