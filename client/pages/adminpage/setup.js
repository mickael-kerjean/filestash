import React from 'react';

import { Input, Button, Container, Icon } from '../../components/';
import { Config, Admin } from '../../model/';
import { notify, FormObjToJSON, alert, prompt } from '../../helpers';
import { bcrypt_password } from '../../helpers/bcrypt';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import "./setup.scss";

export class SetupPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            stage: 0,
            password: "",
            enable_telemetry: false,
            creating_password: false
        };
    }

    createPassword(e){
        this.setState({creating_password: true});
        e.preventDefault();
        const enableLog = (value) => {
            Config.all().then((config) => {
                config.log.telemetry.value = value;
                config = FormObjToJSON(config);
                config.connections = window.CONFIG.connections;
                Config.save(config, false);
            });
        };
        const start = (e) => {
            e.preventDefault();
            this.props.history.push("/");
        };
        Config.all().then((config) => {
            this.setState({enable_telemetry: config.log.telemetry.value}, () => {
                if(this.state.enable_telemetry === true) return;
                this.unlisten = this.props.history.listen((location, action) => {
                    this.unlisten();
                    alert.now((
                        <div>
                          <p style={{textAlign: 'justify'}}>
                            Help making this software better by sending crash reports and anonymous usage statistics
                          </p>
                          <form onSubmit={start.bind(this)} style={{fontSize: '0.9em', marginTop: '10px'}}>
                            <label>
                              <Input type="checkbox" style={{width: 'inherit', marginRight: '10px'}} onChange={(e) => enableLog(e.target.checked)} defaultChecked={this.state.enable_telemetry} />
                                I accept but the data is not to be share with any third party
                            </label>
                          </form>
                        </div>
                    ));
                });
            });

            bcrypt_password(this.state.password)
                .then((hash) => {
                    config.auth.admin.value = hash;
                    config = FormObjToJSON(config);
                    config.connections = window.CONFIG.connections;
                    Config.save(config, false)
                        .then(() => Admin.login(this.state.password))
                        .then(() => this.setState({stage: 1, creating_password: false}))
                        .catch((err) => {
                            notify.send(err && err.message, "error");
                            this.setState({creating_password: false});
                        });
                })
                .catch((err) => {
                    notify.send("Hash error: " + JSON.stringify(err), "error");
                    this.setState({creating_password: false});
                });
        });
    }

    enableLog(value){
        Config.all().then((config) => {
            config.log.telemetry.value = value;
            config = FormObjToJSON(config);
            config.connections = window.CONFIG.connections;
            Config.save(config, false);
        });
    }

    start(e){
        e.preventDefault();
        this.props.history.push("/");
    }

    renderStage(stage){
        if(stage === 0){
            return (
                <div>
                  <h2>You made it chief! { this.state.creating_password === true ? <Icon name="loading"/> : null}</h2>
                  <p>
                    Let's start by protecting the admin area with a password:
                  </p>
                  <form onSubmit={this.createPassword.bind(this)} style={{maxWidth: '350px'}}>
                    <Input type="password" placeholder="Create your admin password" defaultValue="" onChange={(e) => this.setState({password: e.target.value})} autoComplete="new-password"/>
                    <Button className="primary">Create Password</Button>
                  </form>
                  <style dangerouslySetInnerHTML={{__html: ".component_menu_sidebar{transform: translateX(-300px)}"}} />
                </div>
            );
        }
        return (
            <div>
              <h2>Welcome to the engine room</h2>
              <p>
                This is the place where you can configure filestash to your liking. Feel free to poke around. <br/>
                You can come back by navigating at <a href="/admin">`{window.location.origin + "/admin"}`</a>. <br/>
                Have fun!
              </p>
            </div>
        );
    }

    render(){
        return (
            <div className="component_setup">
              { this.renderStage(this.state.stage) }
            </div>
        );
    }
}
