import React from 'react';

import { Input, Button, Container, Icon, NgIf, Loader } from '../../components/';
import { Config, Admin } from '../../model/';
import { notify, FormObjToJSON, alert, prompt } from '../../helpers';
import { bcrypt_password } from '../../helpers/bcrypt';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import "./setup.scss";

export class SetupPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            busy: false,
        };
    }

    componentDidMount() {
        const start = (e) => {
            e.preventDefault();
            this.props.history.push("/");
        };

        Config.all().then((config) => {
            if(config.log.telemetry.value === true) return;
            this.unlisten = this.props.history.listen((location, action) => {
                this.unlisten();
                alert.now((
                    <div>
                      <p style={{textAlign: 'justify'}}>
                        Help making this software better by sending crash reports and anonymous usage statistics
                      </p>
                      <form onSubmit={start.bind(this)} style={{fontSize: '0.9em', marginTop: '10px'}}>
                        <label>
                          <Input type="checkbox" style={{width: 'inherit', marginRight: '10px'}} onChange={(e) => this.enableLog(e.target.checked)} defaultChecked={config.log.telemetry.value} />
                          I accept but the data is not to be share with any third party
                        </label>
                      </form>
                    </div>
                ));
            });
        });
    }

    onAdminPassword(p, done){
        this.setState({busy: true});
        Config.all().then((config) => {
            return bcrypt_password(p).then((hash) => {
                config = FormObjToJSON(config);
                config.connections = window.CONFIG.connections;
                config.auth.admin = hash;
                Config.save(config, false)
                    .then(() => Admin.login(p))
                    .then(() => this.setState({busy: false}, done))
                    .catch((err) => {
                        this.setState({busy: false});
                        notify.send(err && err.message, "error");
                    });
            }).catch((err) => {
                this.setState({busy: false});
                notify.send("Hash error: " + JSON.stringify(err), "error");
            });
        }).catch((err) => {
            notify.send(err && err.message, "error");
            this.setState({busy: false});
        });
    }

    onExposeInstance(choice, done){
        this.setState({busy: true});
        return Config.all().then((config) => {
            config = FormObjToJSON(config);
            config.connections = window.CONFIG.connections;
            switch(choice){
            case "tunnel":
                config.features.server.enable_tunnel = true;
                break;
            default:
                config.features.server.enable_tunnel = false;
                break;
            }
            Config.save(config, false)
                .then(() => this.setState({busy: false}, done))
                .catch((err) => {
                    notify.send(err && err.message, "error");
                    this.setState({busy: false});
                });
        }).catch((err) => {
            notify.send(err && err.message, "error");
            this.setState({busy: false});
        });
    }

    enableLog(value){
        Config.all().then((config) => {
            config = FormObjToJSON(config);
            config.connections = window.CONFIG.connections;
            config.log.telemetry = value;
            Config.save(config, false);
        });
    };

    summaryCall(){
        this.setState({busy: true});
        return Config.all().then((config) => {
            this.setState({busy: false});
            return [
                {
                    "name_success": "SSL is configured properly",
                    "name_failure": "SSL is not configured properly",
                    "pass": window.location.protocol !== "http:",
                    "severe": true,
                    "message": "This can lead to data leaks. Please use a SSL certificate or expose your instance via a filestash domain"
                }, {
                    "name_success": "Application is running as '" + objectGet(config, ["constant", "user", "value"]) + "'",
                    "name_failure": "Application is running as root",
                    "pass": objectGet(config, ["constant", "user", "value"]) !== "root",
                    "severe": true,
                    "message": "This is dangerous, you should use another user with less privileges"
                }, {
                    "name_success": "Emacs is installed",
                    "name_failure": "Emacs is not installed",
                    "pass": objectGet(config, ["constant", "emacs", "value"]),
                    "severe": false,
                    "message": "If you want to use all the org-mode features of Filestash, you need to install emacs"
                }, {
                    "name_success": "Pdftotext is installed",
                    "name_failure": "Pdftotext is not installed",
                    "pass": objectGet(config, ["constant", "pdftotext", "value"]),
                    "severe": false,
                    "message": "You won't be able to search through PDF documents without it"
                }
            ];
        }).catch((err) => {
            notify.send(err && err.message, "error");
            this.setState({busy: false});
        });
    }
    tunnelCall(){
        this.setState({busy: true});
        return Config.all().then((config) => {
            //this.setState({busy: false});
            return objectGet(config, ["features", "server", "tunnel_url", "value"]);
        });
    }

    render(){
        return (
            <div className="component_setup">
              <MultiStepForm loading={this.state.busy}
                             onAdminPassword={this.onAdminPassword.bind(this)}
                             onExposeInstance={this.onExposeInstance.bind(this) }
                             summaryCall={this.summaryCall.bind(this)}
                             tunnelCall={this.tunnelCall.bind(this)} />
            </div>
        );
    }
}


