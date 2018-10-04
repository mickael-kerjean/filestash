import { http_get, http_post, http_delete, appendShareToUrl } from '../helpers/';

class ShareModel {
    constructor(){}

    all(path = "/"){
        const url = `/api/share?path=${path}`;
        return http_get(url).then((res) => res.results.map((el) => {
            if(el.can_read === true && el.can_write === false && el.can_upload === false){
                el.role = "viewer";
            }else if(el.can_read === false && el.can_write === false && el.can_upload === true){
                el.role = "uploader";
            }else if(el.can_read === true && el.can_write === true && el.can_upload === true){
                el.role = "editor";
            }else{
                el.role = "n/a";
            }
            return el;
        }));
    }

    get(id){
        const url = `/api/share/${id}`;
        return http_get(url).then((res) => res.result);
    }

    upsert(obj){
        const url = appendShareToUrl(`/api/share/${obj.id}`)
        const data = Object.assign({}, obj);
        delete data.role;
        return http_post(url, data);
    }

    remove(id){
        const url = appendShareToUrl(`/api/share/${id}`);
        return http_delete(url);
    }

    proof(id, data){
        const url = `/api/share/${id}/proof`;
        return http_post(url, data).then((res) => res.result);
    }
}

export const Share = new ShareModel()
