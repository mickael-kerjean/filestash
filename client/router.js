import React from 'react';
import { BrowserRouter, Route, IndexRoute, Switch } from 'react-router-dom';
import { NotFoundPage, ConnectPage, HomePage, SharePage, LogoutPage, FilesPage, ViewerPage } from './pages/';
import { URL_HOME, URL_FILES, URL_VIEWER, URL_LOGIN, URL_LOGOUT } from  './helpers/';
import { Bundle, ModalPrompt, ModalAlert, ModalConfirm, Notification, Audio, Video } from './components/';

const AdminPage = (props) => (
    <Bundle loader={import(/* webpackChunkName: "admin" */"./pages/adminpage")} symbol="AdminPage">
      {(Comp) => <Comp {...props}/>}
    </Bundle>
);

export default class AppRouter extends React.Component {
    render() {
        return (
            <div style={{height: '100%'}}>
              <BrowserRouter>
                <Switch>
                  <Route exact path="/" component={HomePage} />
                  <Route path="/s/:id*" component={SharePage} />
                  <Route path="/login" component={ConnectPage} />
                  <Route path="/files/:path*" component={FilesPage} />
                  <Route path="/view/:path*" component={ViewerPage} />
                  <Route path="/logout" component={LogoutPage} />
                  <Route path="/admin" component={AdminPage} />
                  <Route component={NotFoundPage} />
                </Switch>
              </BrowserRouter>
              <ModalPrompt /> <ModalAlert /> <ModalConfirm />
              <Notification />
            </div>
        );
    }
}
