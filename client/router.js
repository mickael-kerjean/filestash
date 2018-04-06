import React from 'react';
import { BrowserRouter, Route, IndexRoute, Switch } from 'react-router-dom';
import { NotFoundPage, ConnectPage, HomePage, LogoutPage, FilesPage, ViewerPage } from './pages/';
import { Bundle, URL_HOME, URL_FILES, URL_VIEWER, URL_LOGIN, URL_LOGOUT } from  './helpers/';
import { ModalPrompt, Audio, Video } from './components/';

export default class AppRouter extends React.Component {
    render() {
        return (
            <div style={{height: '100%'}}>
              <BrowserRouter>
                <div style={{height: '100%'}}>
                  <Switch>
                    <Route exact path="/" component={HomePage} />
                    <Route path="/login" component={ConnectPage} />
                    <Route path="/files/:path*" component={FilesPage} />
                    <Route path="/view/:path*" component={ViewerPage} />
                    <Route path="/logout" component={LogoutPage} />
                    <Route component={NotFoundPage} />
                  </Switch>
                </div>
              </BrowserRouter>
              <ModalPrompt />
              <Notification />
            </div>
        );
    }
}
