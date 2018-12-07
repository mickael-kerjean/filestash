import React from 'react';
import { FormBuilder, Icon, Input } from "../../components/";
import { Backend, Config } from "../../model/";
import { FormObjToJSON, notify, format } from "../../helpers/";

import "./dashboard.scss";

export class DashboardPage extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            backend_enabled: [],
            backend_available: [],
            config: null
        };
    }

    componentWillMount(){
        Promise.all([
            Backend.all(),
            Config.all()
        ]).then((data) => {
            let [backend, config] = data;
            this.setState({
                backend_available: backend,
                backend_enabled: window.CONFIG.connections.map((conn) => {
                    return createFormBackend(backend, conn);
                }),
                config: config
            });
        });
    }

    onChange(e){
        this.setState({refresh: Math.random()}); // refresh the screen to refresh the mutation
                                                 // that have happenned down the stack

        let json = FormObjToJSON(this.state.config);
        json.connections = this.state.backend_enabled.map((backend) => {
            let data = FormObjToJSON(backend, (obj, key) => {
                if(obj[key].enabled === true){
                    obj[key] = obj[key].value || obj[key].default;
                } else {
                    delete obj[key];
                }
            });
            const key = Object.keys(data)[0];
            return data[key];
        });

        // persist config object in the backend
        Config.save(json, true, () => {
            this.componentWillMount();
        });
    }


    addBackend(backend_id){
        this.setState({
            backend_enabled: this.state.backend_enabled.concat(
                createFormBackend(this.state.backend_available, {
                    type: backend_id,
                    label: backend_id.toUpperCase()
                })
            )
        }, this.onChange.bind(this));
    }

    removeBackend(n){
        this.setState({
            backend_enabled: this.state.backend_enabled.filter((_, i) => i !== n)
        }, this.onChange.bind(this));
    }

    render(){
        const update = (value, struct) => {
            struct.enabled = value;
            this.setState({refresh: Math.random()});
            if(value === false){
                struct.value = null;
            }
            return;
        };

        const enable = (struct) => {
            if(typeof struct.value === "string"){
                struct.enabled = true;
                return true;
            }
            return !!struct.enabled;
        };

        return (
            <div className="component_dashboard">
              <h2>Dashboard</h2>
              <div className="box-element">
                {
                    Object.keys(this.state.backend_available).map((backend_available, index) => {
                        return (
                            <div key={index} className="backend">
                              <div>
                                {backend_available}
                                <span className="no-select" onClick={this.addBackend.bind(this, backend_available)}>
                                  +
                                </span>
                              </div>
                            </div>
                        );
                    })
                }
              </div>
              <form>
                {
                    this.state.backend_enabled.map((backend_enable, index) => {
                        return (
                            <div key={index}>
                              <div className="icons no-select" onClick={this.removeBackend.bind(this, index)}>
                                <Icon name="delete" />
                              </div>
                              <FormBuilder onChange={this.onChange.bind(this)} idx={index} key={index}
                                           form={{"": backend_enable}}
                                           render={ ($input, props, struct, onChange) => {
                                               let $checkbox = (
                                                   <Input type="checkbox" style={{width: "inherit", marginRight: '6px', top: '6px'}}
                                                          checked={enable(struct)} onChange={(e) => onChange(update.bind(this, e.target.checked))}/>
                                               );
                                               if(struct.label === "label"){
                                                   $checkbox = null;
                                               }
                                               return (
                                                   <label className={"no-select input_type_" + props.params["type"]}>
                                                     <div>
                                                       <span>
                                                         { $checkbox }
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
                        );
                    })
                }
              </form>
            </div>
        );
    }
}



function createFormBackend(backend_available, backend_data){
    let template = JSON.parse(JSON.stringify(backend_available[backend_data.type]));

    for(let key in backend_data){
        if(key in template){
            template[key].value = backend_data[key];
            template[key].enabled = true;
        } else {
            // create a form object if data isn't available in the template
            let obj = {};
            obj[key] = {
                label: key,
                type: "text",
                value: null,
                default: backend_data[key]
            };
            template = Object.assign(obj, template);
        }

        if(key === "label"){
            template[key].placeholder = "Name as shown on the login screen.";
            template[key].value = backend_data[key];
            template[key].enabled = true;
        } else if(key === "type"){
            template[key].enabled = true;
        } else if(key === "advanced"){
            template[key].enabled = true;
        }
    }

    let obj = {};
    obj[backend_data.type] = template;
    return obj;
}
