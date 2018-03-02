import { http_get, http_post, http_delete } from '../helpers/';

class SessionManager{
    isLogged(){
        let url = '/api/session'
        return http_get(url);
    }

    url(type){
        if(type === 'dropbox'){
            let url = '/api/session/auth/dropbox';
            return http_get(url);
        }else if(type === 'gdrive'){
            let url = '/api/session/auth/gdrive';
            return http_get(url);
        }else{
            return Promise.error({message: 'not authorization backend for: '+type, code: 'UNKNOWN_PROVIDER'})
        }
    }

    authenticate(params){
        let url = '/api/session';
        return http_post(url, params);
    }

    logout(){
        let url = '/api/session';
        return http_delete(url);
    }
}

export const Session = new SessionManager();
