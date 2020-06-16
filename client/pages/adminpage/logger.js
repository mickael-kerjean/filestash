import React from 'react';
import { FormBuilder, Loader, Button, Icon } from '../../components/';
import { Config, Log } from '../../model/';
import { FormObjToJSON, notify, format } from '../../helpers/';
import { t } from '../../locales/';

import "./logger.scss";

export class LogPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            form: {},
            log: "",
            config: {}
        };
    }

    componentDidMount(){
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
        this.props.isSaving(true);
        Config.save(this.state.config, true, () => {
            this.props.isSaving(false);
        }, () => {
            notify.send(err && err.message || t('Oops'), 'error');
            this.props.isSaving(false);
        });
    }

    render(){
        const filename = () => {
            let tmp = "access_";
            tmp += new Date().toISOString().substring(0,10).replace(/-/g, "");
            tmp += ".log";
        };
        return (
            <div className="component_logpage">
              <h2>Logging</h2>
              <div style={{minHeight: '150px'}}>
                <FormBuilder form={this.state.form} onChange={this.onChange.bind(this)}
                             render={ ($input, props, struct, onChange) => {
                                 return (
                                     <label className={"no-select input_type_" + props.params["type"]}>
                                       <div>
                                         <span>
                                           { format(struct.label) }:
                                         </span>
                                         <div style={{width: '100%'}}>
                                           { $input }
                                         </div>
                                       </div>
                                       <div>
                                         <span className="nothing"></span>
                                         <div style={{width: '100%'}}>
                                           {
                                               struct.description ? (<div className="description">{struct.description}</div>) : null
                                           }
                                         </div>
                                       </div>
                                     </label>
                                 );
                                 }} />
              </div>

              <pre style={{height: '350px'}} ref="$log">
                {
                    this.state.log === "" ? <Loader/> : this.state.log + "\n\n\n\n\n"
                }
              </pre>
              <div>
                <a href={Log.url()} download={filename()}><Button className="primary">{ t("Download") }</Button></a>
              </div>
            </div>
        );
    }
}
