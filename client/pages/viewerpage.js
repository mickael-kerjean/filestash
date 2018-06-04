import React from 'react';
import Path from 'path';

import './viewerpage.scss';
import './error.scss';
import { Files } from '../model/';
import { BreadCrumb, Bundle, NgIf, Loader, Container, EventReceiver, EventEmitter } from '../components/';
import { debounce, opener, notify } from '../helpers/';
import { AudioPlayer, FileDownloader, ImageViewer, PDFViewer } from './viewerpage/';

const VideoPlayer = (props) => (
    <Bundle loader={import(/* webpackChunkName: "video" */"../pages/viewerpage/videoplayer")} symbol="VideoPlayer">
      {(Comp) => <Comp {...props}/>}
    </Bundle>
);
const IDE = (props) => (
    <Bundle loader={import(/* webpackChunkName: "ide" */"../pages/viewerpage/ide")} symbol="IDE">
      {(Comp) => <Comp {...props}/>}
    </Bundle>
);

@EventReceiver
export class ViewerPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            path: props.match.url.replace('/view', '') + (location.hash || ""),
            url: null,
            filename: Path.basename(props.match.url.replace('/view', '')) || 'untitled.dat',
            opener: null,
            content: null,
            needSaving: false,
            isSaving: false,
            loading: true,
            error: null
        };
        this.props.subscribe('file.select', this.onPathUpdate.bind(this));
    }

    componentWillReceiveProps(props){
        this.setState({
            path: props.match.url.replace('/view', '') + (location.hash || ""),
            filename: Path.basename(props.match.url.replace('/view', '')) || 'untitled.dat'
        }, () => { this.componentWillMount(); });
    }

    componentWillMount(){
        const metadata = () => {
            return new Promise((done, err) => {
                let app_opener = opener(this.state.path);
                Files.url(this.state.path).then((url) => {
                    this.setState({
                        url: url,
                        opener: app_opener
                    }, () => done(app_opener));
                }).catch(error => {
                    notify.send(err, 'error');
                    err(error);
                });
            });
        };
        const data_fetch = (app) => {
            if(app === 'editor'){
                Files.cat(this.state.path).then((content) => {
                    this.setState({content: content, loading: false});
                }).catch(err => {
                    if(err && err.code === 'BINARY_FILE'){
                        this.setState({opener: 'download', loading: false});
                    }else{
                        this.setState({error: err});
                    }
                });
            }else{
                this.setState({loading: false});
            }
        };
        return metadata()
            .then(data_fetch);
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
                return Promise.reject();
            });
    }

    onPathUpdate(path){
        this.props.history.push('/files'+path);
    }

    needSaving(bool){
        this.setState({needSaving: bool});
    }

    render() {
        return (
            <div className="component_page_viewerpage">
              <BreadCrumb needSaving={this.state.needSaving} className="breadcrumb" path={this.state.path} />
              <div className="page_container">
                <NgIf cond={this.state.loading === false && this.state.error === null}>
                  <NgIf cond={this.state.opener === 'editor'}>
                    <IDE needSavingUpdate={this.needSaving.bind(this)}
                         needSaving={this.state.needSaving}
                         isSaving={this.state.isSaving}
                         onSave={this.save.bind(this)}
                         content={this.state.content || ""}
                         url={this.state.url}
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
                  <NgIf cond={this.state.opener === 'audio'}>
                    <AudioPlayer data={this.state.url} filename={this.state.filename} />
                  </NgIf>
                  <NgIf cond={this.state.opener === 'download'}>
                    <FileDownloader data={this.state.url} filename={this.state.filename} />
                  </NgIf>
                </NgIf>
                <NgIf cond={this.state.loading === true && this.state.error === null}>
                  <Loader/>
                </NgIf>
                <NgIf cond={this.state.error !== null} className="error-page">
                  <h1>Oops!</h1>
                  <h2>There is nothing in here</h2>
                  <p>{JSON.stringify(this.state.error)}</p>
                </NgIf>
              </div>
            </div>
        );
    }
}
