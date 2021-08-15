import React, { createRef } from "react";

import { Input, Button, Container, Icon, NgIf, Loader, CSSTransition } from "../../components/";
import { Config, Admin } from "../../model/";
import { notify, FormObjToJSON, alert, prompt } from "../../helpers";
import { bcrypt_password } from "../../helpers/bcrypt";
//import ReactCSSTransitionGroup from "react-addons-css-transition-group";

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
                      <p style={{textAlign: "justify"}}>
                        Help making this software better by sending crash reports and anonymous usage statistics
                      </p>
                      <form onSubmit={start.bind(this)} style={{fontSize: "0.9em", marginTop: "10px"}}>
                        <label>
                          <Input type="checkbox" style={{width: "inherit", marginRight: "10px"}} onChange={(e) => this.enableLog(e.target.checked)} defaultChecked={config.log.telemetry.value} />
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
                    "message": "This can lead to data leaks. Please use a SSL certificate"
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

    render(){
        return (
            <div className="component_setup">
              <MultiStepForm loading={this.state.busy}
                             onAdminPassword={this.onAdminPassword.bind(this)}
                             summaryCall={this.summaryCall.bind(this)} />
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
            deps: []
        };
        this.$input = createRef()
    }

    componentDidMount(){
        if(this.state.current === 1){
            this.props.summaryCall().then((deps) => {
                this.setState({deps: deps});
            });
        }
    }

    onAdminPassword(e){
        e.preventDefault();
        this.props.onAdminPassword(this.state.answer_password, () => {
            this.setState({has_answered_password: true});
            this.onStepChange(1);
        });
    }

    onStepChange(n){
        this.setState({current: n}, () => {
            if(n === 1) this.componentDidMount();
        });
    }

    render() {
        const hideMenu = <style dangerouslySetInnerHTML={{__html: ".component_menu_sidebar{transform: translateX(-300px)}"}} />;
        if(this.state.current === 0) {
            return (
                <div id="step1">
                  <FormStage navleft={false} navright={this.state.has_answered_password === true} current={this.state.current} onStepChange={this.onStepChange.bind(this)}>
                    Admin Password
                  </FormStage>
                  <CSSTransition transitionName="stepper-form" transitionEnterTimeout={600} transitionAppearTimeout={600} transitionAppear={true} transitionEnter={true} transitionLeave={false}>
                    <div key={this.state.current}>
                      <p>Create your instance admin password: </p>
                      <form onSubmit={this.onAdminPassword.bind(this)}>
                        <Input ref={this.$input} type="password" placeholder="Password" value={this.state.answer_password} onChange={(e) => this.setState({answer_password: e.target.value})}/>
                        <Button theme="transparent">
                          <Icon name={this.props.loading ? "loading" : "arrow_right"}/>
                        </Button>
                      </form>
                    </div>
                  </CSSTransition>
                {hideMenu}
                </div>
            );
        } else if(this.state.current === 1) {
            return (
                <div id="step2">
                  <FormStage navleft={true} navright={false} current={this.state.current} onStepChange={this.onStepChange.bind(this)}>
                    Summary
                  </FormStage>
                  <CSSTransition transitionName="stepper-form" transitionEnterTimeout={600} transitionAppearTimeout={600} transitionAppear={true} transitionEnter={true} transitionLeave={false}>
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
                  </CSSTransition>
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

function objectGet(obj, paths){
    let value = obj;
    for(let i=0; i<paths.length; i++){
        if(typeof value !== "object") return null;
        value = value[paths[i]];
    }
    return value;
}
