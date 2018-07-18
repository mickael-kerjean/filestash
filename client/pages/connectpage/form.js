import React from "react";
import { Container, Card, NgIf, Input, Button, Textarea, Loader, Notification, Prompt } from "../../components/";
import { invalidate, encrypt, decrypt, gid, settings_get, settings_put } from "../../helpers/";
import { Session } from "../../model/";
import "./form.scss";
import img_drive from "../../assets/img/google-drive.png";
import img_dropbox from "../../assets/img/dropbox.png";

export class Form extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            select: CONFIG["connections"].length > 2 ? 2 : 0,
            backends: JSON.parse(JSON.stringify(CONFIG["connections"])),
            dummy: null
        };

        const select = settings_get("login_tab");
        if(select !== null){ this.state.select = select; }
        this.rerender = this.rerender.bind(this);
    }

    componentDidMount(){
        window.addEventListener("resize", this.rerender);
        this.publishState(this.props);
    }

    componentWillUnmount(){
        settings_put("login_tab", this.state.select);
        window.removeEventListener("resize", this.rerender);
    }

    componentWillReceiveProps(props){
        if(JSON.stringify(props.credentials) !== JSON.stringify(this.props.credentials)){
            this.publishState(props);
        }
    }

    publishState(props){
        for(let key in props.credentials){
            this.state.backends = this.state.backends.map((backend) => {
                if(backend["type"] + "_" + backend["label"] === key){
                    backend = props.credentials[key];
                }
                return backend;
            });
        }
        this.setState({backends: this.state.backends});
    }

    onSubmit(e){
        e.preventDefault();
        const authData = this.state.backends[this.state.select],
              key = authData["type"]+"_"+authData["label"];

        this.props.credentials[key] = authData;
        this.props.onSubmit(authData, this.props.credentials);
    }

    onFormUpdate(n, values){
        this.state.backends[n] = values;
        this.setState({backends: this.state.backends});
    }

    redirect(service){
        this.props.onThirdPartyLogin(service);
    }

    onTypeChange(n){
        this.setState({select: n});
    }

    rerender(){
        this.setState({_dummy: !this.state._dummy});
    }

    _marginTop(){
        let size = 300;
        const $screen = document.querySelector(".login-form");
        if($screen) size = $screen.offsetHeight;

        size = Math.round((document.body.offsetHeight - size) / 2);
        if(size < 0) return 0;
        if(size > 150) return 150;
        return size;
    }

    render() {
        let className = (window.innerWidth < 600) ? "scroll-x" : "";
        return (
            <Card style={{marginTop: this._marginTop()+"px"}} className="no-select component_page_connection_form">
              <NgIf cond={ CONFIG["connections"].length > 1 }>
                <div className={"buttons "+className}>
                  {
                      this.state.backends.map((backend, i) => {
                          return (
                              <Button key={"menu-"+i} className={i == this.state.select ? "active primary" : ""} onClick={this.onTypeChange.bind(this, i)}>
                                {backend.label}
                              </Button>
                          );
                      })
                  }
                 </div>
               </NgIf>
              <div>
                <form onSubmit={this.onSubmit.bind(this)} autoComplete="off" autoCapitalize="off" spellCheck="false" autoCorrect="off">
                {
                    this.state.backends.map((conn, i) => {
                        return (
                            <NgIf key={"form-"+i} cond={this.state.select == i}>
                              <NgIf cond={conn.type === "webdav"}>
                                <WebDavForm values={conn} config={CONFIG["connections"][i]} onChange={this.onFormUpdate.bind(this, i)} />
                              </NgIf>
                              <NgIf cond={conn.type === "ftp"}>
                                <FtpForm values={conn} config={CONFIG["connections"][i]} onChange={this.onFormUpdate.bind(this, i)} />
                              </NgIf>
                              <NgIf cond={conn.type === "sftp"}>
                                <SftpForm values={conn} config={CONFIG["connections"][i]} onChange={this.onFormUpdate.bind(this, i)} />
                              </NgIf>
                              <NgIf cond={conn.type === "git"}>
                                <GitForm values={conn} config={CONFIG["connections"][i]} onChange={this.onFormUpdate.bind(this, i)} />
                              </NgIf>
                              <NgIf cond={conn.type === "s3"}>
                                <S3Form values={conn} config={CONFIG["connections"][i]} onChange={this.onFormUpdate.bind(this, i)} />
                              </NgIf>
                              <NgIf cond={conn.type === "dropbox"} className="third-party">
                                <DropboxForm values={conn} config={CONFIG["connections"][i]} onThirdPartyLogin={this.redirect.bind(this)} />
                              </NgIf>
                              <NgIf cond={conn.type === "gdrive"} className="third-party">
                                <GDriveForm values={conn} config={CONFIG["connections"][i]} onThirdPartyLogin={this.redirect.bind(this)} />
                              </NgIf>
                            </NgIf>
                        );
                    })
                }
                </form>
              </div>
            </Card>
        );
    }
}

