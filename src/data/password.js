function keyManager(){
    let key = null;
    return {
        get: function(){
            return key;
        },
        set: function(_key){
            key = _key || null
        }
    }
}


export const password = keyManager();
