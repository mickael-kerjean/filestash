import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { NgIf, Icon, EventEmitter, EventReceiver } from './';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import './breadcrumb.scss';

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
                return {full: sub_path+'/', label: label};
            }
        });
        return paths;
    }

    render(Element) {
        const Path = Element? Element : PathElement;
        return (
            <div className="component_breadcrumb">
              <BreadCrumbContainer className={this.props.className+' no-select'}>
                <Logout />
                <ReactCSSTransitionGroup transitionName="breadcrumb" transitionLeave={true} transitionEnter={true} transitionLeaveTimeout={500} transitionEnterTimeout={500} transitionAppear={false}>
                  {
                      this.state.path.map((path, index) => {
                          return (
                              <span key={"breadcrumb_"+index}>
                                <Path path={path} isLast={this.state.path.length === index + 1} needSaving={this.props.needSaving} />
                                <Separator isLast={this.state.path.length === index + 1} />
                              </span>
                          );
                      })
                 }
               </ReactCSSTransitionGroup>
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
    let style2 = {margin: '0 auto', width: '95%', maxWidth: '800px', padding: '0', color: 'rgba(#6f6f6f, 0.8)'};
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
        display: 'inline-block',
        padding: '5px 0px 5px 5px',
        margin: '0 0px'
    };
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
        <NgIf cond={props.isLast === false} style={{position: 'relative', top: '3px', display: 'inline'}}>
          <img width="16" height="16" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAARCAYAAAA7bUf6AAAA30lEQVQ4T63T7Q2CMBAG4OuVPdQNcAPdBCYwDdclCAQ3ACfRDXQDZQMHgNRcAoYApfWjv0jIPX3b3gn4wxJjI03TUAhRBkGwV0o9ffaYIEVRrJumuQHA3ReaILxzl+bCkNZ660ozi/QQIl4BoCKieAmyIlyU53lkjCld0CIyhIwxSmt9nEvkRLgoyzIuPggh4iRJqjHkhXTQAwBWUsqNUoq/38sL+TlJf7lf38ngdU5EFNme2adPFgGGrR2LiGcAqIko/LhjeXbatuVOraWUO58hnJ1iRKx8AetxXPHH/1+y62USursaSgAAAABJRU5ErkJggg=="/>
        </NgIf>
    );
}


@EventEmitter
export class PathElementWrapper extends React.Component {
    constructor(props){
        super(props);
        this.state = {hover: false};
    }

    onClick(){
        if(this.props.isLast === false){
            this.props.emit('file.select', this.props.path.full, 'directory')
        }
    }

    toggleHover(shouldHover){
        if(('ontouchstart' in window) === false){
            this.setState({hover: shouldHover})
        }
    }

    limitSize(str){
        if(str.length > 30){
            return str.substring(0,23)+'...'
        }
        return str;
    }

    render(){
        let style = {
            cursor: this.props.isLast ? '' : 'pointer',
            background: this.state.hover && this.props.isLast !== true? '#f5f5f5' : 'inherit',
            borderRadius: '1px',
            fontSize: '18px',
            display: 'inline-block',
            padding: '4px 5px',
            fontWeight: this.props.isLast ? '100': ''
        };
        if(this.props.highlight === true){
            style.background = '#c5e2f1';
            style.border = '2px solid #9AD1ED';
            style.borderRadius = '2px';
            style.padding = '2px 20px';
        }
        return (
            <li onClick={this.onClick.bind(this)} style={style} onMouseEnter={this.toggleHover.bind(this, true)} onMouseLeave={this.toggleHover.bind(this, false)}>
              {this.limitSize(this.props.path.label)}
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
            <div style={{display: 'inline-block', color: this.props.isLast? '#6f6f6f' : 'inherit'}}>
              <PathElementWrapper highlight={highlight} {...this.props} />
            </div>
        );
    }
}
