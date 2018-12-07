export const FormObjToJSON = function(o, fn){
    let obj = Object.assign({}, o);
    Object.keys(obj).map((key) => {
        let t = obj[key];
        if("label" in t && "type" in t && "default" in t && "value" in t){
            if(typeof fn === "function"){
                fn(obj, key);
            } else {
                obj[key] = obj[key].value;
            }
        } else {
            obj[key] = FormObjToJSON(obj[key], fn);
        }
    });
    return obj
};
