const Alert = function (){
    let fn = null;

    return {
        now: function(Component, okCallback){
            if(!fn){ return window.setTimeout(() => this.now(Component, okCallback), 50); }
            fn(Component, okCallback);
        },
        subscribe: function(_fn){
            fn = _fn;
        }
    };
};

export const alert = new Alert();
