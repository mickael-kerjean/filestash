import React from 'react';
import { BreadCrumb, Editor } from '../components/';
import { debounce, throttle, NgIf, Loader, Error, Fab, Icon, Container } from '../utilities/';
import { Files, opener, EventReceiver, EventEmitter } from '../data/';
import Path from 'path';
import { theme } from '../utilities';
import WaveSurfer from  'wavesurfer.js';
import videojs from 'video.js';


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

    componentWillUnmount() {
        this.props.unsubscribe('file.select')
        window.removeEventListener("resize", this.resetHeight);
    }


    save(file){
        this.setState({isSaving: true})
        Files.save(this.state.path, file)
            .then(() => {
                this.setState({isSaving: false})
                this.setState({needSaving: false})
            })
            .catch((err) => {
                if(err && err.code === 'CANCELLED'){ return }
                this.setState({isSaving: false})
                let message = "Oups, something went wrong"
                if(err.message){
                    message += ':\n'+err.message
                }
                alert(message);
            });
    }

    onPathUpdate(path){
        this.props.history.push('/files'+path)
    }

    needSaving(bool){
        this.setState({needSaving: bool})
    }

    componentDidMount(){
        this.resetHeight();
        window.addEventListener("resize", this.resetHeight);
        this.setState({loading: true});
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
                  <NgIf cond={this.state.error !== false}>
                    <Error err={this.state.error}/>
                  </NgIf>                                
                </NgIf>
              </div>
            </div>
        );
    }
}


class IDE extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            contentToSave: null
        }
    }

    onContentUpdate(text){
        this.props.needSaving(true);
        this.setState({contentToSave: text})
    }

    save(){
        let file, blob = new window.Blob([this.state.contentToSave], {type : 'text/plain'});
        try{
            file = new window.File([blob], 'test.txt');
        }catch(err){
            // for crappy browser:
            // https://stackoverflow.com/questions/33821631/alternative-for-file-constructor-for-safari            
            file = blob; 
        }
        this.props.onSave(file);
    }

    render(){
        return (
            <div style={{height: '100%'}}>
              <Editor onSave={this.save.bind(this)} filename={this.props.filename} content={this.props.content} onChange={this.onContentUpdate.bind(this)} height={this.state.height}/>
              <NgIf cond={!this.props.isSaving}>
                <Fab onClick={this.save.bind(this)}><Icon name="save" style={{height: '100%', width: '100%'}}/></Fab>
              </NgIf>
              <NgIf cond={this.props.isSaving}>
                <Fab><Icon name="loading_white" style={{height: '100%', width: '100%'}}/></Fab>
              </NgIf>
            </div>
        );
    }
}


const ImageViewer = (props) => {
    return (
        <div style={{height: '100%'}}>
          <MenuBar title={props.filename} download={props.data} />
          <div style={{textAlign: 'center', background: '#525659', height: 'calc(100% - 34px)', overflow: 'hidden', padding: '20px', boxSizing: 'border-box'}}>
            <img src={props.data} style={{maxHeight: '100%', maxWidth: '100%', minHeight: '100px', background: '#f1f1f1', boxShadow: theme.effects.shadow}} />
          </div>
        </div>
    )
}


const PDFViewer = (props) => {
    return (
        <div style={{textAlign: 'center', background: '#525659', height: '100%'}}>
          <embed src={props.data} type="application/pdf" style={{height: '100%', width: '100%'}}></embed>
        </div>
    );
}

class AudioPlayer extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            wafesurfer: null,
            loading: true,
            isPlaying: true,
            error: null
        }
        this.toggle = this.toggle.bind(this);
        window.addEventListener('keypress', this.toggle);
    }

    componentDidMount(){
        let $el = document.querySelector('.player');
        var wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: '#323639',
            progressColor: '#6f6f6f',
            cursorColor: '#323639',
            cursorWidth: 2,
            height: 250,
            barWidth: 1
        });
        this.setState({wavesurfer: wavesurfer});
        wavesurfer.on('ready', () => {
            this.setState({loading: false});
            if(this.state.isPlaying === true){
                wavesurfer.play();
            }
        });
        wavesurfer.on('error', (err) => {
            this.setState({error: err, loading: false});
        });
        wavesurfer.load(this.props.data);
    }

    componentWillUnmount(){
        if(this.state.wavesurfer){
            this.state.wavesurfer.destroy();
        }
        window.removeEventListener('keypress', this.toggle);
    }

    toggle(){
        if(this.state.isPlaying === true){
            this.setState({isPlaying: false});
            this.state.wavesurfer.pause();
        }else{
            this.setState({isPlaying: true});
            this.state.wavesurfer.play();
        }
    }

    onPlay(e){
        e.preventDefault();
        e.stopPropagation();
        this.setState({isPlaying: true})
        this.state.wavesurfer.play();
    }

    onPause(e){
        e.preventDefault();
        e.stopPropagation();
        this.setState({isPlaying: false});
        this.state.wavesurfer.pause();
    }

    render(){
        return (
            <div style={{height: '100%'}}>
              <MenuBar title={this.props.filename} download={this.props.data} />
              <div style={{textAlign: 'center', background: '#525659', height: '100%', overflow: 'hidden', padding: '20px', boxSizing: 'border-box'}}>
                <NgIf cond={this.state.error !== null} style={{color: 'white', marginTop: '30px'}}>
                  {this.state.error}
                </NgIf>
                <NgIf cond={this.state.error === null}>
                  <NgIf cond={this.state.loading === true}>
                    <Icon name="loading" />
                  </NgIf>
                  <div style={{background: '#f1f1f1', boxShadow: theme.effects.shadow, opacity: this.state.loading? '0' : '1', position: 'relative'}}>
                    <div style={{position: 'absolute', top: '10px', right: '10px', zIndex: '2', height: '30px'}}>
                      <NgIf cond={this.state.isPlaying === false} style={{display: 'inline'}}>
                        <span style={{cursor: 'pointer'}} onClick={this.onPlay.bind(this)}><Icon name="play"/></span>
                      </NgIf>
                      <NgIf cond={this.state.isPlaying === true} style={{display: 'inline'}}>
                        <span style={{cursor: 'pointer'}} onClick={this.onPause.bind(this)}><Icon name="pause"/></span>
                      </NgIf>
                    </div>
                    <div id="waveform"></div>
                  </div>
                </NgIf>
              </div>
            </div>
        )
    }
}