const WebDavForm = formHelper(function(props){
    const onAdvanced = (value) => {
        if(value == true){
            props.values.path = "";
        }else{
            delete props.values.path;
        }
        props.onChange(props.values);
    };
    const is_advanced = props.advanced(props.values.path);

    return (
        <div>
          <NgIf cond={props.should_appear("url")}>
            <Input value={props.values["url"] || ""} onChange={(e) => props.onChange("url", e.target.value)} type={props.input_type("url")} name="url" placeholder="Address*" autoComplete="new-password" />
          </NgIf>
          <NgIf cond={props.should_appear("username")}>
            <Input value={props.values["username"] || ""} onChange={(e) => props.onChange("username", e.target.value)} type={props.input_type("username")} name="username" placeholder="Username" autoComplete="new-password" />
          </NgIf>
          <NgIf cond={props.should_appear("password")}>
            <Input value={props.values["password"] || ""} onChange={(e) => props.onChange("password", e.target.value)} type={props.input_type("password")} name="password" placeholder="Password" autoComplete="new-password" />
          </NgIf>
          <NgIf cond={props.should_appear("advanced")}>
            <label>
              <input checked={is_advanced} onChange={(e) => onAdvanced(e.target.checked)} type="checkbox" autoComplete="new-password"/> Advanced
            </label>
          </NgIf>
          <NgIf cond={is_advanced} className="advanced_form">
            <NgIf cond={props.should_appear("path")}>
              <Input value={props.values["path"] || ""} onChange={(e) => props.onChange("path", e.target.value)} type={props.input_type("path")} name="path" placeholder="Path" autoComplete="new-password" />
            </NgIf>
          </NgIf>
          <Button theme="emphasis">CONNECT</Button>
        </div>
    );
});

const FtpForm = formHelper(function(props){
    const onAdvanced = (value) => {
        if(value == true){
            props.values.path = "";
            props.values.port = "";
        }else{
            delete props.values.path;
            delete props.values.port;
        }
        props.onChange(props.values);
    };
    const is_advanced = props.advanced(
        props.values.path,
        props.values.port
    );

    return (
        <div>
          <NgIf cond={props.should_appear("hostname")}>
            <Input value={props.values["hostname"] || ""} onChange={(e) => props.onChange("hostname", e.target.value)} type={props.input_type("hostname")} name="hostname" placeholder="Hostname*" autoComplete="new-password" />
          </NgIf>
          <NgIf cond={props.should_appear("username")}>
            <Input value={props.values["username"] || ""} onChange={(e) => props.onChange("username", e.target.value)} type={props.input_type("username")} name="username" placeholder="Username" autoComplete="new-password" />
          </NgIf>
          <NgIf cond={props.should_appear("password")}>
            <Input value={props.values["password"] || ""} onChange={(e) => props.onChange("password", e.target.value)} type={props.input_type("password")} name="password" placeholder="Password" autoComplete="new-password" />
          </NgIf>
          <NgIf cond={props.should_appear("advanced")}>
            <label>
              <input checked={is_advanced} onChange={e => onAdvanced(e.target.checked)} type="checkbox" autoComplete="new-password"/> Advanced
            </label>
          </NgIf>
          <NgIf cond={is_advanced} className="advanced_form">
            <NgIf cond={props.should_appear("path")}>
              <Input value={props.values["path"] || ""} onChange={(e) => props.onChange("path", e.target.value)} type={props.input_type("path")} name="path" placeholder="Path" autoComplete="new-password" />
            </NgIf>
            <NgIf cond={props.should_appear("port")}>
              <Input value={props.values["port"] || ""} onChange={(e) => props.onChange("port", e.target.value)} type={props.input_type("port")} name="port" placeholder="Port" autoComplete="new-password" />
            </NgIf>
          </NgIf>
          <Button type="submit" theme="emphasis">CONNECT</Button>
        </div>
    );
});

