import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import PropTypes from 'prop-types';

import { Input, Button, NgIf } from './';
import { debounce } from '../helpers/';
import './modal.scss';

export class Modal extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            marginTop: -1
        };
        this._resetMargin = debounce(this._resetMargin.bind(this), 100);
        this._onEscapeKeyPress = this._onEscapeKeyPress.bind(this);
    }

    onClick(e){
        if(e.target.getAttribute('id') === 'modal-box'){
            this.props.onQuit && this.props.onQuit();
        }
    }

    componentWillReceiveProps(){
        // that's quite a bad hack but well it will do for now
        requestAnimationFrame(() => {
            this.setState({marginTop: this._marginTop()});
        }, 0);
    }

    componentDidMount(){
        window.addEventListener("resize", this._resetMargin);
        window.addEventListener('keydown', this._onEscapeKeyPress);
    }
    componentWillUnmount(){
        window.removeEventListener("resize", this._resetMargin);
        window.removeEventListener('keydown', this._onEscapeKeyPress);
    }

    _resetMargin(){
        this.setState({marginTop: this._marginTop()});
    }

    _onEscapeKeyPress(e){
        if(e.keyCode === 27){
            this.props.onQuit && this.props.onQuit();
        }
    }


    _marginTop(){
        let size = 300;
        const $box = document.querySelector('#modal-box > div');
        if($box) size = $box.offsetHeight;

        size = Math.round((document.body.offsetHeight - size) / 2);
        if(size < 0) return 0;
        if(size > 250) return 250;
        return size;
    }

    render() {
        return (
            <ReactCSSTransitionGroup transitionName="modal"
              transitionLeaveTimeout={300}
              transitionEnterTimeout={300}
              transitionAppear={true} transitionAppearTimeout={300}
              >
              <NgIf key={"modal-"+this.props.isActive} cond={this.props.isActive}>
                <div className={"component_modal"+(this.props.className? " " + this.props.className : "")} onClick={this.onClick.bind(this)} id="modal-box">
                  <div style={{margin: this.state.marginTop+'px auto 0 auto', visibility: this.state.marginTop === -1 ? "hidden" : "visible"}}>
                    {this.props.children}
                  </div>
                </div>
              </NgIf>
            </ReactCSSTransitionGroup>
        );
    }
}

Modal.propTypes = {
    isActive: PropTypes.bool.isRequired,
    onQuit: PropTypes.func
};
