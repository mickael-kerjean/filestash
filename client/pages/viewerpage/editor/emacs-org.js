export const org_cycle = (cm) => {
    let pos = cm.getCursor();
    isFold(cm, pos) ? unfold(cm, pos) : fold(cm, pos);
};


let state = {
    stab: 'CONTENT'
};
export const org_set_fold = (cm) => {
    const cursor = cm.getCursor();
    set_folding_mode(cm, state.stab);
    cm.setCursor(cursor);
    return state.stab;
};
/*
 * DONE: Global visibility cycling
 * TODO: or move to previous table field.
 */
export const org_shifttab = (cm) => {
    if(state.stab === "SHOW_ALL"){
        state.stab = 'OVERVIEW';
    }else if(state.stab === "OVERVIEW"){
        state.stab = 'CONTENT';
    }else if(state.stab === "CONTENT"){
        state.stab = 'SHOW_ALL';
    }
    set_folding_mode(cm, state.stab);
    return state.stab;
};


function set_folding_mode(cm, mode){
    if(mode === "OVERVIEW"){
        folding_mode_overview(cm);
    }else if(mode === "SHOW_ALL"){
        folding_mode_all(cm);
    }else if(mode === "CONTENT"){
        folding_mode_content(cm);
    }
    function folding_mode_overview(cm){
        cm.operation(function() {
            for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++){
                fold(cm, CodeMirror.Pos(i, 0));
            }
        });
    }
    function folding_mode_content(cm){
        cm.operation(function() {
            let previous_header = null;
            for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++){
                fold(cm, CodeMirror.Pos(i, 0));
                if(/header/.test(cm.getTokenTypeAt(CodeMirror.Pos(i, 0))) === true){
                    const level = cm.getLine(i).replace(/^(\*+).*/, "$1").length;
                    if(previous_header && level > previous_header.level){
                        unfold(cm, CodeMirror.Pos(previous_header.line, 0));
                    }
                    previous_header = {
                        line: i,
                        level: level
                    };
                }
            }
        });
    }
    function folding_mode_all(cm){
        cm.operation(function() {
            for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++){
                if(/header/.test(cm.getTokenTypeAt(CodeMirror.Pos(i, 0))) === true){
                    unfold(cm, CodeMirror.Pos(i, 0));
                }
            }
        });
    }
}


/*
 * Promote heading or move table column to left.
 */
export const org_metaleft = (cm) => {
    const line = cm.getCursor().line;
    _metaleft(cm, line);
};
function _metaleft(cm, line){
    let p = null;
    if(p = isTitle(cm, line)){
        if(p['level'] > 1) cm.replaceRange('', {line: p.start, ch: 0}, {line: p.start, ch: 1});
    }else if(p = isItemList(cm, line)){
        for(let i=p.start; i<=p.end; i++){
            if(p['level'] > 0) cm.replaceRange('', {line: i, ch: 0}, {line: i, ch: 2});
        }
    }else if(p = isNumberedList(cm, line)){
        for(let i=p.start; i<=p.end; i++){
            if(p['level'] > 0) cm.replaceRange('', {line: i, ch: 0}, {line: i, ch: 3});
        }
        rearrange_list(cm, line);
    }
}

/*
 * Demote a subtree, a list item or move table column to right.
 * In front of a drawer or a block keyword, indent it correctly.
 */
export const org_metaright = (cm) => {
    const line = cm.getCursor().line;
    _metaright(cm, line);
};

function _metaright(cm, line){
    let p = null, tmp = null;
    if(p = isTitle(cm, line)){
        cm.replaceRange('*', {line: p.start, ch: 0});
    }else if(p = isItemList(cm, line)){
        if(tmp = isItemList(cm, p.start - 1)){
            if(p.level < tmp.level + 1){
                for(let i=p.start; i<=p.end; i++){
                    cm.replaceRange('  ', {line: i, ch: 0});
                }
            }
        }
    }else if(p = isNumberedList(cm, line)){
        if(tmp = isNumberedList(cm, p.start - 1)){
            if(p.level < tmp.level + 1){
                for(let i=p.start; i<=p.end; i++){
                    cm.replaceRange('   ', {line: i, ch: 0});
                }
                rearrange_list(cm, p.start);
            }
        }
    }
}

/*
 * Insert a new heading or wrap a region in a table
 */
