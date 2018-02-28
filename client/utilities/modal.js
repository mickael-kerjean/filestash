import React from 'react';
import PropTypes from 'prop-types';
import { theme } from './theme';
import { Input } from './input';
import { Button } from './button';
import { NgIf } from './ngif';
import './modal.scss';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

export class Modal extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            marginTop: this._marginTop()
        };
    }

    onClick(e){
        if(e.target.getAttribute('id') === 'modal-box'){
            this.props.onQuit && this.props.onQuit();
        }
    }

    componentDidMount(){
        this.setState({marginTop: this._marginTop()});
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
                <div className="component_modal" onClick={this.onClick.bind(this)} id="modal-box">
                  <div key="random" style={{margin: this.state.marginTop+'px auto 0 auto'}}>
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
