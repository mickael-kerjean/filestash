import React from "react";
import { Icon } from "./";
import "./video.scss";

export class Video extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className="component_video">
                <div className="loader">
                    <Icon name="loading"/>
                </div>
            </div>
        );
    }
}
