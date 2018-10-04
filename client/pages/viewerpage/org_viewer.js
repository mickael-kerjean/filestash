import React from 'react';
import { StickyContainer, Sticky } from 'react-sticky';

import { Modal, Container, NgIf, Icon, Dropdown, DropdownButton, DropdownList, DropdownItem } from '../../components/';
import { extractEvents, extractTodos } from '../../helpers/org';
import { leftPad } from '../../helpers/common';
import { debounce } from '../../helpers/';
import './org_viewer.scss';

export class OrgEventsViewer extends React.Component {
    shouldComponentUpdate(nextProps){
        if(this.props.content !== nextProps.content) return true;
        if(this.props.isActive !== nextProps.isActive) return true;
        return false;
    }
    render(){
        const headlines = this.props.isActive ? extractEvents(this.props.content) : [];
        return (
            <OrgViewer title="Agenda" headlines={headlines} content={this.props.content} isActive={this.props.isActive}
                       onQuit={this.props.onQuit} goTo={this.props.goTo} onUpdate={this.props.onUpdate} />
        );
    }
}

export class OrgTodosViewer extends React.Component {
    shouldComponentUpdate(nextProps){
        if(this.props.content !== nextProps.content) return true;
        if(this.props.isActive !== nextProps.isActive) return true;
        return false;
    }

    render(){
        const headlines = this.props.isActive ? extractTodos(this.props.content) : [];
        return (
            <OrgViewer title="Todos" headlines={headlines} content={this.props.content} isActive={this.props.isActive}
                       onQuit={this.props.onQuit} goTo={this.props.goTo} onUpdate={this.props.onUpdate} />
        );
    }
}



