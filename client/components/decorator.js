import React from "react";
import { Link } from "react-router-dom";

import { Session } from "../model/";
import { Container, Loader, Icon } from "../components/";
import { memory, currentShare } from "../helpers/";
import { t } from "../locales/";

import "../pages/error.scss";

export function LoggedInOnly(WrappedComponent) {
    memory.set("user::authenticated", false);

    return class DecoratedLoggedInOnly extends React.Component {
        constructor(props) {
            super(props);
            this.state = {
                is_logged_in: memory.get("user::authenticated"),
            };
        }

        componentDidMount() {
            if (this.state.is_logged_in === false && currentShare() === null) {
                Session.currentUser().then((res) => {
                    if (res.is_authenticated === false) {
                        this.props.error({ message: "Authentication Required" });
                        return;
                    }
                    memory.set("user::authenticated", true);
                    this.setState({ is_logged_in: true });
                }).catch((err) => {
                    if (err.code === "NO_INTERNET") {
                        this.setState({ is_logged_in: true });
                        return;
                    }
                    this.props.error(err);
                });
            }
        }

        render() {
            if (this.state.is_logged_in === true || currentShare() !== null) {
                return <WrappedComponent {...this.props} />;
            }
            return null;
        }
    };
}

export function ErrorPage(WrappedComponent) {
    return class DecoratedErrorPage extends React.Component {
        constructor(props) {
            super(props);
            this.state = {
                error: null,
                trace: null,
                showTrace: false,
                has_back_button: false,
            };
        }

        componentDidMount() {
            this.unlisten = this.props.history.listen(() => {
                this.setState({ has_back_button: false });
                this.unlisten();
            });
        }

        componentWillUnmount() {
            if (this.unlisten) this.unlisten();
        }

        update(obj) {
            this.setState({
                error: obj,
                trace: new URLSearchParams(location.search).get("trace") || null,
            });
        }

        navigate(e) {
            if (this.state.has_back_button) {
                e.preventDefault();
                this.props.history.goBack();
            }
        }

        render() {
            if (this.state.error !== null) {
                const message = this.state.error.message || t("There is nothing in here");
                return (
                    <div>
                        <a href="/"
                            className="backnav" onClick={this.navigate.bind(this)}
                        >
                            <Icon name="arrow_left" />{
                                this.state.has_back_button ? "back" : "home"
                            }
                        </a>
                        <Container>
                            <div className="error-page" onClick={() => this.setState({showTrace: true})}>
                                <h1>{ t("Oops!") }</h1>
                                <h2>{ message }</h2>
                                { this.state.showTrace && this.state.trace &&
                                  <code> { this.state.trace }</code> }
                            </div>
                        </Container>
                    </div>
                );
            }
            return (
                <WrappedComponent error={this.update.bind(this)} {...this.props} />
            );
        }
    };
}

export const LoadingPage = () => {
    return (
        <div style={{ marginTop: parseInt(window.innerHeight / 3) + "px" }}>
            <Loader />
        </div>
    );
};