export const org_meta_return = (cm) => {
    const line = cm.getCursor().line,
          content = cm.getLine(line);
    let p = null;

    if(p = isItemList(cm, line)){
        const level = p.level;
        cm.replaceRange('\n'+" ".repeat(level*2)+'- ', {line: p.end, ch: cm.getLine(p.end).length});
        cm.setCursor({line: p.end+1, ch: level*2+2});
    }else if(p = isNumberedList(cm, line)){
        const level = p.level;
        cm.replaceRange('\n'+" ".repeat(level*3)+(p.n+1)+'. ', {line: p.end, ch: cm.getLine(p.end).length});
        cm.setCursor({line: p.end+1, ch: level*3+3});
        rearrange_list(cm, line);
    }else if(p = isTitle(cm, line)){
        const tmp = previousOfType(cm, 'title', line);
        const level = tmp && tmp.level || 1;
        cm.replaceRange('\n'+'*'.repeat(level)+' ', {line: line, ch: content.length});
        cm.setCursor({line: line+1, ch: level+1});
    }else if(content.trim() === ""){
        cm.replaceRange('* ', {line: line, ch: 0});
        cm.setCursor({line: line, ch: 2});
    }else{
        cm.replaceRange('\n\n* ', {line: line, ch: content.length});
        cm.setCursor({line: line + 2, ch: 2});
    }
};


const TODO_CYCLES = ["TODO", "DONE", ""];
/*
 * Cycle the thing at point or in the current line, depending on context.
 * Depending on context, this does one of the following:
 * - TODO: switch a timestamp at point one day into the past
 * - DONE: on a headline, switch to the previous TODO keyword.
 * - TODO: on an item, switch entire list to the previous bullet type
 * - TODO: on a property line, switch to the previous allowed value
 * - TODO: on a clocktable definition line, move time block into the past
 */
export const org_shiftleft = (cm) => {
    const cycles = [].concat(TODO_CYCLES.slice(0).reverse(), TODO_CYCLES.slice(-1)),
          line = cm.getCursor().line,
          content = cm.getLine(line),
          params = isTitle(cm, line);

    if(params === null) return;
    params['status'] = cycles[cycles.indexOf(params['status']) + 1];
    cm.replaceRange(makeTitle(params), {line: line, ch: 0}, {line: line, ch: content.length});
};
/*
 * Cycle the thing at point or in the current line, depending on context.
 * Depending on context, this does one of the following:
 * - TODO: switch a timestamp at point one day into the future
 * - DONE: on a headline, switch to the next TODO keyword.
 * - TODO: on an item, switch entire list to the next bullet type
 * - TODO: on a property line, switch to the next allowed value
 * - TODO: on a clocktable definition line, move time block into the future
 */
export const org_shiftright = (cm) => {
    cm.operation(() => {
        const cycles = [].concat(TODO_CYCLES, [TODO_CYCLES[0]]),
              line = cm.getCursor().line,
              content = cm.getLine(line),
              params = isTitle(cm, line);

        if(params === null) return;
        params['status'] = cycles[cycles.indexOf(params['status']) + 1];
        cm.replaceRange(makeTitle(params), {line: line, ch: 0}, {line: line, ch: content.length});
    });
};

export const org_insert_todo_heading = (cm) => {
    cm.operation(() => {
        const line = cm.getCursor().line,
              content = cm.getLine(line);

        let p = null;
        if(p = isItemList(cm, line)){
            const level = p.level;
            cm.replaceRange('\n'+" ".repeat(level*2)+'- [ ] ', {line: p.end, ch: cm.getLine(p.end).length});
            cm.setCursor({line: line+1, ch: 6+level*2});
        }else if(p = isNumberedList(cm, line)){
            const level = p.level;
            cm.replaceRange('\n'+" ".repeat(level*3)+(p.n+1)+'. [ ] ', {line: p.end, ch: cm.getLine(p.end).length});
            cm.setCursor({line: p.end+1, ch: level*3+7});
            rearrange_list(cm, line);
        }else if(p = isTitle(cm, line)){
            const level = p && p.level || 1;
            cm.replaceRange('\n'+"*".repeat(level)+' TODO ', {line: line, ch: content.length});
            cm.setCursor({line: line+1, ch: level+6});
        }else if(content.trim() === ""){
            cm.replaceRange('* TODO ', {line: line, ch: 0});
            cm.setCursor({line: line, ch: 7});
        }else{
            cm.replaceRange('\n\n* TODO ', {line: line, ch: content.length});
            cm.setCursor({line: line + 2, ch: 7});
        }
    });
}


