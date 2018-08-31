import { http_get, http_post, http_delete } from '../helpers/';

class ShareModel {
    constructor(){}

    all(path = "/"){
        const url = `api/share?path=${path}`;
        return http_get(url);
    }

    upsert(obj){
        const url = `/api/share/${obj.id}`
        return http_post(url, obj);
    }

    remove(id){
        const url = `/api/share/${id}`;
        return http_delete(url);
    }
}

export const Share = new ShareModel()