const SftpForm = formHelper(function(props){
    const onAdvanced = (value) => {
        if(value == true){
            props.values.path = "";
            props.values.port = "";
            props.values.passphrase = "";
        }else{
            delete props.values.path;
            delete props.values.port;
            delete props.values.passphrase;
        }
        props.onChange();
    };
    const is_advanced = props.advanced(
        props.values.path,
        props.values.port,
        props.values.passphrase
    );

    return (
        <div>
          <NgIf cond={props.should_appear("hostname")}>
            <Input value={props.values["hostname"] || ""} onChange={(e) => props.onChange("hostname", e.target.value)} value={props.values.hostname || ""} onChange={(e) => props.onChange("hostname", e.target.value)} type={props.input_type("hostname")} name="host" placeholder="Hostname*" autoComplete="new-password" />
          </NgIf>
          <NgIf cond={props.should_appear("username")}>
            <Input value={props.values["username"] || ""} onChange={(e) => props.onChange("username", e.target.value)} type={props.input_type("username")} name="username" placeholder="Username" autoComplete="new-password" />
          </NgIf>
          <NgIf cond={props.should_appear("password")}>
            <Textarea disabledEnter={true} value={props.values["password"] || ""} onChange={(e) => props.onChange("password", e.target.value)} type="text" style={props.input_type("password") === "hidden" ? {visibility: "hidden", position: "absolute"} : {} } rows="1" name="password" placeholder="Password"  autoComplete="new-password" />
          </NgIf>
          <NgIf cond={props.should_appear("advanced")}>
            <label>
              <input checked={is_advanced} onChange={e => onAdvanced(e.target.checked)} type="checkbox" autoComplete="new-password"/> Advanced
            </label>
          </NgIf>
          <NgIf cond={is_advanced} className="advanced_form">
            <NgIf cond={props.should_appear("path")}>
              <Input value={props.values["path"] || ""} onChange={(e) => props.onChange("path", e.target.value)} type={props.input_type("path")} name="path" placeholder="Path" autoComplete="new-password" />
            </NgIf>
            <NgIf cond={props.should_appear("port")}>
              <Input value={props.values["port"] || ""} onChange={(e) => props.onChange("port", e.target.value)} type={props.input_type("port")} name="port" placeholder="Port" autoComplete="new-password" />
            </NgIf>
            <NgIf cond={props.should_appear("passphrase")}>
              <Input value={props.values["passphrase"] || ""} onChange={(e) => props.onChange("passphrase", e.target.value)} type={props.input_type("passphrase")} name="port" placeholder="Passphrase" autoComplete="new-password" />
            </NgIf>
          </NgIf>
          <Button type="submit" theme="emphasis">CONNECT</Button>
        </div>
    );
});


