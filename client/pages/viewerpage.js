import React from 'react';
import Path from 'path';

import { Files } from '../model/';
import { BreadCrumb, Bundle, NgIf, Loader, Container, EventReceiver, EventEmitter } from '../components/';
import { debounce, opener, screenHeight, notify } from '../helpers/';
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
            path: props.match.url.replace('/view', ''),
            url: null,
            filename: Path.basename(props.match.url.replace('/view', '')) || 'untitled.dat',
            opener: null,
            content: null,
            needSaving: false,
            isSaving: false,
            loading: true,
            height: 0
        };
        this.props.subscribe('file.select', this.onPathUpdate.bind(this));
        this.resetHeight = debounce(this.resetHeight.bind(this), 100);
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
                }).catch(err => {
                    notify.send(err, 'error');
                    err(err);
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
                        notify.send(err, 'error');
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
        window.removeEventListener("resize", this.resetHeight);
    }

    componentDidMount(){
        this.resetHeight();
        window.addEventListener("resize", this.resetHeight);
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

    resetHeight(){
        this.setState({
            height: screenHeight()
        });
    }

    render() {
        let style = {height: '100%'};
        return (
            <div style={style}>
              <BreadCrumb needSaving={this.state.needSaving} className="breadcrumb" path={this.state.path} />
              <div style={{height: this.state.height+'px'}}>
                <NgIf cond={this.state.loading === false} style={style}>
                  <NgIf cond={this.state.opener === 'editor'} style={style}>
                    <IDE needSavingUpdate={this.needSaving.bind(this)}
                         needSaving={this.state.needSaving}
                         isSaving={this.state.isSaving}
                         onSave={this.save.bind(this)}
                         content={this.state.content || ""}
                         url={this.state.url}
                         filename={this.state.filename}/>
                  </NgIf>
                  <NgIf cond={this.state.opener === 'image'} style={style}>
                    <ImageViewer data={this.state.url} filename={this.state.filename} />
                  </NgIf>
                  <NgIf cond={this.state.opener === 'pdf'} style={style}>
                    <PDFViewer data={this.state.url} filename={this.state.filename} />
                  </NgIf>
                  <NgIf cond={this.state.opener === 'video'} style={style}>
                    <VideoPlayer data={this.state.url} filename={this.state.filename} />
                  </NgIf>
                  <NgIf cond={this.state.opener === 'audio'} style={style}>
                    <AudioPlayer data={this.state.url} filename={this.state.filename} />
                  </NgIf>
                  <NgIf cond={this.state.opener === 'download'} style={style}>
                    <FileDownloader data={this.state.url} filename={this.state.filename} />
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
