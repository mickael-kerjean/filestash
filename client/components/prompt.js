import React from "react";

import { Input, Button } from "./";
import { prompt } from "../helpers/";
import { Popup } from "./popup";
import { t } from "../locales/";

export class ModalPrompt extends Popup {
    constructor(props){
        super(props);
    }

    componentDidMount(){
        prompt.subscribe((text, okCallback, cancelCallback, type) => {
            this.setState({
                appear: true,
                value: "",
                error: null,
                type: type || "text",
                text: text || "",
                fns: {ok: okCallback, cancel: cancelCallback}
            });
        });
    }

    onSubmit(e){
        e && e.preventDefault && e.preventDefault();
        this.state.fns.ok(this.state.value)
            .then(() => this.setState({appear: false}))
            .catch((message) => this.setState({error: message}));
    }

    modalContentBody(){
        return (
            <div>
              {this.state.text }
              <form onSubmit={this.onSubmit.bind(this)} style={{marginTop: "10px"}}>
                <Input autoFocus={true} value={this.state.value} type={this.state.type} autoComplete="new-password" onChange={(e) =>  this.setState({value: e.target.value})} />
                <div className="modal-error-message">{this.state.error}&nbsp;</div>
              </form>
            </div>
        );
    }

    modalContentFooter(){
        return (
            <div>
              <Button type="button" onClick={this.onCancel.bind(this)}>{ t("CANCEL") }</Button>
              <Button type="submit" theme="emphasis" onClick={this.onSubmit.bind(this)}>{ t("OK") }</Button>
            </div>
        );
    }

}
