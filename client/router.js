import React from 'react'
import { BrowserRouter, Route, IndexRoute } from 'react-router-dom'
import { NotFoundPage, ConnectPage, HomePage, FilesPage, ViewerPage, LogoutPage } from './pages/';
import { URL_HOME, URL_FILES, URL_VIEWER, URL_LOGIN, URL_LOGOUT } from  './utilities/';
import { createBrowserHistory } from 'history'



export default class AppRouter extends React.Component {
  render() {
      return (
          <BrowserRouter history={createBrowserHistory()}>
            <div>
              <Route exact path="/" component={HomePage} />
              <Route path="/login" component={ConnectPage} />
              <Route path="/files/:path*" component={FilesPage} />
              <Route path="/view/:path*" component={ViewerPage} />
              <Route path="/logout" component={LogoutPage} />
            </div>
          </BrowserRouter>
    );
  }
}

