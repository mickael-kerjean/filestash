import { http_get, http_post } from '../helpers/';

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
        return "/admin/api/logs";
    }

    send(msg) {
        let url = "/report?";
        url += "message="+encodeURIComponent(msg)
        return http_post(url).catch();
    }

    report(msg, link, lineNo, columnNo, error){
        if(navigator.onLine === false) return Promise.resolve();
        let url = "/report?";
        url += "url="+encodeURIComponent(location.href)+"&";
        url += "msg="+encodeURIComponent(msg)+"&";
        url += "from="+encodeURIComponent(link)+"&";
        url += "from.lineNo="+lineNo+"&";
        url += "from.columnNo="+columnNo;
        if(error) url += "error="+encodeURIComponent(error.message)+"&";
        return http_post(url).catch();
    }
}

export const Log = new LogManager();
