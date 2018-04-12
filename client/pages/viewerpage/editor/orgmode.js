import 'codemirror/addon/mode/simple';

CodeMirror.__mode = 'orgmode';

CodeMirror.defineSimpleMode("orgmode", {
    start: [
        {regex: /^(^\*{1,}\s)(TODO|DOING|WAITING|NEXT){0,1}(CANCELLED|CANCEL|DEFERRED|DONE|REJECTED|STOP|STOPPED){0,1}(.*)$/, token: ["header org-level-star", "header org-todo", "header org-done", "header"]},
        {regex: /(\+[^\+]+\+)/, token: ["strikethrough"]},
        {regex: /(\*[^\*]+\*)/, token: ["strong"]},
        {regex: /(\/[^\/]+\/)/, token: ["em"]},
        {regex: /(\_[^\_]+\_)/, token: ["link"]},
        {regex: /(\~[^\~]+\~)/, token: ["comment"]},
        {regex: /(\=[^\=]+\=)/, token: ["comment"]},
        {regex: /\[\[[^\[\]]*\]\[[^\[\]]*\]\]/, token: "url"}, // links
        {regex: /\[[xX\s]?\]/, token: 'qualifier'}, // checkbox
        {regex: /\#\+BEGIN_[A-Z]*/, token: "comment", next: "env"}, // comments
        {regex: /:?[A-Z_]+\:.*/, token: "comment"}, // property drawers
        {regex: /(\#\+[A-Z_]*)(\:.*)/, token: ["keyword", 'qualifier']}, // environments
        {regex: /(CLOCK\:|SHEDULED\:)(\s.+)/, token: ["comment", "keyword"]}
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

CodeMirror.afterInit = function(editor){
    let state = {
        stab: 'SHOW_ALL'
    };
    editor.setOption("extraKeys", {
        "Tab": function(cm) {
            let pos = cm.getCursor();
            isFold(cm, pos) ? unfold(cm, pos) : fold(cm, pos);
        },
        "Shift-Tab": function(cm){
            if(state.stab === "SHOW_ALL"){
                state.stab = 'OVERVIEW';
                cm.operation(function() {
                    for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++){
                        fold(cm, CodeMirror.Pos(i, 0));
                    }
                });
            }else if(state.stab === "OVERVIEW"){
                state.stab = 'CONTENT';
                cm.operation(function() {
                    for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++){
                        if(/header/.test(cm.getTokenTypeAt(CodeMirror.Pos(i, 0))) === true){
                            if(/^\* /.test(cm.getLine(i))){
                                unfold(cm, CodeMirror.Pos(i, 0));
                            }
                        }
                    }
                });
            }else if(state.stab === "CONTENT"){
                state.stab = 'SHOW_ALL';
                cm.operation(function() {
                    for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++){
                        if(/header/.test(cm.getTokenTypeAt(CodeMirror.Pos(i, 0))) === true){
                            unfold(cm, CodeMirror.Pos(i, 0));
                        }
                    }
                });
            }
        },
        "Alt-Left": function(cm){
            const line = cm.getCursor().line,
                  content = cm.getLine(line);
            let p = null;

            if(p = isTitle(content)){
                if(p['level'] > 1) cm.replaceRange('', {line: line, ch: 0}, {line: line, ch: 1});
            }else if(p = isItemList(content)){
                if(p['level'] > 0) cm.replaceRange('', {line: line, ch: 0}, {line: line, ch: 2});
            }else if(isNumberedList(content)){
            }
        },
        "Alt-Right": function(cm){
            const line = cm.getCursor().line,
                  content = cm.getLine(line);
            let p = null;

            if(p = isItemList(content)){
                cm.replaceRange('  ', {line: line, ch: 0});
            }else if(p = isNumberedList(content)){
            }else if(p = isTitle(content)){
                cm.replaceRange('*', {line: line, ch: 0});
            }
        },
        "Alt-Enter": function(cm){
            const line = cm.getCursor().line,
                  content = cm.getLine(line);
            let p = null;

            if(p = isItemList(content)){
                const level = p.level;
                cm.replaceRange('\n'+" ".repeat(level*2)+'- ', {line: line, ch: content.length});
                cm.setCursor({line: line+1, ch: 2+level*2});
            }else if(p = isNumberedList(content)){
            }else if(p = isTitle(content)){
            }
        },
        "Alt-Up": function(cm){
            const line = cm.getCursor().line,
                  content = cm.getLine(line);
            let p = null;

            if(p = isItemList(content)){
            }else if(p = isNumberedList(content)){
            }else if(p = isTitle(content)){
            }
        },
        "Alt-Down": function(cm){
            const line = cm.getCursor().line,
                  content = cm.getLine(line);
            let p = null;

            if(p = isItemList(content)){
            }else if(p = isNumberedList(content)){
            }else if(p = isTitle(content)){
            }
        },
        "Shift-Alt-Enter": function(cm){
            const line = cm.getCursor().line,
                  content = cm.getLine(line);
            let p = null;

            if(p = isItemList(content)){
            }else if(p = isNumberedList(content)){
            }else if(p = isTitle(content)){
            }
        },
        "Shift-Left": function(cm){
            const cycles = ["TODO", "", "DONE", "TODO"],
                  line = cm.getCursor().line,
                  content = cm.getLine(line),
                  params = isTitle(content);

            if(params === null) return;
            if(cycles.indexOf(params['status']) === -1) params['status'] = "";

            params['status'] = cycles[cycles.indexOf(params['status']) + 1];
            cm.replaceRange(makeTitle(params), {line: line, ch: 0}, {line: line, ch: content.length});
        },
        "Shift-Right": function(cm){
            const cycles = ["TODO", "DONE", "", "TODO"],
                  line = cm.getCursor().line,
                  content = cm.getLine(line),
                  params = isTitle(content);

            if(params === null) return;
            if(cycles.indexOf(params['status']) === -1) params['status'] = "TODO";

            params['status'] = cycles[cycles.indexOf(params['status']) + 1];
            cm.replaceRange(makeTitle(params), {line: line, ch: 0}, {line: line, ch: content.length});
        }
    });

    function makeTitle(p){
        if(p['status'] === ""){
            return "*".repeat(p['level'])+" "+p['content'];
        }
        return "*".repeat(p['level'])+" "+p['status']+" "+p['content'];
    }
    function makeNumberedList(p){
    }
    function makeItemList(p){
    }

    function previousOfType(cm, line){
        let content, tmp, i;
        for(i=line - 1, k=0; i>0; i--){
            content = cm.getLine(line);
            tmp = isItemList(content);
            if(tmp !== null) return ['list', tmp];
            tmp = isNumberedList(content);
            if(tmp !== null) return ['numbered', tmp];
            tmp = isTitle(content);
            if(tmp !== null) return ['title', tmp];
        }
        return null;
    }

    function isItemList(content){
        if(content.trimLeft()[0] !== "-" || content.trimLeft()[1] !== " ") return null;
        const padding = content.replace(/^(\s*).*$/, "$1").length;
        if(padding % 2 !== 0) return null;
        return {
            level: padding / 2,
            content: content.trimLeft().replace(/^\s*\-\s(.*)$/, '$1')
        };
    }
    function isNumberedList(content){
        if(/^[0-9]+[\.\)]\s.*$/.test(content.trimLeft()) === false) return null;
        const padding = content.replace(/^(\s*)[0-9]+.*$/, "$1").length;
        if(padding % 2 !== 0) return null;
        return {
            level:padding / 2,
            n: parseInt(content.trimLeft().replace(/^([0-9]+).*$/, "$1")),
            content: content.trimLeft().replace(/^[0-9]+[\.\)]\s(.*)$/, '$1'),
            separator: content.trimLeft().replace(/^[0-9]+([\.\)]).*$/, '$1')
        };
    }
    function isTitle(content){
        if(/^\*+\s/.test(content) === false) return null;
        const match = content.match(/^(\*+)([\sA-Z]*)\s(.*)$/);
        if(match === null) return null;
        return {
            level: match[1].length,
            status: match[2].trim(),
            content: match[3]
        };
    }

    function isEmpty(content){
        return content.trim() === "";
    }

    function fold(cm, start){
        cm.foldCode(start, null, "fold");
    }
    function unfold(cm, start){
        cm.foldCode(start, null, "unfold");
    }
    function isFold(cm, start){
        const line = start.line;
        const marks = cm.findMarks(CodeMirror.Pos(line, 0), CodeMirror.Pos(line + 1, 0));
        for (let i = 0; i < marks.length; ++i)
            if (marks[i].__isFold && marks[i].find().from.line == line) return marks[i];
        return false;
    }
    editor.on('touchstart', function(cm, e){
        setTimeout(() => {
            isFold(cm, cm.getCursor()) ? unfold(cm, cm.getCursor()) : fold(cm, cm.getCursor())
        }, 150);
    });
    // fold everything except headers by default
    editor.operation(function() {
        for (var i = 0; i < editor.lineCount() ; i++) {
            if(/header/.test(editor.getTokenTypeAt(CodeMirror.Pos(i, 0))) === false){
                fold(editor, CodeMirror.Pos(i, 0));
            }
        }
    });

    function collapseWidget(){
        let $widget = document.createElement('span');
        $widget.appendChild(document.createTextNode('colapse'));
        return $widget;
    }
    function expandWidget(){
        let $widget = document.createElement('span');
        $widget.appendChild(document.createTextNode('expand'));
        return $widget;
    }
}

export default CodeMirror;