const GitForm = formHelper(function(props){
    const onAdvanced = (value) => {
        if(value == true){
            props.values.path = "";
            props.values.passphrase = "";
            props.values.commit = "";
            props.values.branch = "";
            props.values.author_email = "";
            props.values.author_name = "";
            props.values.committer_email = "";
            props.values.committer_name = "";
        }else{
            delete props.values.path;
            delete props.values.passphrase;
            delete props.values.commit;
            delete props.values.branch;
            delete props.values.author_email;
            delete props.values.author_name;
            delete props.values.committer_email;
            delete props.values.committer_name;
        }
        props.onChange();
    };
    const is_advanced = props.advanced(
        props.values.path,
        props.values.passphrase,
        props.values.commit,
        props.values.branch,
        props.values.author_email,
        props.values.author_name,
        props.values.committer_email,
        props.values.committer_name
    );

    return (
        <div>
          <NgIf cond={props.should_appear("repo")}>
            <Input value={props.values["repo"] || ""} onChange={(e) => props.onChange("repo", e.target.value)} type={props.input_type("repo")} name="repo" placeholder="Repository*" autoComplete="new-password" />
          </NgIf>
          <NgIf cond={props.should_appear("username")}>
            <Input value={props.values["username"] || ""} onChange={(e) => props.onChange("username", e.target.value)} type={props.input_type("username")} name="username" placeholder="Username" autoComplete="new-password" />
          </NgIf>
          <NgIf cond={props.should_appear("password")}>
            <Textarea disabledEnter={true} value={props.values["password"] || ""} onChange={(e) => props.onChange("password", e.target.value)} type="text" style={props.input_type("password") === "hidden" ? {visibility: "hidden", position: "absolute"} : {} } rows="1" name="password" placeholder="Password"  autoComplete="new-password" />
          </NgIf>
          <Input name="uid" value={gid()} type="hidden" />
          <NgIf cond={props.should_appear("advanced")}>
            <label>
              <input checked={is_advanced} onChange={(e) => onAdvanced(e.target.checked)} type="checkbox" autoComplete="new-password"/> Advanced
            </label>
          </NgIf>
          <NgIf cond={is_advanced} className="advanced_form">
            <NgIf cond={props.should_appear("path")}>
              <Input value={props.values["path"] || ""} onChange={(e) => props.onChange("path", e.target.value)} type={props.input_type("path")} name="path" placeholder="Path" autoComplete="new-password" />
            </NgIf>
            <NgIf cond={props.should_appear("passphrase")}>
              <Input value={props.values["passphrase"] || ""} onChange={(e) => props.onChange("passphrase", e.target.value)} type={props.input_type("passphrase")} name="passphrase" placeholder="Passphrase" autoComplete="new-password" />
            </NgIf>
            <NgIf cond={props.should_appear("commit")}>
              <Input value={props.values["commit"] || ""} onChange={(e) => props.onChange("commit", e.target.value)} type={props.input_type("commit")} name="commit" placeholder='Commit Format: default to \"{action}({filename}): {path}\"' autoComplete="new-password" />
            </NgIf>
            <NgIf cond={props.should_appear("branch")}>
              <Input value={props.values["branch"] || ""} onChange={(e) => props.onChange("branch", e.target.value)} type={props.input_type("branch")} name="branch" placeholder='Branch: default to "master"' autoComplete="new-password" />
            </NgIf>
            <NgIf cond={props.should_appear("author_email")}>
              <Input value={props.values["author_email"] || ""} onChange={(e) => props.onChange("author_email", e.target.value)} type={props.input_type("author_email")} name="author_email" placeholder="Author email" autoComplete="new-password" />
            </NgIf>
            <NgIf cond={props.should_appear("author_name")}>
              <Input value={props.values["author_name"] || ""} onChange={(e) => props.onChange("author_name", e.target.value)} type={props.input_type("author_name")} name="author_name" placeholder="Author name" autoComplete="new-password" />
            </NgIf>
            <NgIf cond={props.should_appear("committer_email")}>
              <Input value={props.values["committer_email"] || ""} onChange={(e) => props.onChange("committer_email", e.target.value)} type={props.input_type("committer_email")} name="committer_email" placeholder="Committer email" autoComplete="new-password" />
            </NgIf>
            <NgIf cond={props.should_appear("committer_name")}>
              <Input value={props.values["committer_name"] || ""} onChange={(e) => props.onChange("committer_name", e.target.value)} type={props.input_type("committer_name")} name="committer_name" placeholder="Committer name" autoComplete="new-password" />
            </NgIf>
          </NgIf>
          <Button type="submit" theme="emphasis">CONNECT</Button>
        </div>
    );
});

