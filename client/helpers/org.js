import { guid } from "./";

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
            if(a.status === "DONE") return +1;
            else if(a.todo_status === "todo") return -1;
            return 0;
        });

    function formatTodo(thing){
        return {
            key: thing.header.todo_keyword,
            id: thing.id,
            line: thing.header.line,
            title: thing.header.title,
            status: thing.header.todo_keyword,
            todo_status: ["TODO", "NEXT", "DOING", "WAITING"].indexOf(thing.header.todo_keyword) !== -1 ? 'todo' : 'done',
            is_overdue: _is_overdue(thing.header.todo_keyword, thing.timestamps),
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
            let event = {
                id: thing.id,
                line: thing.header.line,
                title: thing.header.title,
                status: thing.header.todo_keyword,
                todo_status: function(keyword){
                    if(!keyword) return null;
                    return ["TODO", "NEXT", "DOING", "WAITING"].indexOf(keyword) !== -1 ? 'todo' : 'done';
                }(thing.header.todo_keyword),
                is_overdue: _is_overdue(thing.header.todo_keyword, thing.timestamps),
                tasks: [],
                tags: thing.header.tags
            };
            if(event.todo_status === 'done') continue;

            event.date = timestamp.timestamp;
            const today = new Date();
            today.setHours(23);
            today.setMinutes(59);
            today.setSeconds(59);
            today.setMilliseconds(999);
            if(event.date < today){
                event.date = today;
            }

            event.key = Intl.DateTimeFormat().format(event.date);
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
                    let today = normalise(new Date());
                    for(let j=0;j<30;j++){
                        if(((today - normalise(timestamp.timestamp)) / 1000*60*60*24) % n_days === 0){
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

        function normalise(date){
            date.setHours(0);
            date.setMinutes(0);
            date.setSeconds(0);
            date.setMilliseconds(0);
            return date;
        }
    }
}


export function parse(content){
    let todos = [], todo = reset(), data, text;

    const lines = content.split("\n");
    for(let i = 0; i<lines.length; i++){
        text = lines[i];
        if(data = parse_header(text, i)){
            if(todo.header){
                todos.push(todo);
                todo = reset();
            }
            todo.header = data;
        }else if(data = parse_timestamp(text, i)){
            todo.timestamps.push(data);
        }else if(data = parse_subtask(text, i)){
            todo.subtasks.push(data);
        }
        if(i === lines.length - 1 && todo.header){
            todos.push(todo);
        }
    }
    return todos;

    function reset(){
        return {id: guid(), timestamps: [], subtasks: []};
    }
}


function parse_header(text, line){
    const match = text.match(/^(\*+)\s(?:([A-Z]{3,})\s){0,1}(?:\[\#([A-C])\]\s){0,1}(.*?)(?:\s+\:((?:[a-z]+\:){1,})){0,1}$/);
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


function parse_timestamp(text, line){
    const match = text.match(/(?:([A-Z]+)\:\s){0,1}([<\[])(\d{4}-\d{2}-\d{2})[^>](?:[A-Z][a-z]{2})(?:\s([0-9]{2}\:[0-9]{2})){0,1}(?:\-([0-9]{2}\:[0-9]{2})){0,1}(?:\s(\+{1,2}[0-9]+[dwmy])){0,1}[\>\]](?:--[<\[](\d{4}-\d{2}-\d{2})\s[A-Z][a-z]{2}\s(\d{2}:\d{2}){0,1}[>\]]){0,1}/);
    if(!match) return null;

    // https://orgmode.org/manual/Timestamps.html
    return {
        line: line,
        keyword: match[1],
        active: match[2] === "<" ? true : false,
        timestamp: new Date(match[3] + (match[4] ? " "+match[4] : "")),
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
            if(!keyword) return;
            return {
                n: parseInt(keyword.replace(/^.*([0-9]+).*$/, "$1")),
                interval: keyword.replace(/^.*([dwmy])$/, "$1")
            };
        }(match[6])
    };
}



function _is_overdue(status, timestamp){
    if(status !== "TODO") return false;
    return timestamp.filter((timeObj) => {
        if(new Date() < timeObj.date) return false;
        if(timeObj.keyword === "DEADLINE" || timeObj.keyword === "SCHEDULE") return true;
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
