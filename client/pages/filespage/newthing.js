import React from 'react';
import PropTypes from 'prop-types';
import { EventEmitter } from '../../data';
import { Card, NgIf, Icon, pathBuilder } from '../../utilities';


@EventEmitter
export class NewThing extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            name: null,
            type: null,
            message: null,
            icon: null
        }
    }

    onNew(type){
        this.setState({type: type, name: '', icon: type})
    }

    onDelete(){
        this.setState({type: null, name: null, icon: null})
    }

    onSave(e){
        e.preventDefault();
        if(this.state.name !== null){
            this.setState({icon: 'loading'})
            this.props.emit('file.create', pathBuilder(this.props.path, this.state.name, this.state.type), this.state.type)
                .then((ok) => this.props.emit('file.refresh', this.props.path))
                .then((ok) => {
                    this.onDelete();
                    return Promise.resolve('ok');
                })
                .catch(err => {
                    if(err && err.code === 'CANCELLED'){ return }
                    this.setState({message: err.message, icon: 'error'})
                })
        }
    }

    onSortUpdate(e){
        this.props.onSortUpdate(e.target.value);
    }

    render(){
        return (
            <div>
              <div style={{fontSize: '15px', lineHeight: '15px', height: '15px', marginTop: '5px', color: 'rgba(0,0,0,0.4)', margin: '0 0 10px 0'}}>
                <NgIf cond={this.props.accessRight.can_create_file === true} onClick={this.onNew.bind(this, 'file')} style={{marginRight: '15px', cursor: 'pointer', display: 'inline'}}>New File</NgIf>
                <NgIf cond={this.props.accessRight.can_create_directory === true} onClick={this.onNew.bind(this, 'directory')} style={{cursor: 'pointer', display: 'inline'}}>New Directory</NgIf>
                <select value={this.props.sort} onChange={this.onSortUpdate.bind(this)} style={{float: 'right', color: 'rgba(0,0,0,0.4)', background: 'none', borderRadius: '5px', outline: 'none', border: '1px solid rgba(0,0,0,0.4)', fontSize: '12px'}}>
                  <option value="type">Sort By Type</option>
                  <option value="date">Sort By Date</option>
                  <option value="name">Sort By Name</option>
                </select>
              </div>
              <NgIf cond={this.state.type !== null}>
                <Card>
                  <Icon style={{width: '25px', height: '25px'}} name={this.state.icon} />
                  <form onSubmit={this.onSave.bind(this)} style={{display: 'inline'}}>
                    <input onChange={(e) => this.setState({name: e.target.value})} value={this.state.name} style={{outline: 'none'}} type="text" autoFocus/>
                  </form>
                  <NgIf cond={this.state.message !== null} style={{color: 'rgba(0,0,0,0.4)', fontSize: '0.9em', paddingLeft: '10px', display: 'inline'}}>
                    {this.state.message}
                  </NgIf>
                  <div style={{float: 'right', height: '22px'}}>
                    <Icon style={{width: '25px', height: '25px'}} name="delete" onClick={this.onDelete.bind(this)} />
                  </div>
                </Card>
              </NgIf>
            </div>
        )
    };
}

NewThing.PropTypes = {
    accessRight: PropTypes.obj,
    onCreate: PropTypes.func.isRequired,
    onSortUpdate: PropTypes.func.isRequired,
    sort: PropTypes.string.isRequired,
}