class OrgViewer extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            headlines: this.buildHeadlines(props.headlines),
            content: props.content,
            search: '',
            _: null
        };
        this.rerender = () => {this.setState({_: Math.random()});};
        this.findResults = debounce(this.findResults.bind(this), 150);
    }

    componentWillReceiveProps(props){
        this.setState({
            headlines: this.buildHeadlines(props.headlines),
            content: props.content
        });
    }

    buildHeadlines(headlines){
        return headlines
            .reduce((acc, headline) => {
                if(!acc[headline['key']]){ acc[headline['key']] = []; }
                acc[headline['key']].push(headline);
                return acc;
            }, {});
    }


    onChange(i, j, state){
        this.state.headlines[Object.keys(this.state.headlines)[i]][j].status = state;

        this.setState({
            headlines: this.state.headlines
        });
    }

    onTaskUpdate(type, line, value){
        const content = this.state.content.split("\n");
        let head_line, item_line, head_status, deadline_line, scheduled_line, insertion_line;
        switch(type){
        case "status":
            content[line] = content[line].replace(/^(\*+\s)[A-Z]{3,}(\s.*)$/, "$1"+value+"$2");
            break;
        case "subtask":
            if(value === "DONE"){
                content[line] = content[line].replace(/\[.\]/, '[X]');
            }else{
                content[line] = content[line].replace(/\[.\]/, '[ ]');
            }
            break;
        case "existing_scheduled":
            [head_line, head_status, item_line] = line;
            content[item_line] = content[item_line].replace(/SCHEDULED\: \<.*?\>\s*/, value ? "SCHEDULED: "+orgdate(value)+" " : "");
            this.state.headlines[head_status] = this.state.headlines[head_status]
                .map((todo) => {
                    if(todo.line === head_line){
                        if(value) todo.scheduled.timestamp = new Date(value).toISOString();
                        else todo.scheduled = null;
                    }
                    return todo;
                });
            this.setState({headlines: this.state.headlines});
            break;
        case "existing_deadline":
            [head_line, head_status, item_line] = line;
            content[item_line] = content[item_line].replace(/DEADLINE\: \<.*?\>\s*/, value ? "DEADLINE: "+orgdate(value) : "");
            this.state.headlines[head_status] = this.state.headlines[head_status]
                .map((todo) => {
                    if(todo.line === head_line){
                        if(value) todo.deadline.timestamp = new Date(value).toISOString();
                        else todo.deadline = null;
                    }
                    return todo;
                });
            this.setState({headlines: this.state.headlines});
            break;
        case "new_scheduled":
            [head_line, head_status, deadline_line] = line;
            if(deadline_line !== null){
                insertion_line = deadline_line;
                content[deadline_line] = "SCHEDULED: "+orgdate(value)+" "+content[deadline_line];
            }else{
                insertion_line = head_line + 1;
                if(content[insertion_line] === "" && content[insertion_line + 1] === ""){
                    content[insertion_line] = "SCHEDULED: "+orgdate(value);
                }else{
                    content.splice(
                        insertion_line,
                        0,
                        "SCHEDULED: "+orgdate(value)
                    );
                }
            }
            this.state.headlines[head_status] = this.state.headlines[head_status]
                .map((todo) => {
                    if(todo.line === head_line){
                        todo.scheduled = {
                            line: insertion_line,
                            keyword: "SCHEDULED",
                            active: true,
                            range: null,
                            repeat: null,
                            timestamp: new Date(value).toISOString()
                        };
                    }
                    return todo;
                });
            this.setState({headlines: this.state.headlines});
            break;
        case "new_deadline":
            [head_line, head_status, scheduled_line] = line;
            if(scheduled_line !== null){
                insertion_line = scheduled_line;
                content[scheduled_line] = content[scheduled_line]+" DEADLINE: "+orgdate(value);
            }else{
                insertion_line = head_line + 1;
                if(content[insertion_line] === "" && content[insertion_line + 1] === ""){
                    content[insertion_line] = "DEADLINE: "+orgdate(value);
                }else{
                    content.splice(
                        insertion_line,
                        0,
                        "DEADLINE: "+orgdate(value)
                    );
                }
                this.state.headlines[head_status] = this.state.headlines[head_status]
                    .map((todo) => {
                        if(todo.line === head_line){
                            todo.deadline = {
                                line: insertion_line,
                                keyword: "DEADLINE",
                                active: true,
                                range: null,
                                repeat: null,
                                timestamp: new Date(value).toISOString()
                            };
                        }
                        return todo;
                    });
                this.setState({headlines: this.state.headlines});
            }
            break;
        };
        this.setState({content: content.join("\n")});

        function orgdate(_date){
            const date = new Date(_date);
            return "<"+date.getFullYear()+"-"+leftPad((date.getMonth() + 1).toString(), 2)+"-"+leftPad(date.getDate().toString(), 2)+" "+day(date.getDay())+">";

            function day(n){
                switch(navigator.language.split("-")[0]){
                    case "de": ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][n];
                    default: return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][n];
                }
            }
        }
    }

    navigate(line){
        this.props.goTo(line);
        this.onQuit();
    }

    onQuit(){
        this.props.onUpdate(this.state.content);
        this.props.onQuit();
    }

    componentDidMount(){
        window.addEventListener('resize', this.rerender);
    }
    componentWillUnmount(){
        window.removeEventListener('resize', this.rerender);
    }

    search(terms){
        this.setState({search: terms}, () => {
            this.findResults(terms);
        });
    }

    findResults(terms){
        let headlines = this.props.headlines;
        if(terms){
            headlines = this.props.headlines.filter((headline) => {
                const keywords = terms.split(" ");
                const head = function(){
                    let str = " ";
                    str += headline['status'] + " ";
                    str += headline['title'] + " ";
                    str += headline.tags.map((tag) => "#"+tag).join(" ") + " ";
                    str += headline.scheduled ? "scheduled "+headline.scheduled.timestamp + " ": "";
                    str += headline.deadline ? "deadline "+headline.deadline.timestamp + " ": "";
                    str += headline.priority ? "priority #"+headline.priority+" " : "";
                    str += headline.is_overdue ? "overdue " : "";
                    str += headline.tasks.map((task) => task.title).join(" ")+ " ";
                    return str;
                }(headline);
                return keywords.filter((keyword) => new RegExp(" "+keyword, "i").test(head)).length === keywords.length ? true : false;
            });
        }
        this.setState({headlines: this.buildHeadlines(headlines)});
    }

    render(){
        return (
            <Modal className="todo-modal" isActive={this.props.isActive} onQuit={this.onQuit.bind(this)}>
              <div className="modal-top no-select">
                <span onClick={this.onQuit.bind(this)}>
                  <Icon name="close"/>
                </span>
                <h1>{this.props.title}</h1>
                <NgIf className="search" cond={this.props.headlines.length > 0}>
                  <label className={this.state.search.length > 0 ? "active" : ""}>
                    <input type="text" onChange={(e) => this.search(e.target.value)} placeholder="Search ..."/>
                    <Icon name="search" />
                  </label>
                </NgIf>
              </div>
              <NgIf cond={this.props.headlines.length === 0} className="nothing">
                Nothing
              </NgIf>
              <NgIf cond={this.props.headlines.length > 0}>
                <StickyContainer className="container" style={{height: window.innerHeight > 750 ? 545 : window.innerHeight - 202}}>
                  {
                      Object.keys(this.state.headlines).map((list, i) => {
                          return (
                            <div key={i}>
                              <Sticky relative>
                                {
                                  ({isSticky, wasSticky, style, distanceFromTop, distanceFromBottom, calculatedHeight}) => {
                                    return (
                                            <div className="sticky_header no-select" style={{...style, overflow: "auto", background: "white", zIndex: 4}}>
                                          <h2>{list} <span>{this.state.headlines[list].length}</span></h2>
                                        </div>
                                    );
                                  }
                                }
                              </Sticky>
                              <div className="list">
                                {
                                  this.state.headlines[list].map((headline, j) => {
                                      return (
                                          <Headline
                                            type={this.props.title.toLowerCase()}
                                            onTaskUpdate={this.onTaskUpdate.bind(this)}
                                            onChange={this.onChange.bind(this, i, j)}
                                            tasks={headline.tasks}
                                            key={j} title={headline.title}
                                            tags={headline.tags}
                                            line={headline.line}
                                            date={headline.date}
                                            overdue={headline.is_overdue}
                                            scheduled={headline.scheduled}
                                            deadline={headline.deadline}
                                            sortKey={headline.key}
                                            status={headline.status || null}
                                            todo_status={headline.todo_status}
                                            todo_priority={headline.priority}
                                            goTo={this.navigate.bind(this, headline.line)} />
                                      );
                                  })
                                }
                              </div>
                            </div>
                          );
                      })
                  }
                </StickyContainer>
              </NgIf>
            </Modal>
        );
    }
}


