const Prompt = function (){
    let fn = null;

    return {
        now: function(text, okCallback, cancelCallback, type){
            if(!fn){ return window.setTimeout(() => this.now(text, okCallback, cancelCallback, type), 50); }
            fn(text, okCallback, cancelCallback, type);
        },
        subscribe: function(_fn){
            fn = _fn;
        }
    };
};

export const prompt = new Prompt();
