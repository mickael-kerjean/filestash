import React from 'react';
import { BrowserRouter, Route, IndexRoute, Switch } from 'react-router-dom';
import { NotFoundPage, ConnectPage, HomePage, LogoutPage, FilesPage, ViewerPage } from './pages/';
import { Bundle, URL_HOME, URL_FILES, URL_VIEWER, URL_LOGIN, URL_LOGOUT } from  './helpers/';

// import {FilesPage} from './pages/filespage';
// import {ViewerPage} from './pages/viewerpage';
// const FilesPage = (props) => (
//     <Bundle loader={import(/* webpackChunkName: "route" */ "./pages/filespage")} symbol="FilesPage">
//       {(Comp) => <Comp {...props}/>}
//     </Bundle>
// );
// const ViewerPage = (props) => (
//     <Bundle loader={import(/* webpackChunkName: "route" */"./pages/viewerpage")} symbol="ViewerPage">
//       {(Comp) => <Comp {...props}/>}
//     </Bundle>
// );

export default class AppRouter extends React.Component {
    render() {
        return (
            <BrowserRouter>
              <div>
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
        );
    }
}
