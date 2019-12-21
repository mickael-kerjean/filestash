import React from 'react';
import Path from 'path';

import './viewerpage.scss';
import './error.scss';
import { Files } from '../model/';
import { BreadCrumb, Bundle, NgIf, Loader, Container, EventReceiver, EventEmitter, LoggedInOnly , ErrorPage } from '../components/';
import { debounce, opener, notify } from '../helpers/';
import { FileDownloader, ImageViewer, PDFViewer, FormViewer } from './viewerpage/';

const VideoPlayer = (props) => (
    <Bundle loader={import(/* webpackChunkName: "video" */"./viewerpage/videoplayer")} symbol="VideoPlayer" overrides={["/overrides/video-transcoder.js"]} >
      {(Comp) => <Comp {...props}/>}
    </Bundle>
);
const IDE = (props) => (
    <Bundle loader={import(/* webpackChunkName: "ide" */"./viewerpage/ide")} symbol="IDE">
      {(Comp) => <Comp {...props}/>}
    </Bundle>
);
const AudioPlayer = (props) => (
    <Bundle loader={import(/* webpackChunkName: "audioplayer" */"./viewerpage/audioplayer")} symbol="AudioPlayer">
      {(Comp) => <Comp {...props}/>}
    </Bundle>
);
const Appframe = (props) => (
    <Bundle loader={import(/* webpackChunkName: "appframe" */"./viewerpage/appframe")} symbol="AppFrame">
      {(Comp) => <Comp {...props}/>}
    </Bundle>
);

@ErrorPage
@LoggedInOnly
@EventReceiver
export class ViewerPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            path: props.match.url.replace('/view', '').replace(/%23/g, "#") + (location.hash || ""),
            url: null,
            filename: Path.basename(props.match.url.replace('/view', '')) || 'untitled.dat',
            opener: null,
            content: null,
            needSaving: false,
            isSaving: false,
            loading: true,
            application_arguments: null
        };
        this.props.subscribe('file.select', this.onPathUpdate.bind(this));
    }

    componentWillReceiveProps(props){
        this.setState({
            path: props.match.url.replace('/view', '').replace(/%23/g, "#") + (location.hash || ""),
            filename: Path.basename(props.match.url.replace('/view', '')) || 'untitled.dat'
        }, () => { this.componentDidMount(); });
    }

    componentDidMount(){
        const metadata = () => {
            return new Promise((done, err) => {
                let [app_opener, app_args] = opener(this.state.path);
                Files.url(this.state.path).then((url) => {
                    this.setState({
                        url: url,
                        opener: app_opener,
                        application_arguments: app_args
                    }, () => done(app_opener));
                }).catch(error => {
                    this.props.error(error);
                    err(error);
                });
            });
        };
        const data_fetch = (app) => {
            if(app === "editor" || app === "form"){
                return Promise.all([
                    Files.cat(this.state.path),
                    Files.options(this.state.path)
                ]).then((d) => {
                    const [content, options] = d;
                    this.setState({
                        content: content,
                        loading: false,
                        acl: options["allow"]
                    });
                }).catch((err) => {
                    if(err && err.code === 'BINARY_FILE'){
                        this.setState({opener: 'download', loading: false});
                    }else{
                        this.props.error(err);
                    }
                });
            }
            this.setState({loading: false});
        };
        return metadata().then(data_fetch);
    }

    componentWillUnmount() {
        this.props.unsubscribe('file.select');
    }

    save(file){
        this.setState({isSaving: true});
        return Files.save(this.state.path, file)
            .then(() => {
                this.setState({isSaving: false, needSaving: false});
                return Promise.resolve();
            })
            .then(() => {
                return new Promise((done, err) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        this.setState({content: reader.result});
                        done();
                    };
                    reader.onerror = (e) => {
                        err({message: 'Internal error 500'});
                    };
                    reader.readAsText(file);
                });
            })
            .catch((err) => {
                if(err && err.code === 'CANCELLED'){ return; }
                this.setState({isSaving: false});
                notify.send(err, 'error');
                return Promise.reject(err);
            });
    }

    onPathUpdate(path){
        this.props.history.push('/files'+path);
    }

    needSaving(bool){
        return new Promise((done) => {
            this.setState({needSaving: bool}, done);
        });
    }

    render() {
        return (
            <div className="component_page_viewerpage">
              <BreadCrumb needSaving={this.state.needSaving} className="breadcrumb" path={this.state.path} />
              <div className="page_container">
                <NgIf cond={this.state.loading === false}>
                  <NgIf cond={this.state.opener === 'editor'}>
                    <IDE needSavingUpdate={this.needSaving.bind(this)}
                         needSaving={this.state.needSaving}
                         isSaving={this.state.isSaving}
                         onSave={this.save.bind(this)}
                         content={this.state.content || ""}
                         url={this.state.url}
                         path={this.state.path}
                         acl={this.state.acl}
                         filename={this.state.filename}/>
                  </NgIf>
                  <NgIf cond={this.state.opener === 'image'}>
                    <ImageViewer data={this.state.url} filename={this.state.filename} path={this.state.path} />
                  </NgIf>
                  <NgIf cond={this.state.opener === 'pdf'}>
                    <PDFViewer data={this.state.url} filename={this.state.filename} />
                  </NgIf>
                  <NgIf cond={this.state.opener === 'video'}>
                    <VideoPlayer data={this.state.url} filename={this.state.filename} path={this.state.path} />
                  </NgIf>
                  <NgIf cond={this.state.opener === 'form'}>
                    <FormViewer needSavingUpdate={this.needSaving.bind(this)}
                                needSaving={this.state.needSaving}
                                isSaving={this.state.isSaving}
                                onSave={this.save.bind(this)}
                                content={this.state.content || ""}
                                data={this.state.url}
                                filename={this.state.filename} />
                  </NgIf>
                  <NgIf cond={this.state.opener === 'audio'}>
                    <AudioPlayer data={this.state.url} filename={this.state.filename} />
                  </NgIf>
                  <NgIf cond={this.state.opener === 'download'}>
                    <FileDownloader data={this.state.url} filename={this.state.filename} />
                  </NgIf>
                  <NgIf cond={this.state.opener === 'appframe'}>
                    <Appframe data={this.state.path} filename={this.state.filename} args={this.state.application_arguments} />
                  </NgIf>
                </NgIf>
                <NgIf cond={this.state.loading === true}>
                  <Loader/>
                </NgIf>
              </div>
            </div>
        );
    }
}
