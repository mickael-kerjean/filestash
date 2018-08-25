import { http_get, http_post, http_delete } from '../helpers/';

class SessionManager{
    isLoggedIn(){
        let url = '/api/session'
        return http_get(url)
            .then(data => data.result);
    }

    url(type){
        if(type === 'dropbox'){
            let url = '/api/session/auth/dropbox';
            return http_get(url)
                .then(data => data.result);
        }else if(type === 'gdrive'){
            let url = '/api/session/auth/gdrive';
            return http_get(url)
                .then(data => data.result);
        }else if(type === 'custombackend'){
            let url = '/api/session/auth/custombackend';
            return http_get(url)
                .then(data => data.result);
        }else{
            return Promise.reject({message: 'no authorization backend', code: 'UNKNOWN_PROVIDER'});
        }
    }

    authenticate(params){
        let url = '/api/session';
        return http_post(url, params)
            .then(data => data.result);
    }

    logout(){
        let url = '/api/session';
        return http_delete(url)
            .then(data => data.result);
    }
}

export const Session = new SessionManager();
