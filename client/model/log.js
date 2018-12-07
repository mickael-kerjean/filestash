import { http_get } from '../helpers/';

class LogManager{
    constructor(){}

    get(maxSize = -1){
        let url = this.url();
        if(maxSize > 0){
            url += "?maxSize="+maxSize
        }
        return http_get(url, 'text');
    }

    url(){
        return "/admin/api/log"
    }
}

export const Log = new LogManager();
