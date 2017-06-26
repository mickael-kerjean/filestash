import React from 'react';
import { Container, Card, NgIf, Input, Button, Textarea, Loader, Notification, encrypt, decrypt } from '../utilities';
import { Session, invalidate, password } from '../data';
import { Uploader } from '../utilities';

export class ConnectPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            type: 'webdav',
            loading: false,
            error: null,
            advanced_ftp: false, // state of checkbox in the UI
            advanced_sftp: false, // state of checkbox in the UI
            advanced_webdav: false,
            advanced_s3: false,
            advanced_git: false,
            credentials: {},
            password: password.get() || null,
            marginTop: this._marginTop()
        }

        // adapt from: https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
        function getParam(name) {
            const regex = new RegExp("[?&#]" + name.replace(/[\[\]]/g, "\\$&") + "(=([^&#]*)|&|#|$)");
            const results = regex.exec(window.location.href);
            if (!results) return null;
            if (!results[2]) return '';
            return decodeURIComponent(results[2].replace(/\+/g, " "));
        }

        // dropbox login
        if(getParam('state') === 'dropbox'){
            this.state.loading = true;
            this.authenticate({bearer: getParam('access_token'), type: 'dropbox'})
        }               
        // google drive login
        if(getParam('code')){
            this.state.loading = true;
            this.authenticate({code: getParam('code'), type: 'gdrive'})
        }
    }


    _marginTop(){
        let size = Math.round(Math.abs((document.body.offsetHeight - 300) / 2));
        return size > 150? 150 : size;
    }


    componentWillMount(){
        window.onresize = () => {
            this.setState({marginTop: this._marginTop()})
        }
        let raw = window.localStorage.getItem('store');

        if(!this.state.loading && raw){
            if(this.state.password === null){
                let key = prompt("Your password: ");
                if(key){
                    password.set(key);
                    let credentials = decrypt(raw, key);
                    this.setState({password: password, credentials: credentials}, setAdvanced.bind(this));
                }               
            }else{
                let credentials = decrypt(raw, this.state.password);
                this.setState({credentials: credentials}, setAdvanced.bind(this));
            }

            function setAdvanced(){
                if(this.state.credentials['ftp'] && (this.state.credentials['ftp']['path'] || this.state.credentials['ftp']['port']) ){
                    this.setState({advanced_ftp: true})
                }
                if(this.state.credentials['sftp'] && (this.state.credentials['sftp']['path'] || this.state.credentials['sftp']['port'] || this.state.credentials['sftp']['private_key'])){
                    this.setState({advanced_sftp: true})
                }
                if(this.state.credentials['webdav'] && this.state.credentials['webdav']['path']){
                    this.setState({advanced_webdav: true})
                }
                if(this.state.credentials['s3'] && this.state.credentials['s3']['path']){
                    this.setState({advanced_s3: true})
                }
                if(this.state.credentials['git'] && (this.state.credentials['git']['username'] || this.state.credentials['git']['commit'] || this.state.credentials['git']['branch']  || this.state.credentials['git']['passphrase'] || this.state.credentials['git']['author_name'] || this.state.credentials['git']['author_email'] || this.state.credentials['git']['committer_name'] || this.state.credentials['git']['committer_email'])){
                    this.setState({advanced_git: true})
                }
            }
        }
    }

    getDefault(type, key){
        if(this.state.credentials[type]){
            return this.state.credentials[type][key]
        }else{
            return null;
        }
    }
    onRememberMe(e){
        let value = e.target.checked;
        if(value === true){
            let key = prompt("password that will serve to encrypt your credentials:");
            password.set(key);
            this.setState({password: key});
        }else if(value === false){
            window.localStorage.clear();
            password.set();
            this.setState({credentials: {}, password: null});
        }
    }

    onChange(type){
        this.setState({type: type});
    }

    login_dropbox(e){
        e.preventDefault();
        this.setState({loading: true});
        Session.url('dropbox').then((url) => {
            window.location.href = url;
        }).catch((err) => {
            if(err && err.code === 'CANCELLED'){ return }
            this.setState({loading: false, error: err});
            window.setTimeout(() => {
                this.setState({error: null})
            }, 1000);
        });
    }

    login_google(e){        
        e.preventDefault();
        this.setState({loading: true});
        Session.url('gdrive').then((url) => {
            window.location.href = url;
        }).catch((err) => {
            if(err && err.code === 'CANCELLED'){ return }
            this.setState({loading: false, error: err});
            window.setTimeout(() => {
                this.setState({error: null})
            }, 1000);
        })
    }

    authenticate(params){
        if(password.get()){
            this.state.credentials[params['type']] = params;
            window.localStorage.setItem('store', encrypt(this.state.credentials, password.get()));
        }
        
        Session.authenticate(params)
            .then((ok) => {                
                this.setState({loading: false});
                invalidate();
                const path = params.path && /^\//.test(params.path)? /\/$/.test(params.path) ? params.path : params.path+'/' :  '/';
                this.props.history.push('/files'+path);
            })
            .catch(err => {                
                if(err && err.code === 'CANCELLED'){ return }
                this.setState({loading: false, error: err});
                window.setTimeout(() => {
                    this.setState({error: null})
                }, 1000);
            });        
    }

    onSubmit(e){
        e.preventDefault();
        this.setState({loading: true});

        // yes it's dirty but at least it's supported nearly everywhere and build won't push Megabytes or polyfill
        // to support the entries method of formData which would have made things much cleaner
        const serialize = function($form){
            if(!$form) return {};
            var obj = {};
            var elements = $form.querySelectorAll( "input, select, textarea" );
            for( var i = 0; i < elements.length; ++i ) {
                var element = elements[i];
                var name = element.name;
                var value = element.value;                
                if(name){
                    obj[name] = value;
                }
            }
            return obj;
        }
        const data = serialize(document.querySelector('form'));        
        this.authenticate(data);
    }
    
    render() {
        let labelStyle = {color: 'rgba(0,0,0,0.4)', fontStyle: 'italic', fontSize: '0.9em'}
        let style = {
            top: {minWidth: '80px', borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: '8px 5px'}
        }
        return (
            <div style={{background: '#f89e6b'}}>
            <ForkMe repo="https://github.com/mickael-kerjean/nuage" />  
            <Container maxWidth="565px">
              <NgIf cond={this.state.loading === true}>
                <Loader/>
              </NgIf>
              <NgIf cond={this.state.loading === false}>
                <Card style={{marginTop: this.state.marginTop+'px', whiteSpace: '', borderRadius: '3px', boxShadow: 'none'}}>
                  <div style={{display: 'flex', margin: '-10px -11px 20px', padding: '0px 0px 6px 0'}} className={window.innerWidth < 600 ? 'scroll-x' : ''}>
                    <Button theme={this.state.type === 'webdav'? 'primary' : null} style={{...style.top, borderBottomLeftRadius: 0}} onClick={this.onChange.bind(this, 'webdav')}>WebDav</Button>
                    <Button theme={this.state.type === 'ftp'? 'primary' : null} style={style.top} onClick={this.onChange.bind(this, 'ftp')}>FTP</Button>
                    <Button theme={this.state.type === 'sftp'? 'primary' : null} style={style.top} onClick={this.onChange.bind(this, 'sftp')}>SFTP</Button>
                    <Button theme={this.state.type === 'git'? 'primary' : null} style={{...style.top, borderBottomRightRadius: 0}} onClick={this.onChange.bind(this, 'git')}>Git</Button>
                    <Button theme={this.state.type === 's3'? 'primary' : null} style={style.top} onClick={this.onChange.bind(this, 's3')}>S3</Button>
                    <Button theme={this.state.type === 'dropbox'? 'primary' : null} style={style.top} onClick={this.onChange.bind(this, 'dropbox')}>Dropbox</Button>
                    <Button theme={this.state.type === 'gdrive'? 'primary' : null} style={{...style.top, borderBottomRightRadius: 0}} onClick={this.onChange.bind(this, 'gdrive')}>Drive</Button>
                  </div>
                  <div>
                    <form onSubmit={this.onSubmit.bind(this)} autoComplete="off" autoCapitalize="off" spellCheck="false" autoCorrect="off">
                      <NgIf cond={this.state.type === 'webdav'}>
                        <Input type="text" name="url" placeholder="Address*" defaultValue={this.getDefault('webdav', 'url')} autoComplete="off" />
                        <Input type="text" name="username" placeholder="Username" defaultValue={this.getDefault('webdav', 'username')} autoComplete="off" />
                        <Input type="password" name="password" placeholder="Password" defaultValue={this.getDefault('webdav', 'password')} autoComplete="off" />
                        <label style={labelStyle}>
                          <input checked={this.state.advanced_webdav} onChange={e => { this.setState({advanced_webdav: e.target.checked})}} type="checkbox" autoComplete="off"/> Advanced
                        </label>
                        <NgIf cond={this.state.advanced_webdav === true} style={{marginTop: '2px'}}>
                          <Input type="text" name="path" placeholder="Path" defaultValue={this.getDefault('webdav', 'path')} autoComplete="off" />
                        </NgIf>
                        <Input type="hidden" name="type" value="webdav"/>
                        <Button style={{marginTop: '15px', color: 'white'}} theme="emphasis">CONNECT</Button>
                      </NgIf>
                      <NgIf cond={this.state.type === 'ftp'}>
                        <Input type="text" name="hostname" placeholder="Hostname*" defaultValue={this.getDefault('ftp', 'hostname')} autoComplete="off" />
                        <Input type="text" name="username" placeholder="Username" defaultValue={this.getDefault('ftp', 'username')} autoComplete="off" />                        
                        <Input type="password" name="password" placeholder="Password" defaultValue={this.getDefault('ftp', 'password')} autoComplete="off" />
                        <Input type="hidden" name="type" value="ftp"/>
                        <label style={labelStyle}>
                          <input checked={this.state.advanced_ftp} onChange={e => { this.setState({advanced_ftp: e.target.checked})}} type="checkbox" autoComplete="off"/> Advanced
                        </label>
                        <NgIf cond={this.state.advanced_ftp === true} style={{marginTop: '2px'}}>
                          <Input type="text" name="path" placeholder="Path" defaultValue={this.getDefault('ftp', 'path')} autoComplete="off" />
                          <Input type="text" name="port" placeholder="Port" defaultValue={this.getDefault('ftp', 'port')} autoComplete="off" />
                        </NgIf>
                        <Button style={{marginTop: '15px', color: 'white'}} theme="emphasis">CONNECT</Button>
                      </NgIf>
                      <NgIf cond={this.state.type === 'sftp'}>
                        <Input type="text" name="host" placeholder="Hostname*" defaultValue={this.getDefault('sftp', 'host')} autoComplete="off" />
                        <Input type="text" name="username" placeholder="Username" defaultValue={this.getDefault('sftp', 'username')} autoComplete="off" />
                        <Input type="password" name="password" placeholder="Password" defaultValue={this.getDefault('sftp', 'password')} autoComplete="off" />
                        <Input type="hidden" name="type" value="sftp"/>
                        <label style={labelStyle}>
                          <input checked={this.state.advanced_sftp} onChange={e => { this.setState({advanced_sftp: JSON.parse(e.target.checked)})}} type="checkbox" autoComplete="off"/> Advanced
                        </label>
                        <NgIf cond={this.state.advanced_sftp === true} style={{marginTop: '2px'}}>
                          <Input type="text" name="path" placeholder="Path" defaultValue={this.getDefault('sftp', 'path')} autoComplete="off" />
                          <Input type="text" name="port" placeholder="Port" defaultValue={this.getDefault('sftp', 'port')} autoComplete="off" />
                          <Textarea type="text" name="private_key" placeholder="Private Key" defaultValue={this.getDefault('sftp', 'private_key')} autoComplete="off" />
                        </NgIf>
                        <Button style={{marginTop: '15px', color: 'white'}} theme="emphasis">CONNECT</Button>
                      </NgIf>
                      <NgIf cond={this.state.type === 'git'}>
                        <Input type="text" name="repo" placeholder="Repository*" defaultValue={this.getDefault('git', 'repo')} autoComplete="off" />
                        <Textarea type="password" name="password" placeholder="Password" defaultValue={this.getDefault('git', 'password')} autoComplete="off" />
                        <Input type="hidden" name="type" value="git"/>
                        <label style={labelStyle}>
                          <input checked={this.state.advanced_git} onChange={e => { this.setState({advanced_git: JSON.parse(e.target.checked)})}} type="checkbox" autoComplete="off"/> Advanced
                        </label>
                        <NgIf cond={this.state.advanced_git === true} style={{marginTop: '2px'}}>
                          <Input type="text" name="username" placeholder="Username" defaultValue={this.getDefault('git', 'username')} autoComplete="off" />
                          <Input type="text" name="passphrase" placeholder="Passphrase" defaultValue={this.getDefault('git', 'passphrase')} autoComplete="off" />
                          <Input type="text" name="commit" placeholder="Commit Format: default to '{action}({filename}): {path}'" defaultValue={this.getDefault('git', 'format')} autoComplete="off" />
                          <Input type="text" name="branch" placeholder="Branch: default to 'master'" defaultValue={this.getDefault('git', 'branch')} autoComplete="off" />
                          <Input type="text" name="author_email" placeholder="Author email" defaultValue={this.getDefault('git', 'author_email')} autoComplete="off" />
                          <Input type="text" name="author_name" placeholder="Author name" defaultValue={this.getDefault('git', 'author_name')} autoComplete="off" />
                          <Input type="text" name="committer_email" placeholder="Committer email" defaultValue={this.getDefault('git', 'committer_email')} autoComplete="off" />
                          <Input type="text" name="committer_name" placeholder="Committer name" defaultValue={this.getDefault('git', 'committer_name')} autoComplete="off" />
                        </NgIf>
                        <Button style={{marginTop: '15px', color: 'white'}} theme="emphasis">CONNECT</Button>
                      </NgIf>
                      <NgIf cond={this.state.type === 's3'}>
                        <Input type="text" name="access_key_id" placeholder="Access Key ID*" defaultValue={this.getDefault('s3', 'access_key_id')} autoComplete="off" />
                        <Input type="password" name="secret_access_key" placeholder="Secret Access Key*" defaultValue={this.getDefault('s3', 'secret_access_key')} autoComplete="off" />
                        <Input type="hidden" name="type" value="s3"/>
                        <label style={labelStyle}>
                          <input checked={this.state.advanced_s3} onChange={e => { this.setState({advanced_s3: JSON.parse(e.target.checked)})}} type="checkbox" autoComplete="off"/> Advanced
                        </label>
                        <NgIf cond={this.state.advanced_s3 === true} style={{marginTop: '2px'}}>
                          <Input type="text" name="path" placeholder="Path" defaultValue={this.getDefault('s3', 'path')} autoComplete="off" />
                        </NgIf>
                        <Button style={{marginTop: '15px', color: 'white'}} theme="emphasis">CONNECT</Button>
                      </NgIf>
                      <NgIf cond={this.state.type === 'dropbox'}>
                        <a target="_blank" href={this.state.dropbox_url}>
                          <div style={{textAlign: 'center'}} onClick={this.login_dropbox.bind(this)}>
                            <img src="/img/dropbox.png" style={{height: '115px', margin: '10px 0'}}/>
                          </div>
                          <Input type="hidden" name="type" value="dropbox"/>
                          <Button onClick={this.login_dropbox.bind(this)} style={{color: 'white'}} theme="emphasis">LOGIN WITH DROPBOX</Button>
                        </a>
                      </NgIf>
                      <NgIf cond={this.state.type === 'gdrive'}>
                        <div style={{textAlign: 'center'}} onClick={this.login_google.bind(this)}>
                          <img src="/img/google-drive.png" style={{height: '115px', margin: '10px 0'}}/>
                          </div>
                        <Input type="hidden" name="type" value="gdrive"/>
                        <Button onClick={this.login_google.bind(this)} style={{color: 'white'}} theme="emphasis">LOGIN WITH GOOGLE</Button>
                      </NgIf>
                    </form>
                  </div>
                </Card>
                <label style={{ ...labelStyle, display: 'inline-block', width: '100%', textAlign: 'right'}}>
                <input checked={this.state.password !== null} onChange={this.onRememberMe.bind(this)} type="checkbox"/> Remember me
                </label>
              </NgIf>
              <Notification error={this.state.error && this.state.error.message} />
            </Container>
            </div>
        );
    }
}


const ForkMe = (props) => {
    return (
        <a href={props.repo} target="_blank">
          <img style={{position: 'absolute', top: 0, right: 0, border: 0}} src="https://camo.githubusercontent.com/52760788cde945287fbb584134c4cbc2bc36f904/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f77686974655f6666666666662e706e67" alt="Fork me on GitHub" data-canonical-src="https://s3.amazonaws.com/github/ribbons/forkme_right_white_ffffff.png" />
        </a>
    );
}
