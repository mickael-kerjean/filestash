import React from 'react';
import path from 'path';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { MenuBar } from './menubar';
import { Icon, NgIf, Loader, EventEmitter, EventReceiver } from '../../components/';
import { alert } from '../../helpers/';
import { Pager } from './pager';
import { SmallExif, LargeExif } from './image_exif';
import './imageviewer.scss';
import './pager.scss';


@EventReceiver
@EventEmitter
export class ImageViewer extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            preload: null,
            _: null,
            show_exif: false,
            is_loaded: false
        };
        this.shortcut= (e) => {
            if(e.keyCode === 27){ this.setState({show_exif: false}); }
            else if(e.keyCode === 73){ this.setState({show_exif: !this.state.show_exif}); }
        };
        this.refresh = () => { this.setState({"_": Math.random()}); };
    }

    componentDidMount(){
        this.props.subscribe("media::preload", (preload) => {
            this.setState({preload: preload});
        });
        document.addEventListener('webkitfullscreenchange', this.refresh);
        document.addEventListener('mozfullscreenchange', this.refresh);
        document.addEventListener('fullscreenchange', this.refresh);
        document.addEventListener('keydown', this.shortcut);
    }

    componentWillUnmount(){
        this.props.unsubscribe("media::preload");
        document.removeEventListener('webkitfullscreenchange', this.refresh);
        document.removeEventListener('mozfullscreenchange', this.refresh);
        document.removeEventListener('fullscreenchange', this.refresh);
        document.removeEventListener('keydown', this.shortcut);
    }

    componentWillReceiveProps(props){
        if(props.data !== this.props.data){
            this.setState({is_loaded: false});
        }
    }

    toggleExif(){
        if(window.innerWidth < 580){
            alert.now(<SmallExif />);
        }else{
            this.setState({
                show_exif: !this.state.show_exif
            });
        }
    }

    requestFullScreen(){
        if("webkitRequestFullscreen" in document.body){
            this.refs.$container.webkitRequestFullscreen();
        }else if("mozRequestFullScreen" in document.body){
            this.refs.$container.mozRequestFullScreen();
        }
    }

    render(){
        const hasExif = (filename) => {
            const ext = path.extname(filename).toLowerCase().substring(1);
            return ["jpg", "jpeg", "tiff", "tif"].indexOf(ext) !== -1;
        };

        return (
            <div className="component_imageviewer">
              <MenuBar title={this.props.filename} download={this.props.data}>
                <NgIf type="inline" cond={hasExif(this.props.filename)}>
                  <Icon name="info" onClick={this.toggleExif.bind(this)} />
                </NgIf>
                <NgIf type="inline" cond={("webkitRequestFullscreen" in document.body) || ("mozRequestFullScreen" in document.body)}>
                  <Icon name="fullscreen" onClick={this.requestFullScreen.bind(this)} />
                </NgIf>
              </MenuBar>
              <div ref="$container" className={"component_image_container "+(document.webkitIsFullScreen || document.mozFullScreen ? "fullscreen" : "")}>
                <div className="images_wrapper">
                  <ImageFancy onLoad={() => this.setState({is_loaded: true})} url={this.props.data} />
                </div>
                <div className={"images_aside scroll-y"+(this.state.show_exif ? " open": "")}>
                  <div className="header">
                    <div>Info</div>
                    <div style={{flex: 1}}>
                      <Icon name="close" onClick={this.toggleExif.bind(this)} />
                    </div>
                  </div>
                  <div className="content">
                    <LargeExif data={this.props.data} show={this.state.show_exif} ready={this.state.is_loaded} />
                  </div>
                </div>
                <Pager
                  type={["image"]}
                  path={this.props.path}
                  next={(e) => this.setState({preload: e})} />
              </div>

              <NgIf cond={this.state.is_loaded}>
                <Img style={{display: "none"}} src={this.state.preload}/>
              </NgIf>
            </div>
        );
    }
}

