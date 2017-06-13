// cheap event system that handle subscription, unsubscriptions and event emitions
import React from 'react';
let emitters = {}

function subscribe(key, event, fn){
    if(emitters[event]){
        emitters[event][key] = fn;
    }else{
        emitters[event] = {};
        emitters[event][key] = fn;
    }
}

function unsubscribe(key, event){
    if(emitters[event]){
        if(key){
            delete emitters[event][key];
        }else{
            delete emitters[event];
        }
    }
}

function emit(event, payload){
    // trigger events if needed
    if(emitters[event]){
        return Promise.all(Object.keys(emitters[event]).map((key) => {
            return emitters[event][key].apply(null, payload)
        })).then((res) => {
            return emitters[event] ? Promise.resolve(res) : Promise.reject({message: 'do not exist', code: 'CANCELLED'})
        });
    }else{
        return Promise.reject({message: 'oups, something went wrong', code: 'NO_LISTENERS'})
    }
}


export function EventReceiver(WrappedComponent){
    let id = Math.random().toString();
    
    return class extends React.Component {
        subscribe(event, callback){
            subscribe(id, event, callback)
        }

        unsubscribe(event){
            unsubscribe(id, event)
        }

        render(){
            return <WrappedComponent subscribe={this.subscribe} unsubscribe={this.unsubscribe} {...this.props} />;
        }
    }
}



export function EventEmitter(WrappedComponent) {
    return class extends React.Component {
        emit(){
            // reconstruct arguments
            let args = Array.prototype.slice.call(arguments);
            let event = args.shift();
            let payload = args;            

            let res = emit(event, payload);
            if(res.then){
                return res;
            }else{
                return Promise.resolve(res)
            }
        }

        render() {
            return <WrappedComponent emit={this.emit} {...this.props} />;
        }
    }
}
