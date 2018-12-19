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


export function createFormBackend(backend_available, backend_data){
    if(!backend_available) return {};

    let template = JSON.parse(JSON.stringify(backend_available[backend_data.type]));

    for(let key in backend_data){
        if(key in template){
            template[key].value = backend_data[key];
            template[key].enabled = true;
        } else {
            // create a form object if data isn't available in the template
            let obj = {};
            obj[key] = {
                label: key,
                type: "text",
                value: null,
                default: backend_data[key]
            };
            template = Object.assign(obj, template);
        }

        if(key === "label"){
            template[key].placeholder = "Name as shown on the login screen.";
            template[key].value = backend_data[key];
            template[key].enabled = true;
        } else if(key === "type"){
            template[key].enabled = true;
        } else if(key === "advanced"){
            template[key].enabled = true;
        }
    }

    let obj = {};
    obj[backend_data.type] = template;
    return obj;
}
