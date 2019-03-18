import React from 'react';
import EXIF from 'exif-js';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import { withRouter } from 'react-router-dom';

import { NgIf, Icon, EventReceiver, MapShot, Button } from '../../components/';
import './image_exif.scss';

class Exif extends React.Component {
    constructor(props){
        super(props);
        if(new.target === Exif){
            throw new TypeError("Cannot construct Popup instances directly");
        }
        this.state = {
            date: null,
            location: null,
            iso: null,
            aperture: null,
            shutter: null,
            model: null,
            maker: null,
            all: null
        };
    }

    formatDate(def = null){
        if(!this.state.date) return def;
        return this.state.date.toLocaleDateString(navigator.language, { day: 'numeric', year: 'numeric', month: 'short', day: 'numeric' });
    }
    formatTime(){
        if(!this.state.date) return null;
        return this.state.date.toLocaleTimeString("en-us", {weekday: "short", hour: '2-digit', minute:'2-digit'});
    }

    locationMap(){
        const display_location = (location) => {
            if(!location || location.length !== 2) return null;
            let text = location[0][0]+"°"+location[0][1]+"'"+location[0][2]+"''"+location[0][3];
            text += " ";
            text += location[1][0]+"°"+location[1][1]+"'"+location[1][2]+"''"+location[1][3];
            return text;
        };
        let url = "https://www.google.com/maps/search/?api=1&query=";
        url += display_location(this.state.location);
        return url;
    }

    format(key, def=""){
        if(!this.state[key]) return def;
        if(key === 'focal'){
            return this.state.focal+"mm";
        }else if(key === 'shutter'){
            if(this.state.shutter > 60) return this.state.shutter+"m";
            else if(this.state.shutter > 1) return this.state.shutter+"s";
            return "1/"+parseInt(this.state.shutter.denominator / this.state.shutter.numerator)+"s";
        }else if(key === 'iso'){
            return 'ISO'+this.state.iso;
        }else if(key === 'aperture'){
            return "ƒ"+parseInt(this.state.aperture*10)/10;
        }else if(key === 'dimension'){
            if(this.state.dimension.length !== 2 || !this.state.dimension[0] || !this.state.dimension[1]) return "-";
            return this.state.dimension[0]+"x"+this.state.dimension[1];
        }
        return this.state[key];
    }

    refresh(){
        let self = this;
        let $photo = document.querySelector("img.photo");
        if(!$photo) return;

        EXIF.getData($photo, function(){
            const metadata = EXIF.getAllTags(this);
            self.setState({
                date: to_date(metadata['DateTime'] || metadata['DateTimeDigitized'] || metadata['DateTimeOriginal'] || metadata['GPSDateStamp']),
                location: metadata['GPSLatitude'] && metadata['GPSLongitude'] && [
                    [ metadata['GPSLatitude'][0], metadata['GPSLatitude'][1], metadata['GPSLatitude'][2], metadata["GPSLatitudeRef"]],
                    [ metadata['GPSLongitude'][0], metadata['GPSLongitude'][1], metadata['GPSLongitude'][2], metadata["GPSLongitudeRef"]]
                ] || null,
                maker: metadata['Make'] || null,
                model: metadata['Model'] || null,
                focal: metadata['FocalLength'] || null,
                aperture: metadata['FNumber'] || null,
                shutter: metadata['ExposureTime'] || null,
                iso: metadata['ISOSpeedRatings'] || null,
                dimension: metadata['PixelXDimension'] && metadata['PixelYDimension'] && [
                    metadata['PixelXDimension'],
                    metadata['PixelYDimension']
                ] || null,
                all: Object.keys(metadata).length === 0 ? null : metadata
            });
        });

        function to_date(str){
            if(!str) return null;
            return new Date(... str.split(/[ :]/));
        }
    }

    clear(){
        let new_state = Object.assign({}, this.state);
        Object.keys(new_state).map((key) => new_state[key] = null);
        this.setState(new_state);
    }
}

export class SmallExif extends Exif{
    constructor(props){
        super(props);
    }

    componentDidMount(){
        this.refresh();
    }

