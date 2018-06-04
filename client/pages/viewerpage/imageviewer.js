import React from 'react';
import EXIF from 'exif-js';
import path from 'path';
import { withRouter } from 'react-router-dom';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import { browserHistory } from 'react-router-dom';

import { MenuBar } from './menubar';
import { Icon, NgIf, Loader, EventEmitter, EventReceiver } from '../../components/';
import { alert } from '../../helpers/';
import { Pager } from './pager';
import './imageviewer.scss';
import './pager.scss';


@EventReceiver
export class ImageViewer extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            preload: null,
            _: null
        };
        this.refresh = this.refresh.bind(this);
    }

    componentDidMount(){
        this.props.subscribe("media::preload", (preload) => {
            this.setState({preload: preload});
        });
        document.addEventListener('webkitfullscreenchange', this.refresh);
        document.addEventListener('mozfullscreenchange', this.refresh);
        document.addEventListener('fullscreenchange', this.refresh);
    }

    componentWillUnmount(){
        this.props.unsubscribe("media::preload");
        document.removeEventListener('webkitfullscreenchange', this.refresh);
        document.removeEventListener('mozfullscreenchange', this.refresh);
        document.removeEventListener('fullscreenchange', this.refresh);
    }

    refresh(){
        this.setState({"_": Math.random()});
    }

    openExif(){
        alert.now(<Exif />);
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
                  <Icon name="info" onClick={this.openExif.bind(this)} />
                </NgIf>
                <NgIf type="inline" cond={("webkitRequestFullscreen" in document.body) || ("mozRequestFullScreen" in document.body)}>
                  <Icon name="fullscreen" onClick={this.requestFullScreen.bind(this)} />
                </NgIf>
              </MenuBar>
              <div ref="$container" className={"component_image_container "+(document.webkitIsFullScreen || document.mozFullScreen ? "fullscreen" : "")}>
                <div className="images_wrapper">
                  <ImageFancy url={this.props.data} />
                </div>
                <Pager
                  type={["image"]}
                  path={this.props.path}
                  next={(e) => this.setState({preload: e})} />
              </div>
              <Img style={{display: "none"}} src={this.state.preload}/>
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

const Img = (props) => {
    const image_url = (url, size) => {
        return url+"&meta=true&size="+parseInt(window.innerWidth*size);
    };
    if(!props.src) return null;

    return (
        <img
          {...props}
          src={image_url(props.src, 1)}
          srcSet={image_url(props.src, 1)+", "+image_url(props.src, 3/2)+" 1.5x, "+image_url(props.src, 2)+" 2x"}
          />
    );
};


class Exif extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            date: null,
            location: null,
            iso: null,
            aperture: null,
            shutter: null,
            model: null,
            maker: null
        };
    }

    componentDidMount(){
        let self = this;
        EXIF.enableXmp();
        EXIF.getData(document.querySelector("img.photo"), function(){
            const metadata = EXIF.getAllTags(this);
            self.setState({
                date: metadata['DateTime'] || metadata['DateTimeDigitized'] || metadata['DateTimeOriginal'] || metadata['GPSDateStamp'],
                location: metadata['GPSLatitude'] && metadata['GPSLongitude'] && [
                    [ metadata['GPSLatitude'][0], metadata['GPSLatitude'][1], metadata['GPSLatitude'][2], metadata["GPSLatitudeRef"]],
                    [ metadata['GPSLongitude'][0], metadata['GPSLongitude'][1], metadata['GPSLongitude'][2], metadata["GPSLongitudeRef"]]
                ],
                maker: metadata['Make'],
                model: metadata['Model'],
                focal: metadata['FocalLength'],
                aperture: metadata['FNumber'],
                shutter: metadata['ExposureTime'],
                iso: metadata['ISOSpeedRatings'],
                dimension: [
                    metadata['PixelXDimension'],
                    metadata['PixelYDimension']
                ]
            });
        });
    }

    render(){
        const display_camera = (model, focal) => {
            if(!model && !focal) return "-";
            if(!focal) return model;
            return model+" ("+parseInt(focal)+"mm)";
        };
        const display_settings = (aperture, shutter, iso) => {
            if(!aperture || !shutter || !iso) return "-";
            return "f/"+parseInt(aperture*10)/10+" "+speed(shutter)+" ISO"+iso;
            function speed(n){
                if(n > 60) return (parseInt(n) / 60).toString()+"m";
                if(n >= 1) return parseInt(n).toString()+"s";
                return "1/"+parseInt(nearestPow2(1/n)).toString()+"s";
            }
            function nearestPow2(n){
                const refs = [1,2,3,4,5,6,8,10,13,15,20,25,30,40,45,50,60,80,90,100,125,160,180,200,250,320,350,400,500,640,750,800,1000,1250,1500,1600,2000,2500,3000,3200,4000,5000,6000,6400,8000,12000,16000,32000,50000];
                for(let i=0, l=refs.length; i<l; i++){
                    if(refs[i] <= n) continue;
                    return refs[i] - n < refs[i-1] - n ? refs[i] : refs[i-1];
                }
                return n;
            }
        };
        const display_date = (_date) => {
            if(!_date) return "-";
            let date = _date.substring(0,10).replace(/:/g, "/");
            let time = _date.substring(11,16).replace(":", "h");
            if(Intl && Intl.DateTimeFormat){
                date = Intl.DateTimeFormat().format(new Date(date));
            }

            let text = date;
            if(time) text += " "+time;
            return text;
        };
        const display_location = (location) => {
            if(!location || location.length !== 2) return '-';

            let text = location[0][0]+"°"+location[0][1]+"'"+location[0][2]+"''"+location[0][3];
            text += " ";
            text += location[1][0]+"°"+location[1][1]+"'"+location[1][2]+"''"+location[1][3];
            return text;
        };
        const display_dimension = (dim) => {
            if(!dim || dim.length !== 2) return "-";
            return dim[0]+"x"+dim[1];
        };


        return (
            <div className="component_metadata">
              <div>
                <span className="label no-select">Date: </span>
                <span className="value">{display_date(this.state.date)}</span>
              </div>
              <div>
                <span className="label no-select">Location: </span>
                <span className="value small"><a href={"https://www.google.com/maps/search/?api=1&query="+display_location(this.state.location)}>{display_location(this.state.location)}</a></span>
              </div>
              <div>
                <span className="label no-select">Settings: </span>
                <span className="value">{display_settings(this.state.aperture, this.state.shutter, this.state.iso)}</span>
              </div>
              <div>
                <span className="label no-select">Camera: </span>
                <span className="value">{display_camera(this.state.model,this.state.focal)}</span>
              </div>
            </div>
        );
    }
}
