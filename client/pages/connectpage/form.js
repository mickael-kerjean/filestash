import React from "react";
import { Container, Card, NgIf, Input, Button, Textarea, FormBuilder } from "../../components/";
import { gid, settings_get, settings_put, createFormBackend, FormObjToJSON } from "../../helpers/";
import { Session, Backend } from "../../model/";
import "./form.scss";
import img_drive from "../../assets/img/google-drive.png";
import img_dropbox from "../../assets/img/dropbox.png";

export class Form extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            select: function(){
                const connLength = window.CONFIG["connections"].length;
                if(connLength < 4) return 0;
                else if(connLength < 5) return 1;
                return 2;
            }(),
            backends_enabled: []
        };

        const select = settings_get("login_tab");
        if(select !== null && select < window.CONFIG["connections"].length){ this.state.select = select; }
        this.rerender = () => this.setState({_refresh: !this.state._refresh});
    }

    componentDidMount(){
        window.addEventListener("resize", this.rerender);
        Backend.all().then((backend) => {
            this.props.onLoadingChange(false);
            this.setState({
                backends_available: backend,
                backends_enabled: window.CONFIG["connections"].map((conn) => {
                    return createFormBackend(backend, conn);
                })
            }, () => {
                return this.publishState(this.props);
            });
        }).catch((err) => {
            this.props.error(err);
        });
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
            this.state.backends_enabled = this.state.backends_enabled.map((backend) => {
                const b = backend[Object.keys(backend)[0]];
                if(b["type"].value + "_" + b["label"].value === key){
                    for(let k in b){
                        if(props.credentials[key][k]){
                            b[k].value = props.credentials[key][k];
                        }
                    }
                }
                return backend;
            });
        }
        this.setState({backends_enabled: this.state.backends_enabled});
    }

    onSubmit(e){
        e.preventDefault();
        const data = () => {
            const tmp = this.state.backends_enabled[this.state.select];
            return tmp[Object.keys(tmp)[0]];
        };
        const dataToBeSubmitted = JSON.parse(JSON.stringify(FormObjToJSON(data())));
        const key = dataToBeSubmitted["type"] + "_" + dataToBeSubmitted["label"];
        delete dataToBeSubmitted.image;
        delete dataToBeSubmitted.label;
        delete dataToBeSubmitted.advanced;
        this.props.credentials[key] = dataToBeSubmitted;
        this.props.onSubmit(dataToBeSubmitted, this.props.credentials);
    }

    onTypeChange(n){
        this.setState({select: n});
    }

    render() {
        const _marginTop = () => {
            let size = 300;
            const $screen = document.querySelector(".login-form");
            if($screen) size = $screen.offsetHeight;

            size = Math.round((document.body.offsetHeight - size) / 2);
            if(size < 0) return 0;
            if(size > 150) return 150;
            return size;
        };

        return (
            <Card style={{marginTop: _marginTop()+"px"}} className="no-select component_page_connection_form">
              <NgIf cond={ window.CONFIG["connections"].length > 1 }>
                <div className={"buttons "+((window.innerWidth < 600) ? "scroll-x" : "")}>
                  {
                         this.state.backends_enabled.map((backend, i) => {
                             const key = Object.keys(backend)[0];
                             return (
                                 <Button key={"menu-"+i} className={i === this.state.select ? "active primary" : ""} onClick={this.onTypeChange.bind(this, i)}>
                                   { backend[key].label.value }
                                 </Button>
                             );
                         })
                  }
                 </div>
              </NgIf>
              <div>
                <form onSubmit={this.onSubmit.bind(this)} autoComplete="off" autoCapitalize="off" spellCheck="false" autoCorrect="off">
                  {
                      this.state.backends_enabled.map((form, i) => {
                          const key = Object.keys(form)[0];
                          if(!form[key]) return null;
                          else if(this.state.select !== i) return null;
                          return (
                              <FormBuilder form={form[key]} onChange={this.rerender.bind(this)} key={"form"+i}
                                render={ ($input, props, struct, onChange) => {
                                    if(struct.type === "image"){
                                        return (
                                            <div className="center">
                                              { $input }
                                            </div>
                                        );
                                    } else if(struct.enabled === true){
                                        return null;
                                    } else if(struct.label === "advanced") return (
                                        <label style={{color: "rgba(0,0,0,0.4)"}}>
                                          { $input }
                                          advanced
                                        </label>
                                    );
                                    return (
                                        <label className={"no-select input_type_" + props.params["type"]}>
                                          <div>
                                            { $input }
                                          </div>
                                        </label>
                                    );
                                }} />
                          );
                      })
                  }
                  <Button theme="emphasis">CONNECT</Button>
                </form>
              </div>
            </Card>
        );
    }
}
