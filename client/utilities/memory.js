function Memory(){
    let data = {};

    return {
        get: function(key){
            if(!data[key]) return null;
            return data[key];
        },
        set: function(key, value){
            if(!data[key]) data[key] = {};
            data[key] = value;
        }
    }
}


export const memory = new Memory();
