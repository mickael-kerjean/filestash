import React from 'react';

import { Container, Card, NgIf, Input, Button, Textarea, Loader, Notification, Prompt } from '../../components/';
import { invalidate, encrypt, decrypt, gid } from '../../helpers/';
import { Session } from '../../model/';
import config from '../../../config_client';
import './form.scss';
import img_drive from '../../assets/img/google-drive.png';
import img_dropbox from '../../assets/img/dropbox.png';

export class Form extends React.Component {
    constructor(props){
        super(props);
        const protocols = Object.keys(config.connections);
        this.state = {
            refs: {},
            type: protocols.length > 2 ? protocols[1] : protocols[0] || null,
            advanced_ftp: false,
            advanced_sftp: false,
            advanced_webdav: false,
            advanced_s3: false,
            advanced_git: false,
            _dummy: true
        };
        this.rerender = this.rerender.bind(this);
    }

    componentDidMount(){
        this.publishState(config.connections);
        this.publishState(this.props.credentials);
        window.addEventListener('resize', this.rerender);
    }

    componentWillReceiveProps(props){
        if(JSON.stringify(props.credentials) !== JSON.stringify(this.props.credentials)){
            this.publishState(props.credentials);
        }
    }

    componentWillUnmount(){
        window.removeEventListener('resize', this.rerender);
    }

    publishState(_credentials){
        const pushDOM = (credentials) => {
            for(let key in credentials){
                let names = credentials[key];
                for(let name in names){
                    const ref_name = [key,name].join("_");
                    if(this.state.refs[ref_name] && typeof credentials[key][name] !== 'boolean'){
                        this.state.refs[ref_name].ref.value = credentials[key][name];
                    }
                }
            }
        };

        const setAdvancedCheckbox = (credentials) => {
            if(credentials['ftp'] && (credentials['ftp']['path'] || credentials['ftp']['port']) ){
                this.setState({advanced_ftp: true});
            }
            if(credentials['sftp'] && (
                credentials['sftp']['path'] || credentials['sftp']['port']
                    || credentials['sftp']['private_key'])
              ){
                this.setState({advanced_sftp: true});
            }
            if(credentials['webdav'] && credentials['webdav']['path']){
                this.setState({advanced_webdav: true});
            }
            if(credentials['s3'] && credentials['s3']['path']){
                this.setState({advanced_s3: true});
            }
            if(credentials['git'] && (
                credentials['git']['username'] || credentials['git']['commit']
                    || credentials['git']['branch']  || credentials['git']['passphrase']
                    || credentials['git']['author_name'] || credentials['git']['author_email']
                    || credentials['git']['committer_name'] || credentials['git']['committer_email'])
              ){
                this.setState({advanced_git: true});
            }
        };

        setAdvancedCheckbox(_credentials);
        window.setTimeout(() => pushDOM(_credentials));
        // we made this async as DOM needs to be all set before we can insert the new state
    }


    onSubmit(e){
        e.preventDefault();
        // update the credentials object with data coming from the dom (aka "ref" in react language)
        let credentials = Object.assign({}, this.props.credentials);
        for(let key in this.state.refs){
            if(this.state.refs[key]){
                let [type, ...name] = key.split('_');
                name = name.join("_");
                if(!credentials[type]) credentials[type] = {};
                credentials[type][name] = this.state.refs[key].ref.value;
            }
        }
        // create the object we need to authenticate a user against a backend
        const auth_data = Object.assign({type: this.state.type}, credentials[this.state.type]);
        this.props.onSubmit(auth_data, credentials);
    }

    redirect_dropbox(e){
        this.props.onThirdPartyLogin('dropbox');
    }

    redirect_google(e){
        this.props.onThirdPartyLogin('google');
    }

    onTypeChange(type){
        this.setState({type: type}, () => {
            this.publishState(config.connections);
            this.publishState(this.props.credentials);
        });
    }

    rerender(){
        this.setState({_dummy: !this.state._dummy});
    }

    _marginTop(){
        let size = 300;
        const $screen = document.querySelector('.login-form');
        if($screen) size = $screen.offsetHeight;

        size = Math.round((document.body.offsetHeight - size) / 2);
        if(size < 0) return 0;
        if(size > 150) return 150;
        return size;
    }

