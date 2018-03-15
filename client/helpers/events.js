function Event(){
    this.fns = [];
}
Event.prototype.subscribe = function(name, fn){
    if(!name || typeof fn !== 'function') return;
    this.fns.push({key: name, fn: fn});
}
Event.prototype.unsubscribe = function(name){
    this.fns = this.fns.filter((data) => {
        return data.key === name ? false : true;
    });
}
Event.prototype.emit = function(name, payload){
    this.fns.map((data) => {
        if(data.key === name) data.fn(payload);
    });
}

export const event = new Event();