/*
 * Move subtree up or move table row up.
 * Calls ‘org-move-subtree-up’ or ‘org-table-move-row’ or
 * ‘org-move-item-up’, depending on context
 */
export const org_metaup = (cm) => {
    cm.operation(() => {
        const line = cm.getCursor().line;
        let p = null;

        if(p = isItemList(cm, line)){
            let a = isItemList(cm, p.start - 1);
            if(a){
                swap(cm, [p.start, p.end], [a.start, a.end]);
                rearrange_list(cm, line);
            }
        }else if(p = isNumberedList(cm, line)){
            let a = isNumberedList(cm, p.start - 1);
            if(a){
                swap(cm, [p.start, p.end], [a.start, a.end]);
                rearrange_list(cm, line);
            }
        }else if(p = isTitle(cm, line)){
            let _line = line,
                a;
            do{
                _line -= 1;
                if(a = isTitle(cm, _line, p.level)){
                    break;
                }
            }while(_line > 0);

            if(a){
                swap(cm, [p.start, p.end], [a.start, a.end]);
                org_set_fold(cm);
            }
        }
    });
}

/*
 * Move subtree down or move table row down.
 * Calls ‘org-move-subtree-down’ or ‘org-table-move-row’ or
 * ‘org-move-item-down’, depending on context
 */
export const org_metadown = (cm) => {
    cm.operation(() => {
        const line = cm.getCursor().line;
        let p = null;

        if(p = isItemList(cm, line)){
            let a = isItemList(cm, p.end + 1);
            if(a){
                swap(cm, [p.start, p.end], [a.start, a.end]);
            }
        }else if(p = isNumberedList(cm, line)){
            let a = isNumberedList(cm, p.end + 1);
            if(a){
                swap(cm, [p.start, p.end], [a.start, a.end]);
            }
            rearrange_list(cm, line);
        }else if(p = isTitle(cm, line)){
            let a = isTitle(cm, p.end + 1, p.level);
            if(a){
                swap(cm, [p.start, p.end], [a.start, a.end]);
                org_set_fold(cm);
            }
        }
    });
}



export const org_shiftmetaright = function(cm){
    cm.operation(() => {
        const line = cm.getCursor().line;
        let p = null;
        if(p = isTitle(cm, line)){
            _metaright(cm, line);
            for(let i=p.start + 1; i<=p.end; i++){
                if(isTitle(cm, i)){
                    _metaright(cm, i);
                }
            }
        }
    });
};

export const org_shiftmetaleft = function(cm){
    cm.operation(() => {
        const line = cm.getCursor().line;
        let p = null;
        if(p = isTitle(cm, line)){
            if(p.level === 1) return;
            _metaleft(cm, line);
            for(let i=p.start + 1; i<=p.end; i++){
                if(isTitle(cm, i)){
                    _metaleft(cm, i);
                }
            }
        }
    });
};



function makeTitle(p){
    let content = "*".repeat(p['level'])+" ";
    if(p['status']){
        content += p['status']+" ";
    }
    content += p['content'];
    return content;
}

function previousOfType(cm, type, line){
    let content, tmp, i;
    for(i=line - 1; i>0; i--){
        if(type === 'list' || type === null){
            tmp = isItemList(cm, line);
        }else if(type === 'numbered' || type === null){
            tmp = isNumberedList(cm, line);
        }else if(type === 'title' || type === null){
            tmp = isTitle(cm, line);
        }
        if(tmp !== null){
            return tmp;
        }
    }
    return null;
}