    should_appear(type, key){
        if(!config.connections[type]) return false;
        let value = config.connections[type][key];
        if(typeof value === 'string') return true;
        if(value === false) return false;
        return true;
    }
    input_type(type, key){
        if(!config.connections[type]) return 'hidden';
        let value = config.connections[type][key];
        if(typeof value === 'string') return 'hidden';
        else if(typeof value === 'number') return 'hidden';
        else if(value === false) return 'hidden';
        else if(key === 'password') return 'password';
        else if(key === 'secret_access_key') return 'password';
        else{
            return 'text';
        }
    }

    render() {
        let className = (window.innerWidth < 600) ? 'scroll-x' : '';
        return (
            <Card style={{marginTop: this._marginTop()+'px'}} className="no-select component_page_connection_form">
              <NgIf cond={ Object.keys(config.connections).length > 1 }>
                <div className={"buttons "+className}>
                  {
                      Object.keys(config.connections).map((type) => {
                          return (
                              <Button key={type} className={this.state.type === type? 'active primary' : ''} onClick={this.onTypeChange.bind(this, type)}>
                                {config.connections[type].label}
                              </Button>
                          );
                      })
                  }
                </div>
              </NgIf>
              <div>
                <form onSubmit={this.onSubmit.bind(this)} autoComplete="off" autoCapitalize="off" spellCheck="false" autoCorrect="off">
                  <NgIf cond={this.state.type === 'webdav'}>
                    <NgIf cond={this.should_appear('webdav', 'url')}>
                      <Input type={this.input_type('webdav', 'url')} name="url" placeholder="Address*" ref={(input) => { this.state.refs.webdav_url = input; }} autoComplete="new-password" />
                    </NgIf>
                    <NgIf cond={this.should_appear('webdav', 'username')}>
                      <Input type={this.input_type('webdav', 'username')} name="username" placeholder="Username" ref={(input) => { this.state.refs.webdav_username = input; }} autoComplete="new-password" />
                    </NgIf>
                    <NgIf cond={this.should_appear('webdav', 'password')}>
                      <Input type={this.input_type('webdav', 'password')} name="password" placeholder="Password" ref={(input) => { this.state.refs.webdav_password = input; }} autoComplete="new-password" />
                    </NgIf>
                    <NgIf cond={this.should_appear('webdav', 'advanced')}>
                      <label>
                        <input checked={this.state.advanced_webdav} onChange={e => { this.setState({advanced_webdav: e.target.checked}); }} type="checkbox" autoComplete="new-password"/> Advanced
                      </label>
                    </NgIf>
                    <NgIf cond={this.state.advanced_webdav === true} className="advanced_form">
                      <NgIf cond={this.should_appear('webdav', 'path')}>
                        <Input type={this.input_type('webdav', 'path')} name="path" placeholder="Path" ref={(input) => {this.state.refs.webdav_path = input; }} autoComplete="new-password" />
                     </NgIf>
                    </NgIf>
                    <Button theme="emphasis">CONNECT</Button>
                  </NgIf>
                  <NgIf cond={this.state.type === 'ftp'}>
                    <NgIf cond={this.should_appear('ftp', 'hostname')}>
                      <Input type={this.input_type('ftp', 'hostname')} name="hostname" placeholder="Hostname*" ref={(input) => {this.state.refs.ftp_hostname = input; }} autoComplete="new-password" />
                    </NgIf>
                    <NgIf cond={this.should_appear('ftp', 'username')}>
                      <Input type={this.input_type('ftp', 'username')} name="username" placeholder="Username" ref={(input) => {this.state.refs.ftp_username = input; }} autoComplete="new-password" />
                    </NgIf>
                    <NgIf cond={this.should_appear('ftp', 'password')}>
                      <Input type={this.input_type('ftp', 'password')} name="password" placeholder="Password" ref={(input) => {this.state.refs.ftp_password = input; }} autoComplete="new-password" />
                    </NgIf>
                    <NgIf cond={this.should_appear('ftp', 'advanced')}>
                      <label>
                        <input checked={this.state.advanced_ftp} onChange={e => { this.setState({advanced_ftp: e.target.checked}); }} type="checkbox" autoComplete="new-password"/> Advanced
                      </label>
                    </NgIf>
                    <NgIf cond={this.state.advanced_ftp === true} className="advanced_form">
                      <NgIf cond={this.should_appear('ftp', 'path')}>
                        <Input type={this.input_type('ftp', 'path')} name="path" placeholder="Path" ref={(input) => {this.state.refs.ftp_path = input; }} autoComplete="new-password" />
                      </NgIf>
                      <NgIf cond={this.should_appear('ftp', 'port')}>
                        <Input type={this.input_type('ftp', 'port')} name="port" placeholder="Port" ref={(input) => {this.state.refs.ftp_port = input; }} autoComplete="new-password" />
                      </NgIf>
                    </NgIf>
                    <Button type="submit" theme="emphasis">CONNECT</Button>
                  </NgIf>
                  <NgIf cond={this.state.type === 'sftp'}>
                    <NgIf cond={this.should_appear('sftp', 'host')}>
                      <Input type={this.input_type('sftp', 'host')} name="host" placeholder="Hostname*" ref={(input) => {this.state.refs.sftp_host = input; }} autoComplete="new-password" />
                    </NgIf>
                    <NgIf cond={this.should_appear('sftp', 'username')}>
                      <Input type={this.input_type('sftp', 'username')} name="username" placeholder="Username" ref={(input) => {this.state.refs.sftp_username = input; }} autoComplete="new-password" />
                    </NgIf>
                    <NgIf cond={this.should_appear('sftp', 'password')}>
                      <Input type={this.input_type('sftp', 'password')} name="password" placeholder="Password" ref={(input) => {this.state.refs.sftp_password = input; }} autoComplete="new-password" />
                    </NgIf>
                    <NgIf cond={this.should_appear('sftp', 'advanced')}>
                      <label>
                        <input checked={this.state.advanced_sftp} onChange={e => { this.setState({advanced_sftp: JSON.parse(e.target.checked)}); }} type="checkbox" autoComplete="new-password"/> Advanced
                      </label>
                    </NgIf>
                    <NgIf cond={this.state.advanced_sftp === true} className="advanced_form">
                      <NgIf cond={this.should_appear('sftp', 'path')}>
                        <Input type={this.input_type('sftp', 'path')} name="path" placeholder="Path" ref={(input) => {this.state.refs.sftp_path = input; }} autoComplete="new-password" />
                      </NgIf>
                      <NgIf cond={this.should_appear('sftp', 'port')}>
                        <Input type={this.input_type('sftp', 'port')} name="port" placeholder="Port" ref={(input) => {this.state.refs.sftp_port = input; }} autoComplete="new-password" />
                      </NgIf>
                      <NgIf cond={this.should_appear('sftp', 'private_key')}>
                        <Textarea type="text" style={this.input_type('sftp', 'private_key') === 'hidden' ? {visibility: 'hidden', position: 'absolute'} : {} } rows="1" name="private_key" placeholder="Private Key" ref={(input) => {this.state.refs.sftp_private_key = input; }} autoComplete="new-password" />
                      </NgIf>
                    </NgIf>
                    <Button type="submit" theme="emphasis">CONNECT</Button>
                  </NgIf>
                  <NgIf cond={this.state.type === 'git'}>
                    <NgIf cond={this.should_appear('git', 'repo')}>
                      <Input type={this.input_type('git', 'repo')} name="repo" placeholder="Repository*" ref={(input) => {this.state.refs.git_repo = input; }} autoComplete="new-password" />
                    </NgIf>
                    <NgIf cond={this.should_appear('git', 'username')}>
                      <Input type={this.input_type('git', 'username')} name="username" placeholder="Username" ref={(input) => {this.state.refs.git_username = input; }} autoComplete="new-password" />
                    </NgIf>
                    <NgIf cond={this.should_appear('git', 'password')}>
                      <Textarea type="text" style={this.input_type('git', 'password') === 'hidden' ? {visibility: 'hidden', position: 'absolute'} : {} } rows="1" name="password" placeholder="Password" ref={(input) => {this.state.refs.git_password = input; }} autoComplete="new-password" />
                    </NgIf>
                    <Input type="hidden" name="uid" value={gid()} ref={(input) => { this.state.refs.git_uid = input; }} />
                    <NgIf cond={this.should_appear('git', 'advanced')}>
                      <label>
                        <input checked={this.state.advanced_git} onChange={e => { this.setState({advanced_git: JSON.parse(e.target.checked)}); }} type="checkbox" autoComplete="new-password"/> Advanced
                      </label>
                    </NgIf>
                    <NgIf cond={this.state.advanced_git === true} className="advanced_form">
                      <NgIf cond={this.should_appear('git', 'passphrase')}>
                        <Input type={this.input_type('git', 'passphrase')} name="passphrase" placeholder="Passphrase" ref={(input) => {this.state.refs.git_passphrase = input; }} autoComplete="new-password" />
                      </NgIf>
                      <NgIf cond={this.should_appear('git', 'commit')}>
                        <Input type={this.input_type('git', 'commit')} name="commit" placeholder="Commit Format: default to '{action}({filename}): {path}'" ref={(input) => {this.state.refs.git_commit = input; }} autoComplete="new-password" />
                      </NgIf>
                      <NgIf cond={this.should_appear('git', 'branch')}>
                        <Input type={this.input_type('git', 'branch')} name="branch" placeholder="Branch: default to 'master'" ref={(input) => {this.state.refs.git_branch = input; }} autoComplete="new-password" />
                      </NgIf>
                      <NgIf cond={this.should_appear('git', 'author_email')}>
                        <Input type={this.input_type('git', 'author_email')} name="author_email" placeholder="Author email" ref={(input) => {this.state.refs.git_author_email = input; }} autoComplete="new-password" />
                      </NgIf>
                      <NgIf cond={this.should_appear('git', 'author_name')}>
                        <Input type={this.input_type('git', 'author_name')} name="author_name" placeholder="Author name" ref={(input) => {this.state.refs.git_author_name = input; }} autoComplete="new-password" />
                      </NgIf>
                      <NgIf cond={this.should_appear('git', 'committer_email')}>
                        <Input type={this.input_type('git', 'committer_email')} name="committer_email" placeholder="Committer email" ref={(input) => {this.state.refs.git_committer_email = input; }} autoComplete="new-password" />
                      </NgIf>
                      <NgIf cond={this.should_appear('git', 'committer_name')}>
                        <Input type={this.input_type('git', 'committer_name')} name="committer_name" placeholder="Committer name" ref={(input) => {this.state.refs.git_committer_name = input; }} autoComplete="new-password" />
                      </NgIf>
                    </NgIf>
                    <Button type="submit" theme="emphasis">CONNECT</Button>
                  </NgIf>
                  <NgIf cond={this.state.type === 's3'}>
                    <NgIf cond={this.should_appear('s3', 'access_key_id')}>
                      <Input type={this.input_type('s3', 'access_key_id')} name="access_key_id" placeholder="Access Key ID*" ref={(input) => {this.state.refs.s3_access_key_id = input; }} autoComplete="new-password" />
                    </NgIf>
                    <NgIf cond={this.should_appear('s3', 'secret_access_key')}>
                      <Input type={this.input_type('s3', 'secret_access_key')} name="secret_access_key" placeholder="Secret Access Key*" ref={(input) => {this.state.refs.s3_secret_access_key = input; }} autoComplete="new-password" />
                    </NgIf>
                    <NgIf cond={this.should_appear('s3', 'advanced')}>
                      <label>
                        <input checked={this.state.advanced_s3} onChange={e => { this.setState({advanced_s3: JSON.parse(e.target.checked)}); }} type="checkbox" autoComplete="new-password"/> Advanced
                      </label>
                    </NgIf>
                    <NgIf cond={this.state.advanced_s3 === true} className="advanced_form">
                      <NgIf cond={this.should_appear('s3', 'path')}>
                        <Input type={this.input_type('s3', 'path')} name="path" placeholder="Path" ref={(input) => {this.state.refs.s3_path = input; }} autoComplete="new-password" />
                      </NgIf>
                    </NgIf>
                    <Button type="submit" theme="emphasis">CONNECT</Button>
                  </NgIf>
                  <NgIf cond={this.state.type === 'dropbox'} className="third-party">
                    <a target="_blank" href={this.state.dropbox_url}>
                      <div onClick={this.redirect_dropbox.bind(this)}>
                        <img src={img_dropbox} />
                      </div>
                      <Button type="button" onClick={this.redirect_dropbox.bind(this)} theme="emphasis">LOGIN WITH DROPBOX</Button>
                    </a>
                  </NgIf>
                  <NgIf cond={this.state.type === 'gdrive'} className="third-party">
                    <div onClick={this.redirect_google.bind(this)}>
                      <img src={img_drive}/>
                    </div>
                    <Button type="button" onClick={this.redirect_google.bind(this)} theme="emphasis">LOGIN WITH GOOGLE</Button>
                  </NgIf>
                </form>
              </div>
            </Card>
        );
    }
}