    render(){
        const display_camera = (model, focal) => {
            if(!model && !focal) return "-";
            if(!focal) return model;
            return model+" ("+parseInt(focal)+"mm)";
        };
        const display_settings = (aperture, shutter, iso) => {
            if(!aperture || !shutter || !iso) return "-";
            return "ƒ/"+parseInt(aperture*10)/10+" "+speed(shutter)+" ISO"+iso;
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
                <span className="value">{this.formatDate("-")}</span>
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

@EventReceiver
@withRouter
export class LargeExif extends Exif{
    constructor(props){
        super(props);
        this.state['show_more'] = false;
        this.state['_'] = null;
    }

    componentDidMount(){
        this.refresh_handler(this.props);
    }
    componentWillReceiveProps(props){
        this.refresh_handler(props);
    }

    refresh_handler(props){
        if(props.ready === true && props.show === true && this.state['_'] !== props.data){
            this.setState({"_": props.data});
            this.refresh();
        }else if(props.ready === false && props.show === true && this.state['_'] !== null){
            this.setState({"_": null});
            this.clear();
        }
    }

    all_meta(){
        if(!this.state.all) return null;
        const formatKey = (str) => {
            return str.replace(/([A-Z][a-z])/g, ' $1');
        };
        const formatValue = (str) => {
            if(!this.state.all || this.state.all[str] === undefined) return "-";
            if(typeof this.state.all[str] === "number"){
                return parseInt(this.state.all[str]*100)/100;
            }else if(this.state.all[str].denominator !== undefined && this.state.all[str].numerator !== undefined){
                if(this.state.all[str].denominator === 1) return this.state.all[str].numerator;
                else if(this.state.all[str].numerator > this.state.all[str].denominator) return parseInt(this.state.all[str].numerator * 10 / this.state.all[str].denominator) / 10;
                else return this.state.all[str].numerator+"/"+this.state.all[str].denominator;
            }else if(typeof this.state.all[str] === "string"){
                return this.state.all[str];
            }else if(Array.isArray(this.state.all[str])){
                let arr = this.state.all[str];
                if(arr.length > 15){
                    arr = arr.slice(0, 3);
                    arr.push("...");
                }
                return arr.toString().split(",").join(", ");
            }else{
                return JSON.stringify(this.state.all[str], null, 2);
            }
        };
        const alphabetical = (list) => {
            return list.sort((a,b) => {
                if(a.toLowerCase().trim() < b.toLowerCase().trim()) return -1;
                else if(a.toLowerCase().trim() > b.toLowerCase().trim()) return +1;
                return 0;
            });
        };

        return (
            <div>
              {
                  alphabetical(Object.keys(this.state.all)).map((key, i) => {
                      if(key === "undefined") return null;
                      else if(key === "thumbnail") return null;
                      return (
                          <div key={i} className="meta_key">
                            <div className="title">{formatKey(key)}: </div>
                            <div className="value">{formatValue(key)}</div>
                          </div>
                      );
                  })
              }
           </div>
        );
    }

    render(){
        const DMSToDD = (d) => {
            if(!d || d.length !== 4) return null;
            const [degrees, minutes, seconds, direction] = d;
            var dd = degrees + minutes/60 + seconds/(60*60);
            return direction == "S" || direction == "W" ? -dd : dd;
        };

        const formatCameraHeadline = () => {
            if(!this.format('model') || !this.format('focal')){
                return (
                    <ReactCSSTransitionGroup transitionName="placeholder" transitionLeave={false} transitionEnter={true} transitionAppear={true} transitionEnterTimeout={500} transitionAppearTimeout={500}>
                      <span key={this.format('model')+this.format('model')}>-</span>
                    </ReactCSSTransitionGroup>
                );
            }
            return (
                <ReactCSSTransitionGroup transitionName="text" transitionLeave={false} transitionEnter={true} transitionAppear={true} transitionEnterTimeout={300} transitionAppearTimeout={300}>
                  <span key={this.format('model')}>
                    {this.format("model")} ({this.format("focal")})
                  </span>
                </ReactCSSTransitionGroup>
            );
        };
        const formatCameraDescription = () => {
            if(!this.format('shutter') || !this.format('aperture') || !this.format('focal')){
                return (
                    <ReactCSSTransitionGroup transitionName="placeholder" transitionLeave={false} transitionEnter={true} transitionAppear={true} transitionEnterTimeout={500} transitionAppearTimeout={500}>
                      <span key={this.format('shutter')+this.format('aperture')+this.format('focal')}>-</span>
                    </ReactCSSTransitionGroup>
                );
            }
            return (
                <ReactCSSTransitionGroup transitionName="text" transitionLeave={false} transitionEnter={true} transitionAppear={true} transitionEnterTimeout={300} transitionAppearTimeout={300}>
                  <span key={this.format('shutter')}>
                    {this.format("aperture")} {this.format("shutter")} {this.format("iso")}
                  </span>
                </ReactCSSTransitionGroup>
            );
        };

        const formatCalendarHeadline = () => {
            if(!this.formatDate()){
                return (
                    <ReactCSSTransitionGroup transitionName="placeholder" transitionLeave={false} transitionEnter={true} transitionAppear={true} transitionEnterTimeout={500} transitionAppearTimeout={500}>
                      <span key={this.formatDate()}>-</span>
                    </ReactCSSTransitionGroup>
                );
            }
            return (
                <ReactCSSTransitionGroup transitionName="text" transitionLeave={false} transitionEnter={true} transitionAppear={true} transitionEnterTimeout={300} transitionAppearTimeout={300}>
                  <span key={this.formatDate()}>
                    {this.formatDate()}
                  </span>
                </ReactCSSTransitionGroup>
            );
        };

        const formatCalendarDescription = () => {
            if(!this.formatTime()){
                return (
                    <ReactCSSTransitionGroup transitionName="placeholder" transitionLeave={false} transitionEnter={true} transitionAppear={true} transitionEnterTimeout={500} transitionAppearTimeout={500}>
                      <span key={this.formatTime()}>-</span>
                    </ReactCSSTransitionGroup>
                );
            }
            return (
                <ReactCSSTransitionGroup transitionName="text" transitionLeave={false} transitionEnter={true} transitionAppear={true} transitionEnterTimeout={300} transitionAppearTimeout={300}>
                  <span key={this.formatTime()}>
                    {this.formatTime()}
                  </span>
                </ReactCSSTransitionGroup>
            );
        };

        return (
            <div>
              <div className="content_box">
                <Icon name="schedule" />
                <div className="headline">{formatCalendarHeadline()}</div>
                <div className="description">{formatCalendarDescription()}</div>
              </div>

              <div className="content_box">
                <Icon name="camera" />
                <div className="headline">
                  { formatCameraHeadline() }
                </div>
                <div className="description">
                  { formatCameraDescription() }
                </div>
              </div>


              <NgIf cond={this.state.location !== null}>
                <ReactCSSTransitionGroup transitionName="image" transitionLeave={false} transitionEnter={true} transitionAppear={true} transitionEnterTimeout={300} transitionAppearTimeout={300}>
                  <div key={JSON.stringify(this.state.location)}>
                    <MapShot
                      lat={DMSToDD(this.state.location && this.state.location[0])}
                      lng={DMSToDD(this.state.location && this.state.location[1])} />
                  </div>
                </ReactCSSTransitionGroup>
              </NgIf>

              <NgIf cond={!!this.state.all} className="more">
                <ReactCSSTransitionGroup transitionName="image" transitionLeave={false} transitionEnter={true} transitionAppear={true} transitionEnterTimeout={300} transitionAppearTimeout={300}>
                  <div key={this.state.all === null}>
                    <Button onClick={() => this.setState({show_more: !this.state.show_more})} theme="primary">MORE</Button>
                  </div>
                </ReactCSSTransitionGroup>
              </NgIf>
              <ReactCSSTransitionGroup transitionName="image" transitionLeave={false} transitionEnter={true} transitionAppear={true} transitionEnterTimeout={300} transitionAppearTimeout={300}>
                <NgIf className="more_container" key={this.state.show_more} cond={!!this.state.show_more}>
                  { this.all_meta() }
                </NgIf>
              </ReactCSSTransitionGroup>
            </div>
        );
    }
}
