import React from 'react'
import { BrowserRouter, Route, IndexRoute } from 'react-router-dom'
import { NotFoundPage, ConnectPage, HomePage, LogoutPage } from './pages/';
import { Bundle, URL_HOME, URL_FILES, URL_VIEWER, URL_LOGIN, URL_LOGOUT } from  './utilities/';

const FilesPage = (props) => (
    <Bundle loader={import(/* webpackChunkName: "route" */ "./pages/filespage")} symbol="FilesPage">
      {(Comp) => <Comp {...props}/>}
    </Bundle>
);
const ViewerPage = (props) => (
    <Bundle loader={import(/* webpackChunkName: "route" */"./pages/viewerpage")} symbol="ViewerPage">
      {(Comp) => <Comp {...props}/>}
    </Bundle>
);

export default class AppRouter extends React.Component {
    render() {
        return (
            <BrowserRouter>
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
