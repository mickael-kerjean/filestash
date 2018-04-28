import React from 'react';
import { StickyContainer, Sticky } from 'react-sticky';

import { Modal, Container, NgIf, Icon, Dropdown, DropdownButton, DropdownList, DropdownItem } from '../../components/';
import { extractEvents, extractTodos } from '../../helpers/org';
import './org_viewer.scss';

export const OrgEventsViewer = (props) => {
    if(props.isActive !== true) return null;
    const headlines = extractEvents(props.content);

    return (
        <OrgViewer title="Agenda" headlines={headlines} content={props.content} isActive={props.isActive}
                   onQuit={props.onQuit} goTo={props.goTo} onUpdate={props.onUpdate} />
    );
};

export const OrgTodosViewer = (props) => {
    if(props.isActive !== true) return null;
    const headlines = extractTodos(props.content);

    return (
        <OrgViewer title="Todos" headlines={headlines} content={props.content} isActive={props.isActive}
                   onQuit={props.onQuit} goTo={props.goTo} onUpdate={props.onUpdate} />
    );
};



class OrgViewer extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            headlines: this.buildHeadlines(props.headlines)
        };
    }

    componentWillReceiveProps(props){
        this.setState({
            headlines: this.buildHeadlines(props.headlines)
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

    navigate(line){
        this.props.onQuit();
        this.props.goTo(line);
    }


    onTaskUpdate(type, line, value){
        const content = this.props.content.split("\n");
        switch(type){
        case "status":
            const [status, state] = value;
            let next = "DONE";
            if(status === "DONE") next = "TODO";
            content[line] = content[line].replace(status, next);
            break;
        case "subtask":
            if(value === "DONE"){
                content[line] = content[line].replace(/\[.\]/, '[X]');
            }else{
                content[line] = content[line].replace(/\[.\]/, '[ ]');
            }
            break;
        case "schedule":
            break;
        case "deadline":
            break;
        };
        this.props.onUpdate(content.join("\n"));
    }


    render(){
        return (
            <Modal className="todo-modal" isActive={this.props.isActive} onQuit={this.props.onQuit}>
              <div className="modal-top no-select">
                <span onClick={this.props.onQuit}>
                  <Icon name="close"/>
                </span>
                <h1>{this.props.title}</h1>
              </div>
              <NgIf cond={this.props.headlines.length === 0} className="nothing">
                Nothing
              </NgIf>
              <NgIf cond={this.props.headlines.length > 0}>
                <StickyContainer className="container" style={{height: window.innerHeight > 650 ? 500 : window.innerHeight - 150}}>
                  {
                      Object.keys(this.state.headlines).map((list, i) => {
                          return (
                            <div key={i}>
                              <Sticky relative>
                                {
                                  ({isSticky, wasSticky, style, distanceFromTop, distanceFromBottom, calculatedHeight}) => {
                                    return (
                                        <div className="sticky_header no-select" style={{...style, overflow: "auto", background: "white"}}>
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

    render(){
        return (
            <div className="component_headline">
              <div className={"no-select headline-main "+this.props.todo_status + " " +(this.props.is_overdue === true ? "overdue" : "")}>
                <div className="title" onClick={this.props.onTaskUpdate.bind(this, 'status', this.props.line, [this.props.status, this.props.todo_status])}>
                  <div>
                    <span>{this.props.title}</span>
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
                  </DropdownList>
                </Dropdown>
              </div>
              <NgIf className="headline-properties" cond={this.state.properties}>
                <div>
                  <label> <Icon name="schedule" />
                    <input type="date" onChange={(e) => this.props.onTaskUpdate.bind(this, 'schedule', this.props.line, e.target.value)}/>
                  </label>
                </div>
                <div>
                  <label> <Icon name="deadline" />
                    <input type="date" onChange={(e) => this.props.onTaskUpdate.bind(this, 'deadline', this.props.line, e.target.value)}/>
                  </label>
                </div>
              </NgIf>
              <NgIf cond={this.props.tasks.length > 0 && this.props.todo_status === "todo" && this.props.type === 'todos'} className="subtask_container">
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
