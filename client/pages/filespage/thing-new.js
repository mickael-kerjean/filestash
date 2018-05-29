import React from 'react';
import PropTypes from 'prop-types';

import { Card, NgIf, Icon, EventEmitter, Dropdown, DropdownButton, DropdownList, DropdownItem } from '../../components/';
import { pathBuilder } from '../../helpers/';
import "./thing.scss";

@EventEmitter
export class NewThing extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            name: null,
            type: null,
            message: null,
            icon: null
        };

        this._onEscapeKeyPress = (e) => {
            if(e.keyCode === 27) this.onDelete();
        };
    }

    componentDidMount(){
        window.addEventListener('keydown', this._onEscapeKeyPress);
    }
    componentWillUnmount(){
        window.removeEventListener('keydown', this._onEscapeKeyPress);
    }

    onNew(type){
        if(this.state.type === type){
            this.onDelete();
        }else{
            this.setState({type: type, name: '', icon: type});
        }
    }

    onDelete(){
        this.setState({type: null, name: null, icon: null});
    }

    onSave(e){
        e.preventDefault();
        if(this.state.name !== null){
            this.props.emit('file.create', pathBuilder(this.props.path, this.state.name, this.state.type), this.state.type);
            this.onDelete();
        }
    }

    onViewChange(e){
        this.props.onViewUpdate();
    }

    onSortChange(e){
        this.props.onSortUpdate(e);
    }

    render(){
        return (
            <div>
              <div className="menubar no-select">
                <NgIf cond={this.props.accessRight.can_create_file === true} onClick={this.onNew.bind(this, 'file')} type="inline">New File</NgIf>
                <NgIf cond={this.props.accessRight.can_create_directory === true} onClick={this.onNew.bind(this, 'directory')} type="inline">New Directory</NgIf>
                <Dropdown className="view sort" onChange={this.onSortChange.bind(this)}>
                  <DropdownButton>
                    <Icon name="sort"/>
                  </DropdownButton>
                  <DropdownList>
                    <DropdownItem name="type" icon={this.props.sort === "type" ? "check" : null}> Sort By Type </DropdownItem>
                    <DropdownItem name="date" icon={this.props.sort === "date" ? "check" : null}> Sort By Date </DropdownItem>
                    <DropdownItem name="name" icon={this.props.sort === "name" ? "check" : null}> Sort By Name </DropdownItem>
                  </DropdownList>
                </Dropdown>
                <div className="view list-grid" onClick={this.onViewChange.bind(this)}><Icon name={this.props.view === "grid" ? "list" : "grid"}/></div>
              </div>
              <NgIf cond={this.state.type !== null} className="component_thing">
                <Card className="mouse-is-hover highlight">
                  <Icon className="component_updater--icon" name={this.state.icon} />
                  <span className="file-details">
                    <form onSubmit={this.onSave.bind(this)}>
                      <input onChange={(e) => this.setState({name: e.target.value})} value={this.state.name} type="text" autoFocus/>
                    </form>
                  </span>
                  <NgIf className="component_message" cond={this.state.message !== null}>
                    {this.state.message}
                  </NgIf>
                  <span className="component_action">
                    <div className="action">
                      <div>
                        <Icon className="component_updater--icon" name="delete" onClick={this.onDelete.bind(this)} />
                      </div>
                    </div>
                  </span>
                </Card>
              </NgIf>
            </div>
        );
    };
}

NewThing.PropTypes = {
    accessRight: PropTypes.obj,
    onCreate: PropTypes.func.isRequired,
    onSortUpdate: PropTypes.func.isRequired,
    sort: PropTypes.string.isRequired
};
