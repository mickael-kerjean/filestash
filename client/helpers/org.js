import { gid, leftPad } from "./";

export function extractTodos(text){
    const headlines = parse(text);
    let todos = [];
    for(let i=0; i < headlines.length; i++){
        let todo = formatTodo(headlines[i]);
        if(todo.status){
            todos.push(todo);
        }
    }
    return todos
        .sort((a,b) => {
            if(a.status === "NEXT" && b.status !== "NEXT") return -1;
            else if(b.status === "NEXT" && a.status !== "NEXT") return +1;
            else if(a.status === "TODO" && b.status !== "TODO") return -1;
            else if(b.status === "TODO" && a.status !== "TODO") return +1;
            else if(a.status === "DONE" && b.status !== "DONE" && b.todo_status === "done") return -1;
            else if(b.status === "DONE" && a.status !== "DONE" && a.todo_status === "done") return +1;
            else if(a.todo_status === "todo" && b.todo_status !== "todo") return -1;
            else if(a.todo_status === "done" && b.todo_status !== "done") return +1;
            else if(a.priority !== null && b.priority === null) return -1;
            else if(a.priority === null && b.priority !== null) return +1;
            else if(a.priority !== null && b.priority !== null && a.priority !== b.priority) return a.priority > b.priority? +1 : -1;
            else if(a.is_overdue === true && b.is_overdue === false) return -1;
            else if(a.is_overdue === false && b.is_overdue === true) return +1;
            else if(a.status === b.status) return a.id < b.id ? -1 : +1;
        });

    function formatTodo(thing){
        const todo_status = ["TODO", "NEXT", "DOING", "WAITING", "PENDING"].indexOf(thing.header.todo_keyword) !== -1 ? 'todo' : 'done';
        return {
            key: thing.header.todo_keyword,
            id: thing.id,
            line: thing.header.line,
            title: thing.header.title,
            status: thing.header.todo_keyword,
            todo_status: todo_status,
            is_overdue: _is_overdue(todo_status, thing.timestamps),
            priority: thing.header.priority,
            scheduled: _find_scheduled(thing.timestamps),
            deadline: _find_deadline(thing.timestamps),
            tasks: thing.subtasks,
            tags: thing.header.tags
        };
    }
}

export function extractEvents(text){
    const headlines = parse(text);
    let events = [];
    for(let i=0; i < headlines.length; i++){
        events = events.concat(
            formatEvents(headlines[i])
        );
    }
    return events.sort((a, b) => a.date - b.date);

    function formatEvents(thing){
        let events = [];
        for(let i=0; i < thing.timestamps.length; i++){
            let timestamp = thing.timestamps[i];
            if(timestamp.active === false) continue;
            const todo_status = function(keyword){
                if(!keyword) return null;
                return ["TODO", "NEXT", "DOING", "WAITING", "PENDING"].indexOf(keyword) !== -1 ? 'todo' : 'done';
            }(thing.header.todo_keyword);
            let event = {
                id: thing.id,
                line: thing.header.line,
                title: thing.header.title,
                status: thing.header.todo_keyword,
                todo_status: todo_status,
                scheduled: _find_scheduled(thing.timestamps),
                deadline: _find_deadline(thing.timestamps),
                is_overdue: _is_overdue(todo_status, thing.timestamps),
                priority: thing.header.priority,
                tasks: [],
                tags: thing.header.tags
            };
            if(event.todo_status === 'done') continue;

            event.date = new Date(timestamp.timestamp);
            const today = new Date();
            today.setHours(23);
            today.setMinutes(59);
            today.setSeconds(59);
            today.setMilliseconds(999);
            if(event.date < today){
                event.date = today;
            }
            event.key = Intl.DateTimeFormat().format(event.date);
            event.date = event.date.toISOString();

            if(timestamp.repeat){
                if(timestamp.repeat.interval === "m"){
                    events.push(event);
                }else{
                    if(timestamp.repeat.interval === "y"){
                        timestamp.repeat.n *= 365;
                    }else if(timestamp.repeat.interval === "w"){
                        timestamp.repeat.n *= 7;
                    }
                    const n_days = timestamp.repeat.n;
                    let today = _normalise(new Date());
                    for(let j=0;j<30;j++){
                        if(((today - _normalise(new Date(timestamp.timestamp))) / 1000*60*60*24) % n_days === 0){
                            event.date = today.getTime();
                            event.key = Intl.DateTimeFormat().format(today);
                            events.push(JSON.parse(JSON.stringify((event))));
                        }
                        today.setDate(today.getDate() + 1);
                    }
                }
            }else{
                events.push(event);
            }
        }
        return events;
    }
}