function isItemList(cm, line){
    const rootLineItem = findRootLine(cm, line);
    if(rootLineItem === null) return null;
    line = rootLineItem;
    const content = cm.getLine(line);

    if(content && (content.trimLeft()[0] !== "-" || content.trimLeft()[1] !== " ")) return null;
    const padding = content.replace(/^(\s*).*$/, "$1").length;
    if(padding % 2 !== 0) return null;
    return {
        type: 'list',
        level: padding / 2,
        content: content.trimLeft().replace(/^\s*\-\s(.*)$/, '$1'),
        start: line,
        end: function(_cm, _line){
            let line_candidate = _line,
                content = null;
            do{
                _line += 1;
                content = _cm.getLine(_line);
                if(content === undefined || content.trimLeft()[0] === "-"){
                    break;
                }else if(/^\s+/.test(content)){
                    line_candidate = _line;
                    continue;
                }else{
                    break;
                }
            }while(_line <= _cm.lineCount())
            return line_candidate;
        }(cm, line)
    };

    function findRootLine(_cm, _line){
        let content;
        do{
            content = _cm.getLine(_line);
            if(/^\s*\-/.test(content)) return _line;
            else if(/^\s+/.test(content) === false){
                break;
            }
            _line -= 1;
        }while(_line >= 0);
        return null;
    }

}
function isNumberedList(cm, line){
    const rootLineItem = findRootLine(cm, line);
    if(rootLineItem === null) return null;
    line = rootLineItem;
    const content = cm.getLine(line);

    if(/^[0-9]+[\.\)]\s.*$/.test(content && content.trimLeft()) === false) return null;
    const padding = content.replace(/^(\s*)[0-9]+.*$/, "$1").length;
    if(padding % 3 !== 0) return null;
    return {
        type: 'numbered',
        level: padding / 3,
        content: content.trimLeft().replace(/^[0-9]+[\.\)]\s(.*)$/, '$1'),
        start: line,
        end: function(_cm, _line){
            let line_candidate = _line,
                content = null;
            do{
                _line += 1;
                content = _cm.getLine(_line);
                if(content === undefined || /^[0-9]+[\.\)]/.test(content.trimLeft())){
                    break;
                }else if(/^\s+/.test(content)){
                    line_candidate = _line;
                    continue;
                }else{
                    break;
                }
            }while(_line <= _cm.lineCount())
            return line_candidate;
        }(cm, line),
        // specific
        n: parseInt(content.trimLeft().replace(/^([0-9]+).*$/, "$1")),
        separator: content.trimLeft().replace(/^[0-9]+([\.\)]).*$/, '$1')
    };


    function findRootLine(_cm, _line){
        let content;
        do{
            content = _cm.getLine(_line);
            if(/^\s*[0-9]+[\.\)]\s/.test(content)) return _line;
            else if(/^\s+/.test(content) === false){
                break;
            }
            _line -= 1;
        }while(_line >= 0);
        return null;
    }
}
function isTitle(cm, line, level){
    const content = cm.getLine(line);
    if(/^\*+\s/.test(content) === false) return null;
    const match = content.match(/^(\*+)([\sA-Z]*)\s(.*)$/);
    const reference_level = match[1].length;
    if(level !== undefined && level !== reference_level){ return null; }
    if(match === null) return null;
    return {
        type: 'title',
        level: reference_level,
        content: match[3],
        start: line,
        end: function(_cm, _line){
            let line_candidate = _line,
                content = null;
            do{
                _line += 1;
                content = _cm.getLine(_line);
                if(content === undefined) break;
                let match = content.match(/^(\*+)\s.*/);
                if(match && match[1] && ( match[1].length === reference_level || match[1].length < reference_level)){
                    break;
                }else{
                    line_candidate = _line;
                    continue;
                }
            }while(_line <= _cm.lineCount())
            return line_candidate;
        }(cm, line),
        // specific
        status: match[2].trim()
    };
}