@EventEmitter
class ImageFancy extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            isLoading: true,
            isError: false,
            drag_init: {x: null, t: null},
            drag_current: {x: null, t: null},
            hasAction: false
        };

        this.img = new Image();
        this.img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    }

    componentWillReceiveProps(nextProp){
        if(nextProp.url !== this.props.url){
            this.setState({
                isLoading: true,
                isError: false,
                drag_current: {x: 0},
                hasAction: false
            });
        }
    }

    onLoad(){
        this.setState({isLoading: false});
        this.props.onLoad();
    }
    onError(w){
        this.setState({isError: true});
    }

    imageDragStart(e){
        const t = new Date();
        if(e.touches){
            this.setState({
                drag_init: {x: e.touches[0].clientX, t: t},
                hasAction: true
            });
        }else{
            this.setState({
                drag_init: {x: e.pageX, t: t},
                hasAction: true
            });
        }
        if(e.dataTransfer) e.dataTransfer.setDragImage(this.img, 0, 0);
    }
    imageDragEnd(e){
        const drag_end = {
            x: function(dragX, touch){
                const t = new Date();
                if(dragX !== null) return dragX;
                if(touch && touch[0]){
                    return touch[0].clientX;
                }
                return 0;
            }(e.pageX || null, e.changedTouches || null),
            t: new Date()
        };

        const direction = function(x_current, x_init){
            if(x_current.t - x_init.t > 200){
                if(Math.abs(x_current.x - x_init.x) < (window.innerWidth < 500 ? window.innerWidth / 3 : 250)) return "neutral";
            }
            return x_current.x > x_init.x ? "right" : "left";
        }(drag_end, this.state.drag_init);

        if(direction === "left"){
            return this.setState({
                drag_current: {x: - window.innerWidth},
                hasAction: false
            }, () => {
                this.props.emit("media::next");
            });
        }else if(direction === "right"){
            return this.setState({
                drag_current: {x: + window.innerWidth},
                hasAction: false
            }, () => {
                this.props.emit("media::previous");
            });
        }
        return this.setState({
            drag_current: {x: 0},
            hasAction: false
        });
    }
    imageDrag(e){
        if(e.pageX > 0){
            this.setState({drag_current: {x: e.pageX - this.state.drag_init.x}});
        }else if(e.touches && e.touches[0].clientX > 0){
            this.setState({drag_current: {x: e.touches[0].clientX - this.state.drag_init.x}});
        }
    }

    render(){
        if(this.state.isError){
            return (
                <span className="error">
                  <div><div className="label">Can't load this picture</div></div>
                </span>
            );
        }
        if(this.state.isLoading){
            return (
                <div className="loader">
                  <Loader style={{margin: "auto"}}/>
                  <Img
                    className="photo"
                    onError={this.onError.bind(this)}
                    onLoad={this.onLoad.bind(this)}
                    style={{display: 'none'}}
                    src={this.props.url} />
                </div>
            );
        }
        return (
            <ReactCSSTransitionGroup transitionName="image" transitionLeave={true} transitionEnter={true} transitionAppear={true} transitionEnterTimeout={5000} transitionAppearTimeout={5000} transitionLeaveTimeout={5000}>
              <div key={this.props.url}>
                <Img
                  src={this.props.url}
                  style={{transform: 'translateX('+this.state.drag_current.x+'px)'}}
                  className={this.state.hasAction ? "photo": "photo idle"}
                  onTouchStart={this.imageDragStart.bind(this)}
                  onDragStart={this.imageDragStart.bind(this)}
                  onDragEnd={this.imageDragEnd.bind(this)}
                  onTouchEnd={this.imageDragEnd.bind(this)}
                  onDrag={this.imageDrag.bind(this)}
                  onTouchMove={this.imageDrag.bind(this)}
                  draggable="true" />
              </div>
            </ReactCSSTransitionGroup>
        );
    }
}

class Img extends React.Component{
    constructor(props){
        super(props);
    }

    render(){
        const image_url = (url, size) => {
            return url+"&meta=true&size="+parseInt(window.innerWidth*size);
        };
        if(!this.props.src) return null;

        return (
            <img
              {...this.props}
              src={image_url(this.props.src, 1)}
              srcSet={image_url(this.props.src, 1)+", "+image_url(this.props.src, 3/2)+" 1.5x, "+image_url(this.props.src, 2)+" 2x"}
          />
        );
    }
}
