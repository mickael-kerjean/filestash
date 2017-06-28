import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom'
import { theme, to_rgba } from '../utilities/theme';
import { NgIf, Icon } from '../utilities/';
import { EventEmitter, EventReceiver } from '../data';

export class BreadCrumb extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            path: this._formatPath(props.path)
        };
    }    

    componentWillReceiveProps(props){
        this.setState({path: this._formatPath(props.path)});
    }

    _formatPath(full_path){
        let paths = full_path.split("/");
        if(paths.slice(-1)[0] === ''){
            paths.pop();
        }
        paths = paths.map((path, index) => {
            let sub_path = paths.slice(0, index+1).join('/'),
                label = path === ''? 'Nuage' : path;
            if(index === paths.length - 1){
                return {full: null, label: label};
            }else{
                return {full: sub_path+'/', label: label}
            }
        });
        return paths;
    }
    
    render(Element) {
        const Path = Element? Element : PathElement;
        return (
            <div>
              <BreadCrumbContainer className={this.props.className}>
                <Logout />
                {
                    this.state.path.map((path, index) => {
                        return (
                            <span key={index}>
                              <Path path={path} isLast={this.state.path.length === index + 1} needSaving={this.props.needSaving} />
                              <Separator isLast={this.state.path.length === index + 1} />
                            </span>
                        )
                    })
                }
              </BreadCrumbContainer>
            </div>
        );
    }
}

BreadCrumb.propTypes = {
    path: PropTypes.string.isRequired,
    needSaving: PropTypes.bool
}


const BreadCrumbContainer = (props) => {
    let style1 = {background: 'white', margin: '0 0 0px 0', padding: '6px 0', boxShadow: '0 4px 5px 0 rgba(0,0,0,0.14), 0 1px 10px 0 rgba(0,0,0,0.12), 0 2px 4px -1px rgba(0,0,0,0.2)', zIndex: '1000', position: 'relative'};
    let style2 = {margin: '0 auto', width: '95%', maxWidth: '800px', padding: '0'};
    return (
        <div className={props.className} style={style1}>
          <ul style={style2}>
            {props.children}
          </ul>
        </div>
    );
}
const Logout = (props) => {
    let style = {
        float: 'right',
        fontSize: '17px',
        display: 'inline-block',
        padding: '6px 0px 6px 6px',
        margin: '0 0px'
    }
    return (
        <li style={style}>
          <Link to="/logout">
            <Icon style={{height: '20px'}} name="power"/>
          </Link>
        </li>
    );
}

const Saving = (props) => {
    let style = {
        display: 'inline',
        padding: '0 3px'
    };

    if(props.needSaving){
        return (
            <NgIf style={style} cond={props.needSaving === true && props.isLast === true}>
              *
            </NgIf>
        );
    }else{
        return null;
    }
}

const Separator = (props) => {
    return (
        <NgIf cond={props.isLast === false} style={{display: 'inline', fontFamily: 'monospace', color: '#aaaaaa'}}>
          >
        </NgIf>
    );
}


@EventEmitter
export class PathElementWrapper extends React.Component {
    constructor(props){
        super(props);
    }

    onClick(){
        if(this.props.isLast === false){
            this.props.emit('file.select', this.props.path.full, 'directory')
        }
    }

    render(){
        let style = {
            cursor: 'pointer',
            fontSize: '17px',
            display: 'inline-block',
            padding: '5px 3px',
            margin: '0 4px',
            fontWeight: this.props.isLast ? '100': ''
        };
        if(this.props.highlight === true){
            style.background = to_rgba(theme.colors.primary, 0.5);
            style.border = '2px solid '+theme.colors.primary;
            style.borderRadius = '2px';
            style.padding = '3px 20px';
        }
        return (
            <li onClick={this.onClick.bind(this)} style={style}>
              {this.props.path.label}
              <Saving isLast={this.props.isLast} needSaving={this.props.needSaving} isSaving={false} />
            </li>
        );
    }
}


// just a hack to make it play nicely with react-dnd as it refuses to use our custom component if it's not wrap by something it knows ...
export class PathElement extends PathElementWrapper {
    constructor(props){
        super(props);
    }

    render(highlight = false){
        return (
            <div style={{display: 'inline-block'}}>
              <PathElementWrapper highlight={highlight} {...this.props} />
            </div>
        )
    }
}