function rearrange_list(cm, line){
    const line_inferior = find_limit_inferior(cm, line);
    const line_superior = find_limit_superior(cm, line);

    let last_p = null, p;

    for(let i=line_inferior; i<=line_superior; i++){
        if(p = isNumberedList(cm, i)){
            // rearrange numbers on the numbered list
            if(last_p){
                if(p.level === last_p.level){
                    const tmp = findLastAtLevel(cm, p.start, line_inferior, p.level);
                    if(tmp && p.n !== tmp.n + 1) setNumber(cm, p.start, tmp.n + 1);
                }else if(p.level > last_p.level){
                    if(p.n !== 1){
                        setNumber(cm, p.start, 1);
                    }
                }else if(p.level < last_p.level){
                    const tmp = findLastAtLevel(cm, p.start, line_inferior, p.level);
                    if(tmp && p.n !== tmp.n + 1) setNumber(cm, p.start, tmp.n + 1);
                }
            }else{
                if(p.n !== 1){ setNumber(cm, p.start, 1); }
            }
        }


        if(p = (isNumberedList(cm, i) || isItemList(cm, i))){
            // rearrange spacing levels in list
            if(last_p){
                if(p.level > last_p.level){
                    if(p.level !== last_p.level + 1){
                        setLevel(cm, [p.start, p.end], last_p.level + 1, p.type);
                    }
                }
            }else{
                if(p.level !== 0){
                    setLevel(cm, [p.start, p.end], 0, p.type);
                }
            }
        }


        last_p = p;
        // we can process content block instead of line
        if(p){
            i += (p.end - p.start);
        }
    }

    function findLastAtLevel(_cm, line, line_limit_inf, level){
        let p;
        do{
            line -= 1;
            if((p = isNumberedList(_cm, line)) && p.level === level)
                return p;
        }while(line > line_limit_inf);

        return null;
    }

    function setLevel(_cm, range, level, type){
        let content, i;
        for(i=range[0]; i<=range[1]; i++){
            content = cm.getLine(i).trimLeft();
            const n_spaces = function(_level, _line, _type){
                let spaces = _level * 3;
                if(_line > 0){
                    spaces += _type === 'numbered' ? 3 : 2;
                }
                return spaces;
            }(level, i - range[0], type)

            content = " ".repeat(n_spaces) + content;
            cm.replaceRange(content, {line: i, ch: 0}, {line: i, ch: _cm.getLine(i).length});
        }
    }

    function setNumber(_cm, line, level){
        const content = _cm.getLine(line);
        const new_content = content.replace(/[0-9]+\./, level+".");
        cm.replaceRange(new_content, {line: line, ch: 0}, {line: line, ch: content.length});
    }

    function find_limit_inferior(_cm, _line){
        let content, p, match, line_candidate = _line;
        do{
            content = _cm.getLine(_line);
            p = isNumberedList(_cm, _line);
            match = /(\s+).*$/.exec(content);
            if(p){ line_candidate = _line;}
            if(!p || !match) break;
            _line -= 1;
        }while(_line >= 0);
        return line_candidate;
    }
    function find_limit_superior(_cm, _line){
        let content, p, match, line_candidate = _line;
        do{
            content = _cm.getLine(_line);
            p = isNumberedList(_cm, _line);
            match = /(\s+).*$/.exec(content);
            if(p){ line_candidate = _line;}
            if(!p || !match) break;
            _line += 1;
        }while(_line < _cm.lineCount());
        return line_candidate;
    }
}

function swap(cm, from, to){
    const from_content = cm.getRange({line: from[0], ch: 0}, {line: from[1], ch: cm.getLine(from[1]).length}),
          to_content = cm.getRange({line: to[0], ch: 0}, {line: to[1], ch: cm.getLine(to[1]).length}),
          cursor = cm.getCursor();

    if(to[0] > from[0]){
        // moving down
        cm.replaceRange(
            from_content,
            {line: to[0], ch:0},
            {line: to[1], ch: cm.getLine(to[1]).length}
        );
        cm.replaceRange(
            to_content,
            {line: from[0], ch:0},
            {line: from[1], ch: cm.getLine(from[1]).length}
        );
        cm.setCursor({
            line: cursor.line + (to[1] - to[0] + 1),
            ch: cursor.ch
        });
    }else{
        // moving up
        cm.replaceRange(
            to_content,
            {line: from[0], ch:0},
            {line: from[1], ch: cm.getLine(from[1]).length}
        );
        cm.replaceRange(
            from_content,
            {line: to[0], ch:0},
            {line: to[1], ch: cm.getLine(to[1]).length}
        );
        cm.setCursor({
            line: cursor.line - (to[1] - to[0] + 1),
            ch: cursor.ch
        });
    }
}


function isEmpty(content){
    return content.trim() === "";
}

export function fold(cm, start){
    cm.foldCode(start, null, "fold");
}
export function unfold(cm, start){
    cm.foldCode(start, null, "unfold");
}
export function isFold(cm, start){
    const line = start.line;
    const marks = cm.findMarks(CodeMirror.Pos(line, 0), CodeMirror.Pos(line + 1, 0));
    for (let i = 0; i < marks.length; ++i)
        if (marks[i].__isFold && marks[i].find().from.line == line) return marks[i];
    return false;
}
