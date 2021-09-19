import React from 'react';
import PropTypes from 'prop-types';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { Card, NgIf, Icon, EventEmitter, Dropdown, DropdownButton, DropdownList, DropdownItem, Container } from '../../components/';
import { pathBuilder, debounce, prompt } from '../../helpers/';
import { t } from '../../locales/';
import "./submenu.scss";

@EventEmitter
export class Submenu extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            search_input_visible: false,
            search_keyword: ""
        };

        this.onSearchChange_Backpressure = debounce(this.onSearchChange, 400);
        this._onKeyPress = (e) => {
            if(e.keyCode === 27){ // escape key
                this.setState({
                    search_keyword: "",
                    search_input_visible: false
                });
                if(this.refs.$input) this.refs.$input.blur();
                this.props.onSearch(null);
            }else if(e.ctrlKey && e.keyCode === 70){ // 'Ctrl F' shortcut to search
                e.preventDefault();
                this.setState({
                    search_input_visible: true
                });
                if(this.refs.$input) this.refs.$input.focus();
            }else if(e.altKey && (e.keyCode === 49 || e.keyCode === 50)){ // 'alt 1' 'alt 2' shortcut
                e.preventDefault();
                this.onViewChange();
            }
        };
    }

    componentDidMount(){
        window.addEventListener("keydown", this._onKeyPress);
    }
    componentWillUnmount(){
        window.removeEventListener("keydown", this._onKeyPress);
    }

    onNew(type){
        this.props.emit("new::"+type);
    }
    onDelete(arrayOfPaths){
        prompt.now(
            t("Confirm by typing") + " \"remove\"",
            (answer) => {
                if(answer !== "remove"){
                    return Promise.resolve();
                }
                this.props.emit("file.delete.multiple", arrayOfPaths);
                return Promise.resolve();
            },
            () => { /* click on cancel */ }
        );
    }
    onDownload(arrayOfPaths){
        this.props.emit("file.download.multiple", arrayOfPaths);
    }

    onViewChange(){
        requestAnimationFrame(() => this.props.onViewUpdate());
    }

    onSortChange(e){
        this.props.onSortUpdate(e);
    }

    onSearchChange(search, e){
        this.props.onSearch(search.trim());
    }

    onSearchToggle(){
        if(new Date () - this.search_last_toggle < 200){
            // avoid bluring event cancelling out the toogle
            return;
        }
        this.refs.$input.focus();
        this.setState({search_input_visible: !this.state.search_input_visible}, () => {
            if(this.state.search_input_visible == false){
                this.props.onSearch(null);
                this.setState({search_keyword: ""});
            }
        });
    }

    closeIfEmpty(){
        if(this.state.search_keyword.trim().length > 0) return;
        this.search_last_toggle = new Date();
        this.setState({
            search_input_visible: false,
            search_keyword: ""
        });
        this.props.onSearch(null);
    }

    onSearchKeypress(s, backpressure = true, e){
        if(backpressure){
            this.onSearchChange_Backpressure(s);
        }else{
            this.onSearchChange(s);
        }
        this.setState({search_keyword: s});

        if(e && e.preventDefault){
            e.preventDefault();
        }
    }

    render(){
        return (
            <div className="component_submenu">
              <Container>
                <div className={"menubar no-select "+(this.state.search_input_visible ? "search_focus" : "")}>
                  <NgIf cond={this.props.accessRight.can_create_file !== false && this.props.selected.length === 0} onClick={this.onNew.bind(this, 'file')} type="inline">
                    { window.innerWidth < 410 && t("New File").length > 10 ? t("New File", null, "NEW_FILE::SHORT") : t("New File") }
                  </NgIf>
                  <NgIf cond={this.props.accessRight.can_create_directory !== false && this.props.selected.length === 0} onClick={this.onNew.bind(this, 'directory')} type="inline">
                    { window.innerWidth < 410 && t("New Directory").length > 10 ? t("New Directory", null, "NEW_DIRECTORY::SHORT") : t("New Directory") }
                  </NgIf>
                  <NgIf cond={this.props.selected.length > 0} type="inline" onMouseDown={this.onDownload.bind(this, this.props.selected)}>
                    <ReactCSSTransitionGroup transitionName="submenuwithSelection" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={10000}>
                      <span>{ t("Download") }</span>
                    </ReactCSSTransitionGroup>
                  </NgIf>
                  <NgIf cond={this.props.selected.length > 0 && this.props.accessRight.can_delete !== false} type="inline" onMouseDown={this.onDelete.bind(this, this.props.selected)}>
                    <ReactCSSTransitionGroup transitionName="submenuwithSelection" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={10000}>
                      <span>{ t("Remove") }</span>
                    </ReactCSSTransitionGroup>
                  </NgIf>

                  <Dropdown className="view sort" onChange={this.onSortChange.bind(this)}>
                    <DropdownButton>
                      <Icon name="sort"/>
                    </DropdownButton>
                    <DropdownList>
                      <DropdownItem name="type" icon={this.props.sort === "type" ? "check" : null}> { t("Sort By Type") } </DropdownItem>
                      <DropdownItem name="date" icon={this.props.sort === "date" ? "check" : null}> { t("Sort By Date") } </DropdownItem>
                      <DropdownItem name="name" icon={this.props.sort === "name" ? "check" : null}> { t("Sort By Name") } </DropdownItem>
                    </DropdownList>
                  </Dropdown>
                  <div className="view list-grid" onClick={this.onViewChange.bind(this)}><Icon name={this.props.view === "grid" ? "list" : "grid"}/></div>
                  <div className="view">
                    <form onSubmit={(e) => this.onSearchKeypress(this.state.search_keyword, false, e)}>
                      <label className="view search" onClick={this.onSearchToggle.bind(this, null)}>
                        <NgIf cond={this.state.search_input_visible !== true}>
                          <Icon name="search_dark"/>
                        </NgIf>
                        <NgIf cond={this.state.search_input_visible === true}>
                          <Icon name="close_dark"/>
                        </NgIf>
                      </label>
                      <NgIf cond={this.state.search_input_visible !== null} type="inline">
                        <input ref="$input" onBlur={this.closeIfEmpty.bind(this, false)} style={{"width": this.state.search_input_visible ? "180px" : "0px"}} value={this.state.search_keyword} onChange={(e) => this.onSearchKeypress(e.target.value, true)} type="text" id="search" placeholder={ t("search") } name="search" autoComplete="off" />
                        <label htmlFor="search" className="hidden">{ t("search") }</label>
                      </NgIf>
                    </form>
                  </div>
                </div>
              </Container>
            </div>
        );
    };
}

Submenu.propTypes = {
    accessRight: PropTypes.object,
    onSortUpdate: PropTypes.func.isRequired,
    sort: PropTypes.string.isRequired
};
