export const FormObjToJSON = function(o, fn, i = 0) {
    if (i === 0 && o !== null) delete o["constants"];
    const obj = Object.assign({}, o);
    Object.keys(obj).map((key) => {
        const t = obj[key];
        if ("label" in t && "type" in t && "default" in t && "value" in t) {
            if (typeof fn === "function") {
                fn(obj, key);
            } else {
                obj[key] = obj[key].value;
            }
        } else {
            obj[key] = FormObjToJSON(obj[key], fn, i+1);
        }
    });
    return obj;
};


export function createFormBackend(backend_available, backend_data) {
    if (!backend_available) return {};
    else if (!backend_data) return {};
    else if (!backend_available[backend_data.type]) return {};

    let template = JSON.parse(JSON.stringify(backend_available[backend_data.type]));
    for (const key in backend_data) {
        if (key in template) {
            template[key].value = backend_data[key];
            template[key].enabled = true;
        } else {
            // create a form object if data isn't available in the template
            const obj = {};
            obj[key] = {
                label: key,
                type: "text",
                value: null,
                default: backend_data[key],
            };
            template = Object.assign(obj, template);
        }

        if (key === "label") {
            template[key].placeholder = "Name as shown on the login screen.";
            template[key].value = backend_data[key];
            template[key].enabled = true;
        } else if (key === "type") {
            template[key].enabled = true;
        } else if (key === "advanced") {
            template[key].enabled = true;
        }
    }

    const obj = {};
    obj[backend_data.type] = template;
    return obj;
}

/*
 * return a new list of autocompletion candidates considering the current input
 */
export function autocomplete(values, list) {
    if (values.length === 0) return list;
    let candidates_input = [];
    let candidates_output = [];

    for (let i=0; i<list.length; i++) {
        const last_value = values[values.length - 1];

        if (list[i].indexOf(last_value) === 0) {
            const tmp = JSON.parse(JSON.stringify(values));
            tmp[values.length - 1] = list[i];
            if (list[i] === last_value) {
                candidates_input = [tmp];
            } else {
                candidates_input.push(tmp);
            }
            continue;
        }

        if (values.indexOf(list[i]) === -1) {
            candidates_output.push(list[i]);
        }
    }

    if (candidates_input.length === 0) {
        candidates_input = [values];
    }
    candidates_output = [""].concat(candidates_output);

    if (candidates_input.length > 1) {
        return candidates_input.map((candidate) => {
            return candidate.join(", ");
        });
    }
    return candidates_output.map((candidate, idx) => {
        return candidates_input[0]
            .concat(candidate)
            .join(", ")
            .replace(/\,\s?$/, "");
    });
}
