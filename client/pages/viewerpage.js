import React from 'react';
import Path from 'path';

import { Files } from '../model/';
import { BreadCrumb, Bundle, NgIf, Loader, Error, Container, EventReceiver, EventEmitter } from '../components/';
import { debounce, opener } from '../helpers/';
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
            filename: Path.basename(props.match.url.replace('/view', '')) || 'untitled.dat',
            opener: null,
            data: '',
            needSaving: false,
            isSaving: false,
            height: null,
            loading: true,
            error: false
        };
        this.resetHeight = debounce(this.resetHeight.bind(this), 100);
        this.props.subscribe('file.select', this.onPathUpdate.bind(this));
    }

    componentWillMount(){
        this.setState({loading: true, error: false});
        let app = opener(this.state.path);
        if(app === 'editor'){
            Files.cat(this.state.path).then((content) => {
                this.setState({data: content, loading: false, opener: app});
            }).catch(err => {
                if(err && err.code === 'CANCELLED'){ return }
                if(err.code === 'BINARY_FILE'){
                    Files.url(this.state.path).then((url) => {
                        this.setState({data: url, loading: false, opener: 'download'});
                    }).catch(err => {
                        this.setState({error: err});
                    });
                }else{
                    this.setState({error: err});
                }
            });
        }else{
            Files.url(this.state.path).then((url) => {
                this.setState({data: url, loading: false, opener: app});
            }).catch(err => {
                if(err && err.code === 'CANCELLED'){ return }
                this.setState({error: err});
            });
        }
    }

    componentWillUnmount() {
        this.props.unsubscribe('file.select');
        window.removeEventListener("resize", this.resetHeight);
    }


    save(file){
        this.setState({isSaving: true});
        Files.save(this.state.path, file)
            .then(() => {
                this.setState({isSaving: false});
                this.setState({needSaving: false});
            })
            .catch((err) => {
                if(err && err.code === 'CANCELLED'){ return; }
                this.setState({isSaving: false});
                let message = "Oups, something went wrong";
                if(err.message){
                    message += ':\n'+err.message;
                }
                alert(message);
            });
    }

    onPathUpdate(path){
        this.props.history.push('/files'+path);
    }

    needSaving(bool){
        this.setState({needSaving: bool});
    }

    componentDidMount(){
        this.resetHeight();
        window.addEventListener("resize", this.resetHeight);
    }

    resetHeight(){
        this.setState({
            height: document.body.clientHeight - document.querySelector('.breadcrumb').offsetHeight
        });
    }

    render() {
        let style = {height: '100%'};
        return (
            <div>
              <BreadCrumb needSaving={this.state.needSaving} className="breadcrumb" path={this.state.path} />
              <div style={{height: this.state.height ? this.state.height + 'px' : '100%'}}>
                <NgIf cond={this.state.loading === false} style={{height: '100%'}}>
                  <NgIf cond={this.state.opener === 'editor'} style={style}>
                    <IDE needSaving={this.needSaving.bind(this)}
                         isSaving={this.state.isSaving}
                         onSave={this.save.bind(this)}
                         content={this.state.data}
                         filename={this.state.filename}/>
                  </NgIf>
                  <NgIf cond={this.state.opener === 'image'} style={style}>
                    <ImageViewer data={this.state.data} filename={this.state.filename} />
                  </NgIf>
                  <NgIf cond={this.state.opener === 'pdf'} style={style}>
                    <PDFViewer data={this.state.data} filename={this.state.filename} />
                  </NgIf>
                  <NgIf cond={this.state.opener === 'video'} style={style}>
                    <VideoPlayer data={this.state.data} filename={this.state.filename} />
                  </NgIf>
                  <NgIf cond={this.state.opener === 'audio'} style={style}>
                    <AudioPlayer data={this.state.data} filename={this.state.filename} />
                  </NgIf>
                  <NgIf cond={this.state.opener === 'download'} style={style}>
                    <FileDownloader data={this.state.data} filename={this.state.filename} />
                  </NgIf>
                </NgIf>
                <NgIf cond={this.state.loading === true}>
                  <NgIf cond={this.state.error === false}>
                    <Loader/>
                  </NgIf>
                  <NgIf cond={this.state.error !== false} onClick={this.componentWillMount.bind(this)} style={{cursor: 'pointer'}}>
                    <Error err={this.state.error}/>
                  </NgIf>
                </NgIf>
              </div>
            </div>
        );
    }
}