class VideoPlayer extends React.Component {
    constructor(props){
        super(props);
    }

    componentDidMount(){
        this.player = videojs(this.videoNode, {
            //autoplay: true,
            controls: true,
            aspectRatio: '16:9',
            fluid: false,
            sources: [{
                src: this.props.data
            }]
        }, function onPlayerReady() {
            //console.log('onPlayerReady', this)
        });
    }

    componentWillUnmount() {
        if (this.player) {
            this.player.dispose()
        }
    }

    render(){
        return (
            <div style={{background: '#525659', height: '100%'}}>
              <MenuBar title={this.props.filename} download={this.props.data} />
              <div style={{padding: '20px'}}>
                <div style={{maxWidth: '800px', width: '100%', margin: '0 auto'}}>
                  <video ref={ node => this.videoNode = node } className="video-js my-skin" style={{boxShadow: theme.effects.shadow}}></video>
                </div>
              </div>
            </div>
        )
    }
}

class MenuBar extends React.Component{
    constructor(props){
        super(props);
        this.state = {loading: false, id: null}
    }

    onDownloadRequest(){
        this.setState({
            loading: true,
            id: window.setInterval(function(){
                if(document.cookie){
                    this.setState({loading: false})
                    window.clearInterval(this.state.id);
                }
            }.bind(this), 80)
        })
    }

    componentWillUnmount(){
        window.clearInterval(this.state.id)
    }

    
    render(){
        return (
            <div style={{background: '#313538', color: '#f1f1f1', boxShadow: theme.effects.shadow_small}}>
              <Container style={{padding: '9px 0', textAlign: 'center', color: '#f1f1f1', fontSize: '0.9em'}}>
                <NgIf cond={this.props.hasOwnProperty('download')} style={{float: 'right', height: '1em'}}>
                  <NgIf cond={!this.state.loading} style={{display: 'inline'}}>
                    <a href={this.props.download} download={this.props.title} onClick={this.onDownloadRequest.bind(this)}>
                      <Icon name="download" style={{width: '15px', height: '15px'}} />
                    </a>
                  </NgIf>
                  <NgIf cond={this.state.loading} style={{display: 'inline'}}>
                    <Icon name="loading" style={{width: '15px', height: '15px'}} />
                  </NgIf>
                </NgIf>
                <span style={{letterSpacing: '0.3px'}}>{this.props.title}</span>
              </Container>
            </div>
        );
    }
}

class FileDownloader extends React.Component{
    constructor(props){
        super(props)
        this.state = {loading: false, id: null};
    }

    onClick(){
        this.setState({
            loading: true,
            id: window.setInterval(function(){
                if(document.cookie){
                    this.setState({loading: false})
                    window.clearInterval(this.state.id);
                }
            }.bind(this), 80)
        });
    }
    
    componentWillUnmount(){
        window.clearInterval(this.state.id)
    }

    render(){
        return (
            <div style={{textAlign: 'center', background: '#525659', height: '100%'}}>
              <div style={{padding: '15px 20px', background: '#323639', borderRadius: '2px', color: 'inherit', boxShadow: theme.effects.shadow, display: 'inline-block', marginTop: '50px'}}>
                <a download={this.props.filename} href={this.props.data}>
                  <NgIf onClick={this.onClick.bind(this)} cond={!this.state.loading} style={{fontSize: '17px', display: 'inline-block'}}>
                    DOWNLOAD
                  </NgIf>
                </a>
                <NgIf cond={this.state.loading} style={{height: '20px', display: 'inline-block'}}>
                  <Icon name="loading"/>
                </NgIf>
              </div>
            </div>            
        );
    }
}
