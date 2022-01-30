import React from "react";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";

import { MenuBar } from "./menubar";
import { Container, FormBuilder, NgIf, Icon, Fab } from "../../components/";
import { appendShareToUrl } from "../../helpers/";
import "./formviewer.scss";

export class FormViewer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            form: {},
        };
    }

    componentDidMount() {
        this.setState({
            form: JSON.parse(this.props.content),
        });
    }

    onChange() {
        this.setState({ refresh: Math.random() });
        if (JSON.stringify(this.state.form) === this.props.content) {
            this.props.needSavingUpdate(false);
        } else {
            this.props.needSavingUpdate(true);
        }
    }

    save() {
        if (this.props.needSaving === false) return;
        const blob = new window.Blob([
            JSON.stringify(this.state.form),
        ], { type: "text/plain" });

        return this.props
            .onSave(blob)
            .then(() => this.props.needSavingUpdate(false));
    }

    simpleMarkdown(text) {
        const regLink = /\[([^\]]*)\]\(([^\)]+)\)/g;
        return text
            .replace(regLink, function(str) {
                const label = str.replace(regLink, "$1");
                const link = str.replace(regLink, "$2");
                return "["+label+"]("+appendShareToUrl(link)+")";
            })
            .replace(regLink, "<a href=\"$2\">$1</a>")
            .replace(/\n/g, "<br>");
    }

    beautify(label) {
        return label
            .split("_")
            .map((t) => {
                if (t.length === 0) return t;
                else if (/[gu]?u?id/.test(t.toLowerCase())) return t.toUpperCase();
                return t[0].toUpperCase() + t.substring(1);
            })
            .join(" ");
    }

    render() {
        const renderForm = ($input, props, struct, onChange) => {
            return (
                <label className={"no-select"}>
                    <div>
                        <span>
                            {
                                this.beautify(struct.label)
                            }<span className="mandatory">{struct.required ? "*" : ""}</span>
                        </span>
                        <div style={{ width: "100%" }}>
                            { $input }
                        </div>
                    </div>
                    <div>
                        <span className="nothing"></span>
                        <div style={{ width: "100%" }}>
                            {
                                struct.description ? (
                                    <div
                                        className="description"
                                        dangerouslySetInnerHTML={{
                                            __html: this.simpleMarkdown(struct.description),
                                        }}
                                    />
                                ) : null
                            }
                        </div>
                    </div>
                </label>
            );
        };
        return (
            <div className="component_formviewer">
                <MenuBar title={this.props.filename} download={this.props.data} />
                <div className="formviewer_container">
                    <Container>
                        <form className="sticky box">
                            <FormBuilder
                                form={this.state.form}
                                onChange={this.onChange.bind(this)}
                                render={renderForm}
                            />
                        </form>
                    </Container>
                    <ReactCSSTransitionGroup
                        transitionName="fab" transitionLeave={true} transitionEnter={true}
                        transitionAppear={true} transitionAppearTimeout={400}
                        transitionEnterTimeout={400} transitionLeaveTimeout={200}>
                        <NgIf key={this.props.needSaving} cond={this.props.needSaving}>
                            <NgIf cond={!this.props.isSaving}>
                                <Fab onClick={this.save.bind(this)}>
                                    <Icon
                                        name="save"
                                        style={{ height: "100%", width: "100%" }}
                                    />
                                </Fab>
                            </NgIf>
                            <NgIf cond={this.props.isSaving}>
                                <Fab>
                                    <Icon
                                        name="loading"
                                        style={{ height: "100%", width: "100%" }}
                                    />
                                </Fab>
                            </NgIf>
                        </NgIf>
                    </ReactCSSTransitionGroup>
                </div>
            </div>
        );
    }
}
