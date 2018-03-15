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
    return (
        <div className={props.className}>
          <ul>
            {props.children}
          </ul>
        </div>
    );
}
const Logout = (props) => {
    return (
        <li className="component_logout">
          <Link to="/logout">
            <Icon name="power"/>
          </Link>
        </li>
    );
}

const Saving = (props) => {
    if(props.needSaving){
        return (
            <NgIf className="component_saving" cond={props.needSaving === true && props.isLast === true}>
              *
            </NgIf>
        );
    }else{
        return null;
    }
}

const Separator = (props) => {
    return (
        <NgIf cond={props.isLast === false} className="component_separator">
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
            this.props.emit('file.select', this.props.path.full, 'directory');
        }
    }

    toggleHover(shouldHover){
        if(('ontouchstart' in window) === false){
            this.setState({hover: shouldHover});
        }
    }

    limitSize(str){
        if(str.length > 30){
            return str.substring(0,23)+'...';
        }
        return str;
    }

    render(){
        let className = "component_path-element-wrapper";
        if(this.state.hover){ className += " hover"; }
        if(this.props.highlight) { className += " highlight";}
        return (
            <li className={className} onClick={this.onClick.bind(this)} onMouseEnter={this.toggleHover.bind(this, true)} onMouseLeave={this.toggleHover.bind(this, false)}>
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
        let className = "component_path-element";
        if(this.props.isLast){
            className += " is-last";
        }
        return (
            <div className={className}>
              <PathElementWrapper highlight={highlight} {...this.props} />
            </div>
        );
    }
}
