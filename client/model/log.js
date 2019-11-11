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
        return "/admin/api/log";
    }

    report(msg, link, lineNo, columnNo, error){
        let url = "/report?";
        url += "url="+encodeURIComponent(location.href)+"&";
        url += "error="+encodeURIComponent(error.message)+"&";
        url += "msg="+encodeURIComponent(msg)+"&";
        url += "from="+encodeURIComponent(link)+"&";
        url += "from.lineNo="+lineNo+"&";
        url += "from.columnNo="+columnNo;
        return http_post(url);
    }
}

export const Log = new LogManager();
