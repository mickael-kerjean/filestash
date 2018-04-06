import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { NgIf } from './';
import { notify } from '../helpers/';
import './notification.scss';

export class Notification extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            appear: false,
            message_text: null,
            message_type: null
        };

        function TaskManager(){
            let jobs = [];
            let is_running = false;

            const ret = {
                addJob: (job) => {
                    jobs.push(job);
                    if(is_running === false){
                        is_running = true;
                        ret._executor();
                    }
                },
                _executor: () => {
                    let job = jobs.shift();
                    if(!job){
                        is_running = false;
                        return Promise.resolve();
                    }
                    return job().then(ret._executor);
                }
            };
            return ret;
        }
        this.runner = new TaskManager();
    }

    componentDidMount(){
        notify.subscribe((_message, type) => {
            let job = playMessage.bind(this, {
                text: stringify(_message),
                type: type
            });
            this.runner.addJob(job);
        });
        function stringify(data){
            if(typeof data === 'object' && data.message){
                return data.message;
            }else if(typeof data === 'string'){
                return data;
            }
            return JSON.stringify(data);
        }
        function playMessage(message){
            const displayMessage = (message) => {
                this.setState({
                    appear: true,
                    message_text: message.text,
                    message_type: message.type
                });
                return Promise.resolve(message);
            };
            const waitForABit = (timeout, message) => {
                return new Promise((done, err) => {
                    window.setTimeout(() => {
                        done(message);
                    }, timeout);
                });
            };
            const hideMessage = (message) => {
                this.setState({
                    appear: false
                });
                return Promise.resolve(message);
            };

            return displayMessage(message)
                .then(waitForABit.bind(this, 5000))
                .then(hideMessage)
                .then(waitForABit.bind(this, 1000));
        }
    }

    close(){
        this.setState({ appear: false });
    }

    render(){
        return (
            <NgIf cond={this.state.appear === true} className="component_notification no-select">
              <ReactCSSTransitionGroup transitionName="notification" transitionLeave={true} transitionLeaveTimeout={200} transitionEnter={true} transitionEnterTimeout={500}>
                <div className={"component_notification--container "+(this.state.message_type || 'info')}>
                  <div className="message">
                    { this.state.message_text }
                  </div>
                  <div className="close" onClick={this.close.bind(this)}>X</div>
                </div>
              </ReactCSSTransitionGroup>
            </NgIf>
        );
    }
}
