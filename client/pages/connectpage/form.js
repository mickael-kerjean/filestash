import React from 'react';
import { Container, Card, NgIf, Input, Button, Textarea, Loader, Notification, encrypt, decrypt, theme, Prompt } from '../../utilities';
import { Session, invalidate, password } from '../../data';

import './form.scss';
import img_drive from '../../assets/google-drive.png';
import img_dropbox from '../../assets/dropbox.png';

export class Form extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            refs: {},
            type: 'sftp',
            advanced_ftp: false,
            advanced_sftp: false,
            advanced_webdav: false,
            advanced_s3: false,
            advanced_git: false,
            dummy: true
        };
    }

    componentDidMount(){
        this.publishState(this.props.credentials);
        window.addEventListener('resize', this.rerender.bind(this));
    }

    componentWillReceiveProps(props){
        if(JSON.stringify(props.credentials) !== JSON.stringify(this.props.credentials)){
            this.publishState(props.credentials);
        }
    }

    componentWillUnmount(){
        window.removeEventListener('resize', this.rerender.bind(this));
    }

    publishState(_credentials){
        const pushDOM = (credentials) => {
            for(let key in credentials){
                let names = credentials[key];
                for(let name in names){
                    const ref_name = [key,name].join("_");
                    if(this.state.refs[ref_name]){
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
                let [type, name] = key.split('_');
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
        this.setState({type: type}, () => this.publishState(this.props.credentials));
    }

    rerender(){
        this.setState({dummy: !this.state.dummy});
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

    render() {
        let className = (window.innerWidth < 600) ? 'scroll-x' : '';
        return (
            <Card style={{marginTop: this._marginTop()+'px'}} className="no-select component_page_connection_form">
              <div className={"buttons "+className}>
                <Button className={this.state.type === 'webdav'? 'active primary' : ''} onClick={this.onTypeChange.bind(this, 'webdav')} style={{borderBottomLeftRadius: 0}}>WebDav</Button>
                <Button className={this.state.type === 'ftp'? 'active primary' : ''} onClick={this.onTypeChange.bind(this, 'ftp')}>FTP</Button>
                <Button className={this.state.type === 'sftp'? 'active primary' : ''} onClick={this.onTypeChange.bind(this, 'sftp')}>SFTP</Button>
                <Button className={this.state.type === 'git'? 'active primary' : ''} onClick={this.onTypeChange.bind(this, 'git')}>Git</Button>
                <Button className={this.state.type === 's3'? 'active primary' : ''} onClick={this.onTypeChange.bind(this, 's3')}>S3</Button>
                <Button className={this.state.type === 'dropbox'? 'active primary' : ''} onClick={this.onTypeChange.bind(this, 'dropbox')}>Dropbox</Button>
                <Button className={this.state.type === 'gdrive'? 'active primary' : ''} onClick={this.onTypeChange.bind(this, 'gdrive')} style={{borderBottomRightRadius: 0}}>Drive</Button>
              </div>
              <div>
                <form onSubmit={this.onSubmit.bind(this)} autoComplete="off" autoCapitalize="off" spellCheck="false" autoCorrect="off">
                  <NgIf cond={this.state.type === 'webdav'}>
                    <Input type="text" name="url" placeholder="Address*" ref={(input) => { this.state.refs.webdav_url = input; }} autoComplete="new-password" />
                    <Input type="text" name="username" placeholder="Username" ref={(input) => { this.state.refs.webdav_username = input; }} autoComplete="new-password" />
                    <Input type="password" name="password" placeholder="Password" ref={(input) => { this.state.refs.webdav_password = input; }} autoComplete="new-password" />
                    <label>
                      <input checked={this.state.advanced_webdav} onChange={e => { this.setState({advanced_webdav: e.target.checked}); }} type="checkbox" autoComplete="new-password"/> Advanced
                        </label>
                        <NgIf cond={this.state.advanced_webdav === true} className="advanced_form">
                          <Input type="text" name="path" placeholder="Path" ref={(input) => {this.state.refs.webdav_path = input; }} autoComplete="new-password" />
                        </NgIf>
                        <Input type="hidden" name="type" value="webdav"/>
                        <Button theme="emphasis">CONNECT</Button>
                      </NgIf>
                      <NgIf cond={this.state.type === 'ftp'}>
                        <Input type="text" name="hostname" placeholder="Hostname*" ref={(input) => {this.state.refs.ftp_hostname = input; }} autoComplete="new-password" />
                        <Input type="text" name="username" placeholder="Username" ref={(input) => {this.state.refs.ftp_username = input; }} autoComplete="new-password" />
                        <Input type="password" name="password" placeholder="Password" ref={(input) => {this.state.refs.ftp_password = input; }} autoComplete="new-password" />
                        <Input type="hidden" name="type" value="ftp"/>
                        <label>
                          <input checked={this.state.advanced_ftp} onChange={e => { this.setState({advanced_ftp: e.target.checked}); }} type="checkbox" autoComplete="new-password"/> Advanced
                        </label>
                        <NgIf cond={this.state.advanced_ftp === true} className="advanced_form">
                          <Input type="text" name="path" placeholder="Path" ref={(input) => {this.state.refs.ftp_path = input; }} autoComplete="new-password" />
                          <Input type="text" name="port" placeholder="Port" ref={(input) => {this.state.refs.ftp_port = input; }} autoComplete="new-password" />
                        </NgIf>
                        <Button type="submit" theme="emphasis">CONNECT</Button>
                      </NgIf>
                      <NgIf cond={this.state.type === 'sftp'}>
                        <Input type="text" name="host" placeholder="Hostname*" ref={(input) => {this.state.refs.sftp_host = input; }} autoComplete="new-password" />
                        <Input type="text" name="username" placeholder="Username" ref={(input) => {this.state.refs.sftp_username = input; }} autoComplete="new-password" />
                        <Input type="password" name="password" placeholder="Password" ref={(input) => {this.state.refs.sftp_password = input; }} autoComplete="new-password" />
                        <Input type="hidden" name="type" value="sftp"/>
                        <label>
                          <input checked={this.state.advanced_sftp} onChange={e => { this.setState({advanced_sftp: JSON.parse(e.target.checked)}); }} type="checkbox" autoComplete="new-password"/> Advanced
                        </label>
                        <NgIf cond={this.state.advanced_sftp === true} className="advanced_form">
                          <Input type="text" name="path" placeholder="Path" ref={(input) => {this.state.refs.sftp_path = input; }} autoComplete="new-password" />
                          <Input type="text" name="port" placeholder="Port" ref={(input) => {this.state.refs.sftp_port = input; }} autoComplete="new-password" />
                          <Textarea type="text" rows="1" name="private_key" placeholder="Private Key" ref={(input) => {this.state.refs.sftp_private_key = input; }} autoComplete="new-password" />
                        </NgIf>
                        <Button type="submit" theme="emphasis">CONNECT</Button>
                      </NgIf>
                      <NgIf cond={this.state.type === 'git'}>
                        <Input type="text" name="repo" placeholder="Repository*" ref={(input) => {this.state.refs.git_repo = input; }} autoComplete="new-password" />
                        <Textarea type="password" rows="1" name="password" placeholder="Password" ref={(input) => {this.state.refs.git_password = input; }} autoComplete="new-password" />
                        <Input type="hidden" name="type" value="git"/>
                        <label>
                          <input checked={this.state.advanced_git} onChange={e => { this.setState({advanced_git: JSON.parse(e.target.checked)}); }} type="checkbox" autoComplete="new-password"/> Advanced
                        </label>
                        <NgIf cond={this.state.advanced_git === true} className="advanced_form">
                          <Input type="text" name="username" placeholder="Username" ref={(input) => {this.state.refs.git_username = input; }} autoComplete="new-password" />
                          <Input type="text" name="passphrase" placeholder="Passphrase" ref={(input) => {this.state.refs.git_passphrase = input; }} autoComplete="new-password" />
                          <Input type="text" name="commit" placeholder="Commit Format: default to '{action}({filename}): {path}'" ref={(input) => {this.state.refs.git_commit = input; }} autoComplete="new-password" />
                          <Input type="text" name="branch" placeholder="Branch: default to 'master'" ref={(input) => {this.state.refs.git_branch = input; }} autoComplete="new-password" />
                          <Input type="text" name="author_email" placeholder="Author email" ref={(input) => {this.state.refs.git_author_email = input; }} autoComplete="new-password" />
                          <Input type="text" name="author_name" placeholder="Author name" ref={(input) => {this.state.refs.git_author_name = input; }} autoComplete="new-password" />
                          <Input type="text" name="committer_email" placeholder="Committer email" ref={(input) => {this.state.refs.git_committer_email = input; }} autoComplete="new-password" />
                          <Input type="text" name="committer_name" placeholder="Committer name" ref={(input) => {this.state.refs.git_committer_name = input; }} autoComplete="new-password" />
                        </NgIf>
                        <Button type="submit" theme="emphasis">CONNECT</Button>
                      </NgIf>
                      <NgIf cond={this.state.type === 's3'}>
                        <Input type="text" name="access_key_id" placeholder="Access Key ID*" ref={(input) => {this.state.refs.s3_access_key_id = input; }} autoComplete="new-password" />
                        <Input type="password" name="secret_access_key" placeholder="Secret Access Key*" ref={(input) => {this.state.refs.s3_secret_access_key = input; }} autoComplete="new-password" />
                        <Input type="hidden" name="type" value="s3"/>
                        <label>
                          <input checked={this.state.advanced_s3} onChange={e => { this.setState({advanced_s3: JSON.parse(e.target.checked)}); }} type="checkbox" autoComplete="new-password"/> Advanced
                        </label>
                        <NgIf cond={this.state.advanced_s3 === true} className="advanced_form">
                          <Input type="text" name="path" placeholder="Path" ref={(input) => {this.state.refs.s3_path = input; }} autoComplete="new-password" />
                        </NgIf>
                        <Button type="submit" theme="emphasis">CONNECT</Button>
                      </NgIf>
                      <NgIf cond={this.state.type === 'dropbox'} className="third-party">
                        <a target="_blank" href={this.state.dropbox_url}>
                          <div onClick={this.redirect_dropbox.bind(this)}>
                            <img src={img_dropbox} />
                          </div>
                          <Input type="hidden" name="type" value="dropbox"/>
                          <Button type="button" onClick={this.redirect_dropbox.bind(this)} theme="emphasis">LOGIN WITH DROPBOX</Button>
                        </a>
                      </NgIf>
                      <NgIf cond={this.state.type === 'gdrive'} className="third-party">
                        <div onClick={this.redirect_google.bind(this)}>
                          <img src={img_drive}/>
                        </div>
                        <Input type="hidden" name="type" value="gdrive"/>
                        <Button type="button" onClick={this.redirect_google.bind(this)} theme="emphasis">LOGIN WITH GOOGLE</Button>
                      </NgIf>
                    </form>
                  </div>
               </Card>
        );
    }
}