const S3Form = formHelper(function(props){
    const onAdvanced = (value) => {
        if(value == true){
            props.values.path = "";
            props.values.endpoint = "";
        }else{
            delete props.values.path;
            delete props.values.endpoint;
        }
        props.onChange();
    };
    const is_advanced = props.advanced(
        props.values.path,
        props.values.endpoint
    );

    return (
        <div>
          <NgIf cond={props.should_appear("access_key_id")}>
            <Input value={props.values["access_key_id"] || ""} onChange={(e) => props.onChange("access_key_id", e.target.value)} value={props.values.access_key_id || ""} onChange={(e) => props.onChange("access_key_id", e.target.value)} type={props.input_type("access_key_id")} name="access_key_id" placeholder="Access Key ID*" autoComplete="new-password" />
          </NgIf>
          <NgIf cond={props.should_appear("secret_access_key")}>
            <Input value={props.values["secret_access_key"] || ""} onChange={(e) => props.onChange("secret_access_key", e.target.value)} type={props.input_type("secret_access_key")} name="secret_access_key" placeholder="Secret Access Key*" autoComplete="new-password" />
          </NgIf>
          <NgIf cond={props.should_appear("advanced")}>
            <label>
              <input checked={is_advanced} onChange={(e) => onAdvanced(e.target.checked)} type="checkbox" autoComplete="new-password"/> Advanced
            </label>
          </NgIf>
          <NgIf cond={is_advanced} className="advanced_form">
            <NgIf cond={props.should_appear("path")}>
              <Input value={props.values["path"] || ""} onChange={(e) => props.onChange("path", e.target.value)} type={props.input_type("path")} name="path" placeholder="Path" autoComplete="new-password" />
            </NgIf>
            <NgIf cond={props.should_appear("region")}>
              <Input value={props.values["region"] || ""} onChange={(e) => props.onChange("region", e.target.value)} type={props.input_type("region")} name="region" placeholder="Region" autoComplete="new-password" />
            </NgIf>
            <NgIf cond={props.should_appear("endpoint")}>
              <Input value={props.values["endpoint"] || ""} onChange={(e) => props.onChange("endpoint", e.target.value)} type={props.input_type("endpoint")} name="endpoint" placeholder="Endpoint" autoComplete="new-password" />
            </NgIf>
          </NgIf>
          <Button type="submit" theme="emphasis">CONNECT</Button>
        </div>
    );
});

const DropboxForm = formHelper(function(props){
    const redirect = () => {
        return props.onThirdPartyLogin("dropbox");
    };
    return (
        <div>
          <div onClick={redirect}>
            <img src={img_dropbox} />
          </div>
          <Button type="button" onClick={redirect} theme="emphasis">LOGIN WITH DROPBOX</Button>
        </div>
    );
});

const GDriveForm = formHelper(function(props){
    const redirect = () => {
        return props.onThirdPartyLogin("google");
    };
    return (
        <div>
          <div onClick={redirect}>
            <img src={img_drive}/>
          </div>
          <Button type="button" onClick={redirect} theme="emphasis">LOGIN WITH GOOGLE</Button>
        </div>
    );
});

function formHelper(WrappedComponent){
    return (props) => {
        const helpers = {
            should_appear: function(key){
                const val = props.config[key];
                if(val === false) return false;
                else if(val === null) return false;
                else if(val === undefined) return true;
                return false;
            },
            input_type: function(key){
                if(["password", "passphrase", "secret_access_key"].indexOf(key) !== -1){
                    return "password";
                }
                return "text";
            },
            onChange: function(key, value){
                let values = props.values;
                if(typeof key === "string") values[key] = value;
                props.onChange(values);
            },
            advanced: function(){
                let res = false;
                for (let i=0; i < arguments.length; i++){
                    if(arguments[i] !== undefined) {
                        return true;
                    }
                }
                return res;
            }
        };
        return (
            <WrappedComponent {...props} {...helpers} />
        );
    };
}