class MultiStepForm extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            current: parseInt(window.location.hash.replace("#", "")) || 0,
            answer_password: "",
            has_answered_password: false,
            answer_expose: "",
            has_answered_expose: false,
            deps: [],
            redirect_uri: null,
            working_message: "Working"
        };
    }

    componentDidMount(){
        if(this.state.current == 2){
            this.fetchDependencies();
        }
    }

    onAdminPassword(e){
        e.preventDefault();
        this.props.onAdminPassword(this.state.answer_password, () => {
            this.setState({current: 1, has_answered_password: true});
        });
    }

    onExposeInstance(value, e){
        e.preventDefault();
        this.setState({answer_expose: value});
        this.props.onExposeInstance(value, () => {
            if(value === "tunnel"){
                const waitForDomain = (count = 0) => {
                    return this.props.tunnelCall().then((url) => {
                        if(url && /\.filestash\.app$/.test(url) === true){
                            return Promise.resolve(url);
                        }
                        if(count > 10){
                            this.setState({working_message: "Building your domain"});
                        }else if(count > 30){
                            this.setState({working_message: "Processing ."+".".repeat(count % 3)});
                        }
                        if(count >= 60){
                            return Promise.reject({message: "Couldn't create a domain name"});
                        }
                        return new Promise((done) => window.setTimeout(done, 1000))
                            .then(() => waitForDomain(count + 1));
                    });
                };
                waitForDomain().then((url) => {
                    this.setState({redirect_uri: url});
                }).catch((err) => {
                    window.location.hash = "#2";
                    window.location.reload();
                });
            } else {
                this.setState({current: 2, has_answered_expose: true}, () => {
                    this.onStepChange(2);
                });
            }
        });
    }

    onStepChange(n){
        this.setState({current: n});
        if(n === 2){
            this.fetchDependencies();
        }
    }

    fetchDependencies() {
        this.props.summaryCall().then((deps) => {
            this.setState({deps: deps});
        });
    }

    render() {
        const hideMenu = <style dangerouslySetInnerHTML={{__html: ".component_menu_sidebar{transform: translateX(-300px)}"}} />;
        if(this.state.current === 0) {
            return (
                <div id="step1">
                  <FormStage navleft={false} navright={this.state.has_answered_password === true} current={this.state.current} onStepChange={this.onStepChange.bind(this)}>
                    Step 1/2: Secure your instance
                  </FormStage>
                  <ReactCSSTransitionGroup transitionName="stepper-form" transitionEnterTimeout={600} transitionAppearTimeout={600} transitionAppear={true} transitionEnter={true} transitionLeave={false}>
                    <div key={this.state.current}>
                      <p>Create your admin password: </p>
                      <form onSubmit={this.onAdminPassword.bind(this)}>
                        <Input ref="$input" type="password" placeholder="Password" value={this.state.answer_password} onChange={(e) => this.setState({answer_password: e.target.value})}/>
                        <Button theme="transparent">
                          <Icon name={this.props.loading ? "loading" : "arrow_right"}/>
                        </Button>
                      </form>
                    </div>
                  </ReactCSSTransitionGroup>
                {hideMenu}
                </div>
            );
        } else if(this.state.current === 1) {
            return (
                <div id="step2">
                  <FormStage navleft={true} navright={this.state.has_answered_expose} current={this.state.current} onStepChange={this.onStepChange.bind(this)}>
                    Step 2/2: Expose your instance to the internet ?
                  </FormStage>
                  <ReactCSSTransitionGroup transitionName="stepper-form" transitionEnterTimeout={600} transitionAppearTimeout={600} transitionAppear={true} transitionEnter={true} transitionLeave={false}>
                    <div key={this.state.current}>
                      <NgIf cond={this.state.redirect_uri !== null}>
                        <div style={{textAlign: "center"}}>
                          Your instance is available at <a href={this.state.redirect_uri}>{this.state.redirect_uri}</a>.<br/>
                          You will be redirected in <Countdown max={9} onZero={() => window.location.href = this.state.redirect_uri} /> seconds
                        </div>
                      </NgIf>
                      <NgIf cond={!this.props.loading && this.state.redirect_uri === null}>
                        <form onSubmit={this.onExposeInstance.bind(this, "skip")}>
                          <label className={this.state.answer_expose === "nothing" ? "active" : ""}>
                            <input type="radio" name="expose" value="nothing" checked={this.state.answer_expose === "nothing"} onChange={this.onExposeInstance.bind(this, "nothing")}/>
                            No, don't expose anything to the internet
                            </label>
                          <label className={this.state.answer_expose === "tunnel" ? "active" : ""}>
                            <input type="radio" name="expose" value="tunnel" checked={this.state.answer_expose === "tunnel"} onChange={this.onExposeInstance.bind(this, "tunnel")}/>
                            Yes, and make it available via a filestash subdomain - eg: https://user-me.filestash.app
                          </label>
                          <label className={this.state.answer_expose === "skip" ? "active" : ""}>
                            <input type="radio" name="expose" value="skip" checked={this.state.answer_expose === "skip"} onChange={this.onExposeInstance.bind(this, "skip")}/>
                            Skip if you're a wizard when it comes to SSL certificates and port forwarding
                          </label>
                        </form>
                      </NgIf>
                      <NgIf cond={!!this.props.loading && this.state.redirect_uri === null}>
                        <Loader/>
                        <div style={{textAlign: "center"}}>{this.state.working_message}</div>
                      </NgIf>
                    </div>
                  </ReactCSSTransitionGroup>
                  {hideMenu}
                </div>
            );
        } else if(this.state.current === 2) {
            return (
                <div id="step3">
                  <FormStage navleft={true} navright={false} current={this.state.current} onStepChange={this.onStepChange.bind(this)}>
                    Summary
                  </FormStage>
                  <ReactCSSTransitionGroup transitionName="stepper-form" transitionEnterTimeout={600} transitionAppearTimeout={600} transitionAppear={true} transitionEnter={true} transitionLeave={false}>
                    <div key={this.state.current}>
                      <NgIf cond={!!this.props.loading}>
                        <Loader/>
                        <div style={{textAlign: "center"}}>Verifying</div>
                      </NgIf>
                      <NgIf cond={!this.props.loading}>
                        {
                            this.state.deps.map((dep, idx) => {
                                return (
                                    <div className={"component_dependency_installed" + (dep.pass ? " yes" : " no") + (dep.severe ? " severe" : "")} key={idx}>
                                      <span>{dep.pass ? dep.name_success : dep.name_failure}</span>{dep.pass ? null : ": " + dep.message}
                                    </div>
                                );
                            })
                        }
                      </NgIf>
                    </div>
                  </ReactCSSTransitionGroup>
                </div>
            );
        }
        return null;
    }
}

const FormStage = (props) => {
    return (
        <h4>
          { props.navleft === true ? <Icon name="arrow_left" onClick={() => props.onStepChange(props.current - 1)}/> : null}
          { props.children }
          { props.navright === true ? <Icon name="arrow_right" onClick={() => props.onStepChange(props.current + 1)}/> : null }
        </h4>
    );
};

class Countdown extends React.Component {
    constructor(props){
        super(props);
        this.state = { count: props.max };
    }

    componentDidMount(){
        this.timeout = window.setInterval(() => {
            if(this.state.count - 1 >= 0){
                this.setState({count: this.state.count - 1}, () => {
                    if(this.state.count === 0) this.props.onZero();
                });
            }
        }, 1000);
    }

    componentWillUnmount(){
        window.clearInterval(this.timeout);
    }

    render(){
        return(
            <span>{this.state.count}</span>
        );
    }
}

function objectGet(obj, paths){
    let value = obj;
    for(let i=0; i<paths.length; i++){
        if(typeof value !== "object") return null;
        value = value[paths[i]];
    }
    return value;
}
