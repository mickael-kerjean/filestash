import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { URL_FILES } from "../helpers/";
import { NgIf, Icon, EventEmitter } from "./";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";

import "./breadcrumb.scss";

export class BreadCrumb extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            path: this._formatPath(props.path),
        };
    }

    UNSAFE_componentWillReceiveProps(props) {
        this.setState({ path: this._formatPath(props.path) });
    }

    _formatPath(full_path) {
        let paths = full_path.split("/");
        if (paths.slice(-1)[0] === "") {
            paths.pop();
        }
        paths = paths.map((path, index) => {
            const sub_path = paths.slice(0, index+1).join("/");
            const label = path === "" ? (CONFIG.name || "Filestash") : path;
            if (index === paths.length - 1) {
                return { full: null, label: label };
            } else {
                return {
                    full: sub_path + "/",
                    label: label,
                    minify: function() {
                        if (index === 0) {
                            return false;
                        }
                        if (paths.length <= (document.body.clientWidth > 800 ? 5 : 4)) {
                            return false;
                        }
                        if (index > paths.length - (document.body.clientWidth > 1000? 4 : 3)) {
                            return false;
                        }
                        return true;
                    }(),
                };
            }
        });
        return paths;
    }

    render(Element) {
        if (new window.URL(location.href).searchParams.get("nav") === "false") return null;

        const Path = Element? Element : PathElement;
        return (
            <div className="component_breadcrumb" role="navigation">
                <BreadCrumbContainer className={this.props.className + " no-select"}>
                    <Logout />
                    <ReactCSSTransitionGroup transitionName="breadcrumb" transitionLeave={true}
                        transitionEnter={true} transitionLeaveTimeout={150}
                        transitionEnterTimeout={200} transitionAppear={false}>
                        {
                            this.state.path.map((path, index) => {
                                return (
                                    <Path key={"breadcrumb_"+index}
                                        className={"n" + index}
                                        baseURL={index === 0 ? URL_FILES : this.props.baseURL || URL_FILES}
                                        currentSelection={this.props.currentSelection} path={path}
                                        isLast={this.state.path.length === index + 1}
                                        needSaving={this.props.needSaving} />
                                );
                            })
                        }
                    </ReactCSSTransitionGroup>
                </BreadCrumbContainer>
            </div>
        );
    }
};

BreadCrumb.propTypes = {
    path: PropTypes.string.isRequired,
    needSaving: PropTypes.bool,
};

const BreadCrumbContainer = (props) => {
    return (
        <div className={props.className}>
            <div className="ul">
                { props.children }
            </div>
        </div>
    );
};

const Logout = (props) => {
    const isRunningFromAnIframe = window.self !== window.top;
    return (
        <div className="li component_logout">
            {
                isRunningFromAnIframe ? null : (
                    <Link to="/logout">
                        <Icon name="power"/>
                    </Link>
                )
            }
        </div>
    );
};

const Saving = (props) => {
    return (
        <ReactCSSTransitionGroup transitionName="saving_indicator"
            transitionLeave={true} transitionEnter={true} transitionAppear={true}
            transitionLeaveTimeout={200} transitionEnterTimeout={500}
            transitionAppearTimeout={500}>
            <NgIf key={props.needSaving} className="component_saving"
                cond={props.needSaving === true}>
                *
            </NgIf>
        </ReactCSSTransitionGroup>
    );
};

const Separator = (props) => {
    /* eslint-disable-next-line max-len */
    const src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAARCAYAAAA7bUf6AAAA30lEQVQ4T63T7Q2CMBAG4OuVPdQNcAPdBCYwDdclCAQ3ACfRDXQDZQMHgNRcAoYApfWjv0jIPX3b3gn4wxJjI03TUAhRBkGwV0o9ffaYIEVRrJumuQHA3ReaILxzl+bCkNZ660ozi/QQIl4BoCKieAmyIlyU53lkjCld0CIyhIwxSmt9nEvkRLgoyzIuPggh4iRJqjHkhXTQAwBWUsqNUoq/38sL+TlJf7lf38ngdU5EFNme2adPFgGGrR2LiGcAqIko/LhjeXbatuVOraWUO58hnJ1iRKx8AetxXPHH/1+y62USursaSgAAAABJRU5ErkJggg==";
    return (
        <div className="component_separator">
            <img alt="path_separator" width="16" height="16" src={src} />
        </div>
    );
};

class PathElementWrapperComponent extends React.Component {
    constructor(props) {
        super(props);
    }

    limitSize(str, is_highlight = false) {
        if (is_highlight === true) {
            if (str.length > 30) {
                return str.substring(0, 12).trim() + "..." +
                    str.substring(str.length - 10, str.length).trim();
            }
        } else {
            if (str.length > 27) {
                return str.substring(0, 20).trim() + "...";
            }
        }
        return str;
    }

    render() {
        let className = "component_path-element-wrapper";
        if (this.props.highlight) {
            className += " highlight";
        }

        let href = this.props.baseURL + (this.props.path.full || "");
        href = href
            .replace(/\%/g, "%2525") // Hack to get the Link Component to work
            // See ExistingThing in 'thing-existing.js'
            .replace(/#/g, "%23")
            .replace(/\?/g, "%3F");
        href = href || "/";
        href += location.search;

        return (
            <div className={"li "+className}>
                <NgIf cond={this.props.isLast === false}>
                    <Link to={href} className="label">
                        <NgIf cond={this.props.path.minify !== true}>
                            { this.limitSize(this.props.path.label) }
                        </NgIf>
                        <NgIf cond={this.props.path.minify === true}>
                            ...
                            <span className="title">
                                { this.limitSize(this.props.path.label, true) }
                            </span>
                        </NgIf>
                    </Link>
                    <Separator/>
                </NgIf>
                <NgIf cond={this.props.isLast === true} className="label">
                    <div>{this.limitSize(this.props.path.label)}</div>
                    <Saving needSaving={this.props.needSaving} />
                </NgIf>
            </div>
        );
    }
}
export const PathElementWrapper = EventEmitter(PathElementWrapperComponent);


// just a hack to make it play nicely with react-dnd as it refuses to use our
// custom component if it's not wrap by something it knows ...
export class PathElement extends PathElementWrapper {
    constructor(props) {
        super(props);
    }

    render(highlight = false) {
        let className = "component_path-element";
        if (this.props.isFirst) className += ` is-first`;
        if (this.props.className) className += ` ${this.props.className}`;

        return (
            <div className={className}>
                <PathElementWrapper highlight={highlight} {...this.props} />
            </div>
        );
    }
}