class Headline extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            status: props.todo_status,
            properties: false
        };
    }

    onMenuAction(key, value){
        if(key === "navigate"){
            this.props.goTo();
        }else if(key === "properties"){
            this.setState({properties: !this.state.properties});
        }
    }

    onStatusToggle(){
        if(!this.props.todo_status) return;

        const new_status = this.state.status === 'todo' ? 'done' : 'todo';
        this.setState({status: new_status});

        const new_status_label = function(new_status, initial_status, initial_keyword){
            if(new_status === initial_status) return initial_keyword;
            return new_status === "todo" ? "TODO" : "DONE";
        }(new_status, this.props.todo_status, this.props.status);
        this.props.onTaskUpdate('status', this.props.line, new_status_label);
    }

    onTimeSet(keyword, existing, value){
        if(existing === true){
            this.props.onTaskUpdate(
                "existing_"+keyword,
                [
                    this.props.line,
                    this.props.sortKey,
                    this.props[keyword].line,
                ],
                value
            );
        }else{
            const opposite_keyword = keyword === "scheduled" ? "deadline" : "scheduled";
            this.props.onTaskUpdate(
                "new_"+keyword,
                [
                    this.props.line,
                    this.props.sortKey,
                    this.props[opposite_keyword] && this.props[opposite_keyword].line || null
                ],
                value
            );
        }
    }

    render(){
        const dateInput = (obj) => {
            if(!obj || !obj.timestamp) return "";
            const d = new Date(obj.timestamp);
            return d.getFullYear()+"-"+leftPad((d.getMonth() + 1).toString(), 2)+"-"+leftPad(d.getDate().toString(), 2);
        };
        return (
            <div className="component_headline">
              <div className={"no-select headline-main "+(this.state.status || "")}>
                <div className="title" onClick={this.onStatusToggle.bind(this)}>
                  <div className={(this.props.todo_priority? this.props.todo_priority + " " : "")+(this.props.overdue === true ? "overdue" : "")}>
                    <span className="label">{this.props.title}</span>
                    <NgIf cond={this.props.scheduled !== null && this.props.scheduled.timestamp === this.props.date} type="inline">
                      <Icon name="schedule" />
                    </NgIf>
                    <NgIf cond={this.props.deadline !== null && this.props.deadline.timestamp === this.props.date} type="inline">
                      <Icon name="deadline" />
                    </NgIf>
                    <div className="tags">
                      {
                          this.props.tags.map((tag, i) => {
                              return (
                                  <span className="tag" key={i}>{tag}</span>
                              );
                          })
                      }
                    </div>
                  </div>
                </div>
                <Dropdown onChange={this.onMenuAction.bind(this)}>
                  <DropdownButton>
                    <Icon name="more" />
                  </DropdownButton>
                  <DropdownList>
                    <DropdownItem name="navigate" icon="arrow_right"> Navigate </DropdownItem>
                    <DropdownItem name="properties"> Properties </DropdownItem>
                  </DropdownList>
                </Dropdown>
              </div>
              <NgIf className="headline-properties" cond={this.state.properties}>
                <div>
                  <label> <Icon name="schedule" />
                    <NgIf cond={this.props.scheduled !== null}>
                      <input type="date" value={dateInput(this.props.scheduled)} onChange={(e) => this.onTimeSet('scheduled', true, e.target.value)}/>
                    </NgIf>
                    <NgIf cond={this.props.scheduled === null}>
                      <input type="date" onChange={(e) => this.onTimeSet('scheduled', false, e.target.value)}/>
                    </NgIf>
                  </label>
                </div>
                <div>
                  <label> <Icon name="deadline" />
                    <NgIf cond={this.props.deadline !== null}>
                      <input type="date" value={dateInput(this.props.deadline)} onChange={(e) => this.onTimeSet('deadline', true, e.target.value)}/>
                    </NgIf>
                    <NgIf cond={this.props.deadline === null}>
                      <input type="date" onChange={(e) => this.onTimeSet('deadline', false, e.target.value)}/>
                    </NgIf>
                  </label>
                </div>
              </NgIf>
              <NgIf cond={this.props.tasks.length > 0 && this.state.status === "todo" && this.props.type === 'todos'} className="subtask_container">
                {
                    this.props.tasks.map((task, i) => {
                        return (
                            <Subtask key={i} label={task.title} status={task.status}
                                     onStatusChange={this.props.onTaskUpdate.bind(this, 'subtask', task.line)} />
                        );
                    })
                }
              </NgIf>
            </div>
        );
    }
}

class Subtask extends React.Component {
    constructor(props){
        super(props);
        this.state = this.calculateState();
    }

    calculateState(){
        return {checked: this.props.status === "DONE"};
    }

    updateState(e){
        const checked = e.target.checked;
        this.setState({checked: checked}, () => {
            // We don't want the interface to feel laggy while a task is beeing updated. Updating the content
            // and reparsing the result is an expensive operation, this makes it feel like a piece of cake
            window.setTimeout(() => {
                window.requestAnimationFrame(() => this.props.onStatusChange(checked ? "DONE" : "TODO"));
            }, 0);
        });
    }

    render(){
        return (
            <div className="component_subtask no-select">
              <label>
                <input type="checkbox" checked={this.state.checked}
                       onChange={this.updateState.bind(this)} />
                  <span>{this.props.label}</span>
              </label>
            </div>
        );
    }
}
