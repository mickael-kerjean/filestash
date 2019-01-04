import { http_get, http_post, http_delete } from '../helpers/';

class SessionManager{
    currentUser(){
        let url = '/api/session'
        return http_get(url)
            .then(data => data.result);
    }

    oauth2(url){
        return http_get(url)
            .then(data => data.result);
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
