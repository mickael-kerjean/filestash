import React from 'react';
import EXIF from 'exif-js';
import path from 'path';

import { MenuBar } from './menubar';
import { Icon, NgIf } from '../../components/';
import { alert } from '../../helpers/';
import './imageviewer.scss';

export class ImageViewer extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            info: null
        };
    }

    openInfo(){
        alert.now(<Metadata el={this.refs.$img}/>);
    }

    render(){
        const image_url = (size) => {
            return this.props.data+"&meta=true&size="+parseInt((window.innerWidth - 40)*size);
        };
        const isJpeg = (filename) => {
            const ext = path.extname(filename).toLowerCase().substring(1);
            return ext === "jpg" || ext === "jpeg";
        };
        return (
            <div style={{height: '100%'}}>
              <MenuBar title={this.props.filename} download={this.props.data}>
                <NgIf type="inline" cond={isJpeg(this.props.filename)}>
                  <Icon name="info" onClick={this.openInfo.bind(this)} />
                </NgIf>
              </MenuBar>
              <div style={{textAlign: 'center', background: '#525659', height: 'calc(100% - 34px)', overflow: 'hidden', padding: '20px', boxSizing: 'border-box'}}>
                <img
                  ref="$img"
                  src={image_url(1)}
                  srcSet={image_url(1)+", "+image_url(3/2)+" 1.5x, "+image_url(2)+" 2x"}
                  style={{maxHeight: '100%', maxWidth: '100%', minHeight: '100px', background: '#f1f1f1', boxShadow: 'rgba(0, 0, 0, 0.14) 0px 4px 5px 0px, rgba(0, 0, 0, 0.12) 0px 1px 10px 0px, rgba(0, 0, 0, 0.2) 0px 2px 4px -1px'}} />
              </div>
            </div>
        );
    }
}


class Metadata extends React.Component {
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
        EXIF.getData(this.props.el, function(){
            const metadata = EXIF.getAllTags(this);
            window.metadata = metadata;
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
                iso: metadata['ISOSpeedRatings']
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
