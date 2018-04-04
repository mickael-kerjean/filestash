import { Observable } from 'rxjs/Observable';

const Prompt = function (){
    let obs = null;
    return {
        emit: function(text, okCallback, cancelCallbck, type){
            console.log(obs);
            obs.emit(text, okCallback, cancelcallBack, type);
        },
        subscribe: function(){
            console.log("> SUBSCRIBE")
            return new Observable((_obs) => {
                console.log(_obs);
                obs = _obs;
            });
        }
    }
}

export const prompt = new Prompt();
