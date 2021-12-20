import React from "react";

import { Button } from "./";
import { alert } from "../helpers/";
import { Popup } from "./popup";
import { t } from "../locales/";

import "./alert.scss";

export class ModalAlert extends Popup {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        alert.subscribe((Component, okCallback) => {
            this.setState({
                appear: true,
                value: Component,
                fn: okCallback,
            });
        });
    }

    onSubmit() {
        this.setState({ appear: false }, () => {
            requestAnimationFrame(() => this.state.fn && this.state.fn());
        });
    }

    modalContentBody() {
        return (
            <div className="modal-message">
                {this.state.value}
            </div>
        );
    }

    modalContentFooter() {
        return (
            <Button type="submit" theme="emphasis"
                onClick={this.onSubmit.bind(this)}>
                { t("OK") }
            </Button>
        );
    }
}

export function Alert({ children = null, className = null }) {
    return (
        <div className={"alert" + (className ? ` ${className}`: "")}>
            { children }
        </div>
    );
}