export function parse(content){
    let todos = [], todo = reset(0), data, text, tags = [];

    const lines = content.split("\n");
    for(let i = 0; i<lines.length; i++){
        text = lines[i];
        if(data = parse_header(text, i)){
            tags = tags.filter(e => e.level < data.level);
            tags.push({ level: data.level, tags: data.tags });
            data.tags = tags.reduce((acc, el) => {
                return acc.concat(el.tags);
            }, []);

            if(todo.header){
                todos.push(todo);
                todo = reset(i);
            }
            todo.header = data;
        }else if(data = parse_timestamp(text, i)){
            todo.timestamps = todo.timestamps.concat(data);
        }else if(data = parse_subtask(text, i)){
            todo.subtasks.push(data);
        }
        if(i === lines.length - 1 && todo.header){
            todos.push(todo);
        }
    }

    return todos;

    function reset(i){
        return {id: leftPad(i.toString(), 5) + gid(i), timestamps: [], subtasks: []};
    }
}


function parse_header(text, line){
    const match = text.match(/^(\*+)\s(?:([A-Z]{4,})\s){0,1}(?:\[\#([A-C])\]\s){0,1}(.*?)(?:\s+\:((?:[a-z]+\:){1,})){0,1}$/);
    if(!match) return null;
    return {
        line: line,
        level: RegExp.$1.length,
        todo_keyword: RegExp.$2 || null,
        priority: RegExp.$3 || null,
        title: RegExp.$4 || "Empty Heading",
        tags: RegExp.$5
            .replace(/:/g, " ")
            .trim()
            .split(" ")
            .filter((e) => e)
    };
}


function parse_subtask(text, line){
    const match = text.match(/(?:-|\d+[\.\)])\s\[([X\s-])\]\s(.*)/);
    if(!match) return null;
    return {
        line: line,
        status: function(state){
            if(state === "X") return "DONE";
            else if(state === " ") return "TODO";
            return null;
        }(match[1]),
        title: match[2] || "Empty task",
    }
}


function parse_timestamp(text, line, _memory){
    const reg = /(?:([A-Z]+)\:\s){0,1}([<\[])(\d{4}-\d{2}-\d{2})[^>](?:[A-Z][a-z]{1,2})(?:\s([0-9]{2}\:[0-9]{2})){0,1}(?:\-([0-9]{2}\:[0-9]{2})){0,1}(?:\s(\+{1,2}[0-9]+[dwmy])){0,1}[\>\]](?:--[<\[](\d{4}-\d{2}-\d{2})\s[A-Z][a-z]{1,2}\s(\d{2}:\d{2}){0,1}[>\]]){0,1}/;
    const match = text.match(reg);
    if(!match) return _memory || null;

    // https://orgmode.org/manual/Timestamps.html
    const timestamp = {
        line: line,
        keyword: match[1],
        active: match[2] === "<" ? true : false,
        timestamp: new Date(match[3] + (match[4] ? " "+match[4] : "")).toISOString(),
        range: function(start_date, start_time = "", start_time_end, end_date = "", end_time = ""){
            if(start_time_end && !end_date){
                return new Date(start_date+" "+start_time_end) - new Date(start_date+" "+start_time);
            }
            if(end_date){
                return new Date(end_date+" "+end_time) - new Date(start_date+" "+start_time);
            }
            return null;
        }(match[3], match[4], match[5], match[7], match[8]),
        repeat: function(keyword){
            if(!keyword) return null;
            return {
                n: parseInt(keyword.replace(/^.*([0-9]+).*$/, "$1")),
                interval: keyword.replace(/^.*([dwmy])$/, "$1")
            };
        }(match[6])
    };
    if(!_memory) _memory = [];
    _memory.push(timestamp);
    return parse_timestamp(text.replace(reg, ""), line, _memory);
}

function _find_deadline(timestamps){
    return timestamps.filter((e) => e.keyword === "DEADLINE")[0] || null;
}
function _find_scheduled(timestamps){
    return timestamps.filter((e) => e.keyword === "SCHEDULED")[0] || null;
}

function _is_overdue(status, timestamp){
    if(status !== "todo") return false;
    return timestamp.filter((timeObj) => {
        if(_normalise(new Date()) < _normalise(new Date(timeObj.timestamp))) return false;
        if(timeObj.keyword === "DEADLINE" || timeObj.keyword === "SCHEDULED") return true;
        return false;
    }).length > 0 ? true : false;
}

function _date_label(date){
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return window.Intl.DateTimeFormat().format(date);
}

function _normalise(date){
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
}
