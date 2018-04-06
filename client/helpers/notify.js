const Message = function (){
    let fn = null;

    return {
        send: function(text, type){
            if(['info', 'success', 'error'].indexOf(type) === -1){ type = 'info'; }
            if(!fn){ return window.setTimeout(() => this.send(text,type), 50); }
            fn(text, type);
            return Promise.resolve();
        },
        subscribe: function(_fn){
            fn = _fn;
        }
    };
};

export const notify = new Message();
