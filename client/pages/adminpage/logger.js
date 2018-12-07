import React from 'react';
import { FormBuilder, Loader, Button, Icon } from '../../components/';
import { Config, Log } from '../../model/';
import { FormObjToJSON, notify } from '../../helpers/';

import "./logger.scss";

export class LogPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            form: {},
            loading: false,
            log: "",
            config: {}
        };
    }

    componentWillMount(){
        Config.all().then((config) => {
            this.setState({
                form: {"":{"params":config["log"]}},
                config: FormObjToJSON(config)
            });
        });
        Log.get(1024*100).then((log) => { // get only the last 100kb of log
            this.setState({log: log}, () => {
                this.refs.$log.scrollTop = this.refs.$log.scrollHeight;
            });
        });
    }

    onChange(r){
        this.state.config["log"] = r[""].params;
        this.state.config["connections"] = window.CONFIG.connections;
        this.setState({loading: true}, () => {
            Config.save(this.state.config, false, () => {
                this.setState({loading: false});
            }, () => {
                notify.send("Error while saving config", "error");
                this.setState({loading: false});
            });
        });
    }

    render(){
        const filename = () => {
            let tmp = "access_";
            tmp += new Date().toISOString().substring(0,10).replace(/-/g, "");
            tmp += ".log";
        }
        return (
            <div className="component_logpage">
              <h2>Logging { this.state.loading === true ? <Icon style={{height: '40px'}} name="loading"/> : null}</h2>
              <div style={{minHeight: '150px'}}>
                <FormBuilder form={this.state.form} onChange={this.onChange.bind(this)} />
              </div>

              <pre style={{height: '350px'}} ref="$log">
                {
                    this.state.log === "" ? <Loader/> : this.state.log + "\n\n\n\n\n"
                }
              </pre>
              <div>
                <a href={Log.url()} download={filename()}><Button className="primary">Download</Button></a>
              </div>
            </div>
        );
    }
}
