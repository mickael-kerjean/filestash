import React from "react";
import PropTypes from "prop-types";

import { Card, NgIf, Icon, EventEmitter, EventReceiver } from "../../components/";
import { pathBuilder } from "../../helpers/";
import "./thing.scss";

class NewThingComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            name: null,
            type: null,
            icon: null,
        };

        this._onEscapeKeyPress = (e) => {
            if (e.keyCode === 27) this.onDelete();
        };
    }

    componentDidMount() {
        window.addEventListener("keydown", this._onEscapeKeyPress);
        this.props.subscribe("new::file", () => {
            this.onNew("file");
        });
        this.props.subscribe("new::directory", () => {
            this.onNew("directory");
        });
    }
    componentWillUnmount() {
        window.removeEventListener("keydown", this._onEscapeKeyPress);
        this.props.unsubscribe("new::file");
        this.props.unsubscribe("new::directory");
    }

    onNew(type) {
        if (this.state.type === type) {
            this.onDelete();
        } else {
            this.setState({
                type: type,
                name: "",
                icon: type,
            });
        }
    }

    onDelete() {
        this.setState({
            type: null,
            name: null,
            icon: null,
        });
    }

    onSave(e) {
        e.preventDefault();
        if (this.state.name !== null) {
            this.props.emit(
                "file.create",
                pathBuilder(this.props.path, this.state.name, this.state.type),
                this.state.type,
            );
            this.onDelete();
        }
    }

    render() {
        return (
            <div>
                <NgIf cond={this.state.type !== null} className="component_thing">
                    <Card className="mouse-is-hover highlight">
                        <Icon className="component_updater--icon" name={this.state.icon} />
                        <span className="file-details">
                            <form onSubmit={this.onSave.bind(this)}>
                                <input
                                    onChange={(e) => this.setState({ name: e.target.value })}
                                    value={this.state.name}
                                    type="text" autoFocus />
                            </form>
                        </span>
                        <span className="component_action">
                            <div className="action">
                                <div>
                                    <Icon
                                        className="component_updater--icon"
                                        name="delete"
                                        onClick={this.onDelete.bind(this)} />
                                </div>
                            </div>
                        </span>
                    </Card>
                </NgIf>
            </div>
        );
    };
}

NewThingComponent.propTypes = {
    accessRight: PropTypes.object.isRequired,
    sort: PropTypes.string.isRequired,
};

export const NewThing = EventEmitter(EventReceiver(NewThingComponent));
