import React from "react";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";

import { NgIf, Icon } from "./";
import { notify } from "../helpers/";
import { t } from "../locales/";
import "./notification.scss";

export class Notification extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            appear: false,
            message_text: null,
            message_type: null
        };
        this.runner = new TaskManager();
        this.notification_current = null;
    }

    componentDidMount(){
        this.runner.before_run((task) => {
            this.notification_current = task;
        });

        notify.subscribe((message, type) => {
            this.runner.addTask(Task(
                this.openNotification.bind(this, {text: stringify(message), type: type}),
                this.closeNotification.bind(this),
                8000,
                500
            ));
        });

        function stringify(data){
            if(typeof data === "object" && data.message){
                return data.message;
            }else if(typeof data === "string"){
                return data;
            }
            return JSON.stringify(data);
        }
    }

    closeNotification(){
        return new Promise((done) => {
            this.setState({
                appear: false
            }, done);
        });
    }

    openNotification(message){
        return new Promise((done) => {
            this.setState({
                appear: true,
                message_text: message.text,
                message_type: message.type
            }, done);
        });
    }

    cancelAnimation(){
        return this.notification_current.cancel();
    }

    render(){
        return (
            <ReactCSSTransitionGroup transitionName="notification" transitionLeave={true} transitionLeaveTimeout={200} transitionEnter={true} transitionEnterTimeout={100} transitionAppear={false} className="component_notification">
              <NgIf key={this.state.message_text+this.state.message_type+this.state.appear} cond={this.state.appear === true} className="no-select">
                <div className={"component_notification--container "+(this.state.message_type || "info")}>
                  <div className="message">
                    { t(this.state.message_text || "") }
                  </div>
                  <div className="close" onClick={this.cancelAnimation.bind(this)}>
                    <Icon name="close" />
                  </div>
                </div>
              </NgIf>
            </ReactCSSTransitionGroup>
        );
    }
}




function TaskManager(){
    let tasks = [];
    let is_running = false;
    let subscriber = null;
    let current_task = null;

    const ret ={
        addTask: function(task){
            current_task && current_task.cancel();
            tasks.push(task);
            if(tasks.length > 20){
                tasks.splice(0, tasks.length - 10);
            }
            if(is_running === false){
                is_running = true;
                ret._run();
            }
        },
        before_run: function(fn){
            subscriber = fn;
        },
        _run: function(){
            current_task = tasks.shift();
            if(!current_task){
                is_running = false;
                return Promise.resolve();
            }else{
                const mode = tasks.length > 0 ? "minimal" : "normal";
                subscriber(current_task, mode);
                return current_task.run(mode).then(ret._run);
            }
        }
    };
    return ret;
}

function Task(_runCallback, _finishCallback, wait_time_before_finish, minimum_running_time){
    let start_date = null;
    let done = null;
    let promise = new Promise((_done) => { done = _done; });
    let timeout = null;

    const ret = {
        run: function(mode = "normal"){
            const wait = mode === "minimal" ? minimum_running_time : wait_time_before_finish;
            start_date = new Date();

            new Promise((_done) => {
                timeout = window.setTimeout(() => {
                    _done();
                }, 200);
            })
                .then(_runCallback)
                .then(() => new Promise((_done) => {
                    timeout = window.setTimeout(() => {
                        _done();
                    }, wait);
                }))
                .then(() => {
                    ret._complete();
                });
            return promise;
        },
        cancel: function(){
            window.clearTimeout(timeout);
            timeout = null;
            let elapsed_time = new Date() - start_date;

            if(elapsed_time < minimum_running_time){
                window.setTimeout(() => {
                    ret._complete();
                }, minimum_running_time - elapsed_time);
            }else{
                ret._complete();
            }
            return promise;
        },
        _complete: function(){
            if(done){
                _finishCallback();
                done();
            }
            done = null;
            return Promise.resolve();
        }
    };
    return ret;
}
