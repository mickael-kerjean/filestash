import React from 'react';
import { debounce } from '../helpers/';
import { Icon, Loader, NgIf } from './';
import { t } from '../locales/';
import './mapshot.scss';

export class MapShot extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            tile_size: 0,
            tile_loaded: 0,
            error: false
        };
        this.onRefresh = this.onRefresh.bind(this);
    }

    onRefresh(){
        requestAnimationFrame(() => {
            if(this.refs.$wrapper){
                this.setState({
                    tile_size: this.calculateSize()
                });
            }
        });
    }

    calculateSize(){
        if(!this.refs.$wrapper) return 0;
        return parseInt(this.refs.$wrapper.clientWidth / 3 * 100) / 100;
    }


    componentDidMount(){
        this.onRefresh();
        window.addEventListener("resize", this.onRefresh);
    }

    componentWillUnmount(){
        window.removeEventListener("resize", this.onRefresh);
    }

    insert_marker(position){
        if(!(this.state.tile_size > 0)) return null;
        return (
            <div className="marker" style={{
                 left: this.state.tile_size * (1 + position[0]) - 15,
                 top: this.state.tile_size * (1 + position[1]) - 30 }}>
              <Icon name="location"/>
            </div>
        );
    }

    onLoad(){
        this.setState({tile_loaded: this.state.tile_loaded + 1});
    }
    onError(){
        this.setState({error: true});
    }

    render(){
        if(this.calculateSize() !== this.state.tile_size && this.calculateSize() !== 0){
            this.onRefresh();
        }
        const tile_server = this.props.tile || "https://maps.wikimedia.org/osm-intl/${z}/${x}/${y}.png";
        function map_url(lat, lng, zoom){
            // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenamse
            const n = Math.pow(2, zoom);
            const tile_numbers = [
                (lng+180)/360*n,
                (1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2*n,
                zoom
            ];
            return {
                tile: function(tile_server, x = 0, y = 0){
                    return tile_server
                        .replace("${x}", Math.floor(tile_numbers[0])+x)
                        .replace("${y}", Math.floor(tile_numbers[1])+y)
                        .replace("${z}", Math.floor(zoom));
                },
                position: function(){
                    return [
                        tile_numbers[0] - Math.floor(tile_numbers[0]),
                        tile_numbers[1] - Math.floor(tile_numbers[1]),
                    ];
                }
            };
        }
        const mapper = map_url(this.props.lat, this.props.lng, 11);
        const center= (position, i) => {
            return parseInt(this.state.tile_size * (1 + position[i]) * 1000)/1000;
        };
        return (
            <div ref="$wrapper" className={"component_mapshot"+(this.state.tile_loaded === 9 ? " loaded" : "")+(this.state.error === true ? " error": "")} style={{height: (this.state.tile_size*3)+"px"}}>
              <div className="wrapper">
                <div className="mapshot_placeholder error">
                  <span><div>t("ERROR")</div></span>
                </div>
                <div className="mapshot_placeholder loading">
                  <Loader/>
                </div>
                <a href={"https://www.google.com/maps/search/?api=1&query="+this.props.lat+","+this.props.lng}>
                  {this.insert_marker(mapper.position())}
                  <div className="bigpicture" style={{transformOrigin: center(mapper.position(), 0)+"px "+center(mapper.position(), 1)+"px"}}>
                    <div className="line">
                      <img onLoad={this.onLoad.bind(this)} onError={this.onError.bind(this)} src={mapper.tile(tile_server, -1, -1)} ref="$tile" style={{height: this.state.tile_size+"px"}} className="btl"/>
                      <img onLoad={this.onLoad.bind(this)} onError={this.onError.bind(this)} src={mapper.tile(tile_server,  0, -1)} style={{height: this.state.tile_size+"px"}}/>
                      <img onLoad={this.onLoad.bind(this)} onError={this.onError.bind(this)} src={mapper.tile(tile_server,  1, -1)} style={{height: this.state.tile_size+"px"}} className="btr"/>
                    </div>
                    <div className="line">
                      <img onLoad={this.onLoad.bind(this)} onError={this.onError.bind(this)} src={mapper.tile(tile_server, -1, 0)} style={{height: this.state.tile_size+"px"}}/>
                      <img onLoad={this.onLoad.bind(this)} onError={this.onError.bind(this)} src={mapper.tile(tile_server,  0, 0)} style={{height: this.state.tile_size+"px"}}/>
                      <img onLoad={this.onLoad.bind(this)} onError={this.onError.bind(this)} src={mapper.tile(tile_server,  1, 0)} style={{height: this.state.tile_size+"px"}}/>
                    </div>
                    <div className="line">
                      <img onLoad={this.onLoad.bind(this)} onError={this.onError.bind(this)} src={mapper.tile(tile_server, -1, 1)} style={{height: this.state.tile_size+"px"}} className="bbl"/>
                      <img onLoad={this.onLoad.bind(this)} onError={this.onError.bind(this)} src={mapper.tile(tile_server,  0, 1)} style={{height: this.state.tile_size+"px"}}/>
                      <img onLoad={this.onLoad.bind(this)} onError={this.onError.bind(this)} src={mapper.tile(tile_server,  1, 1)} style={{height: this.state.tile_size+"px"}} className="bbr"/>
                    </div>
                  </div>
                </a>
              </div>
            </div>
        );
    }
}
