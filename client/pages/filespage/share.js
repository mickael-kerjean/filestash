import React from 'react';
import PropTypes from 'prop-types';

import { NgIf, Icon } from '../../components/';
import { Share } from '../../model/';
import { randomString, notify } from '../../helpers/';
import './share.scss';

export class ShareComponent extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            show_advanced: false,
            role: null,
            id: randomString(7),
            existings: [
                {id: "dflkjse", role: "UPLOADER", path: "./test/test"},
                {id: "dflkjse", role: "VIEWER", path: "./test/test", password: "xxxx"},
                {id: "dflkjse", role: "EDITOR", path: "./test/test"},
                {id: "dflkjse", role: "VIEWER", path: "./test/test", password: "xxxx"},
                {id: "dflkjse", role: "EDITOR", path: "./test/test"},
                {id: "dflkjse", role: "UPLOADER", path: "./test/test"},
            ]
        };
    }

    updateState(key, value){
        if(this.state[key] === value){
            this.setState({[key]: null});
        }else{
            this.setState({[key]: value});
        }

        if(key === "role" && value && window.innerHeight < 500){
            window.dispatchEvent(new Event('resize'));
        }
    }

    registerLink(e){
        e.target.setSelectionRange(0, e.target.value.length);
        let st = Object.assign({}, this.state);
        delete st.existings;
        delete st.show_advanced;
        this.setState({existing: [st].concat(this.state.existings)});
        return Share.upsert(st)
            .catch((err) => {
                notify.send(err, "error");
                this.setState({
                    existings: this.state.existings.slice(0, this.state.existings.length)
                });
            });
    }

    onLoad(link){
        let st = Object.assign({}, link);
        st.show_advanced = false;
        st.link_id = st.id;
        st.role = (st.role || "").toLowerCase();
        this.setState(st);
    }

    onDelete(link_id){
        return Share.remove(link_id)
            .then(() => {
                console.log("HERE");
            })
            .catch((err) => notify.send(err, "error"));
    }

    render(){
        return (
            <div className="component_share">
              <h2>Create a New Link</h2>

              <div className="share--content link-type no-select">
                <div onClick={this.updateState.bind(this, 'role', 'uploader')} className={this.state.role === "uploader" ? "active" : ""}>
                  Uploader
                </div>
                <div onClick={this.updateState.bind(this, 'role', 'viewer')} className={this.state.role === "viewer" ? "active" : ""}>
                  Viewer
                </div>
                <div onClick={this.updateState.bind(this, 'role', 'editor')} className={this.state.role === "editor" ? "active" : ""}>
                  Editor
                </div>
              </div>

              <NgIf cond={this.state.role === null && !!this.state.existings && this.state.existings.length > 0}>
                <h2>Existing Links</h2>
                <div className="share--content existing-links" style={{"maxHeight": this.state.existings && this.state.existings.length > 5 ? '90px' : 'inherit'}}>
                  {
                      this.state.existings && this.state.existings.map((link, i) => {
                          return (
                              <div className="link-details" key={i}>
                                <span className="role">{link.role}</span>
                                <span>{link.path}</span>
                                <Icon onClick={this.onDelete.bind(this, link.id)} name="delete"/>
                                <Icon onClick={this.onLoad.bind(this, link)} name="edit"/>
                              </div>
                          );
                      })
                  }
                </div>
              </NgIf>

              <NgIf cond={this.state.role !== null}>
                <h2>Restrictions</h2>
                <div className="share--content advanced-settings no-select">
                  <SuperCheckbox value={this.state.users} label="Only for users" placeholder="list of users who can access the link" onChange={this.updateState.bind(this, 'users')} inputType="text"/>
                  <SuperCheckbox value={this.state.password} label="Password" placeholder="protect access with a password" onChange={this.updateState.bind(this, 'password')} inputType="password"/>
                </div>

                <h2 className="no-select pointer" onClick={this.updateState.bind(this, 'show_advanced', !this.state.show_advanced)}>
                  Advanced
                  <NgIf type="inline" cond={!!this.state.show_advanced}><Icon name="arrow_top"/></NgIf>
                  <NgIf type="inline" cond={!this.state.show_advanced}><Icon name="arrow_bottom"/></NgIf>
                </h2>
                <div className="share--content advanced-settings no-select">
                  <NgIf cond={this.state.show_advanced === true}>
                    <SuperCheckbox value={this.state.can_manage_own} label="Can Manage Own" onChange={this.updateState.bind(this, 'can_manage_own')}/>
                    <SuperCheckbox value={this.state.can_share} label="Can Share" onChange={this.updateState.bind(this, 'can_share')}/>
                    <SuperCheckbox value={this.state.expiration} label="Expiration" placeholder="The link won't be valid after" onChange={this.updateState.bind(this, 'expiration')} inputType="date"/>
                    <SuperCheckbox value={this.state.url} label="Custom Link url" placeholder="beautiful_url" onChange={this.updateState.bind(this, 'url')} inputType="text"/>
                  </NgIf>
                </div>

                <div className="shared-link">
                  <input onClick={this.registerLink.bind(this)} type="text" value={window.location.origin+"/s/"+(this.state.url || this.state.id)} onChange={() => {}}/>
                </div>
              </NgIf>
            </div>
        );
    }
}

const SuperCheckbox = (props) => {
    const onCheckboxTick = (e) => {
        return props.onChange(e.target.checked ? "" : null);
    };
    const onValueChange = (e) => {
        props.onChange(e.target.value);
    };

    const _is_expended = function(val){
        return val === null || val === undefined ? false : true;
    }(props.value);
    return (
        <div className="component_supercheckbox">
          <label>
            <input type="checkbox" checked={_is_expended} onChange={onCheckboxTick}/>
            {props.label}
          </label>
          <NgIf cond={_is_expended && props.inputType !== undefined}>
            <input type={props.inputType} placeholder={props.placeholder} value={props.value || ""} onChange={onValueChange}/>
          </NgIf>
        </div>
    );
};
SuperCheckbox.PropTypes = {
    label: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    inputType: PropTypes.string,
    placeholder: PropTypes.string,
    value: PropTypes.string
};
