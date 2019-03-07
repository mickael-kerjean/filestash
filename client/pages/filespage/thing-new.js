import React from 'react';
import PropTypes from 'prop-types';

import { Card, NgIf, Icon, EventEmitter, EventReceiver } from '../../components/';
import { pathBuilder, debounce } from '../../helpers/';
import "./thing.scss";

@EventEmitter
@EventReceiver
export class NewThing extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            name: null,
            type: null,
            message: null,
            icon: null,
            search_enabled: "ServiceWorker" in window ? true : false,
            search_input_visible: false,
            search_keyword: ""
        };

        this._onEscapeKeyPress = (e) => {
            if(e.keyCode === 27) this.onDelete();
        };
        this._onSearchEvent = debounce((state) => {
            if(typeof state === "boolean"){
                if(this.state.search_keyword.length != 0) return;
                this.setState({search_input_visible: state});
                return;
            }
            this.setState({search_input_visible: !this.state.search_input_visible});
        }, 200);

        this.onPropageSearch = debounce(() => {
            this.props.onSearch(this.state.search_keyword);
        }, 1000);
    }

    componentDidMount(){
        window.addEventListener('keydown', this._onEscapeKeyPress);
        this.props.subscribe('new::file', () => {
            this.onNew("file");
        });
        this.props.subscribe('new::directory', () => {
            this.onNew("directory");
        });
    }
    componentWillUnmount(){
        window.removeEventListener('keydown', this._onEscapeKeyPress);
        this.props.unsubscribe('new::file');
        this.props.unsubscribe('new::directory');
    }

    onNew(type){
        if(this.state.type === type){
            this.onDelete();
        }else{
            this.setState({type: type, name: '', icon: type});
        }
    }

    onDelete(){
        this.setState({type: null, name: null, icon: null});
    }

    onSave(e){
        e.preventDefault();
        if(this.state.name !== null){
            this.props.emit('file.create', pathBuilder(this.props.path, this.state.name, this.state.type), this.state.type);
            this.onDelete();
        }
    }

    onViewChange(e){
        this.props.onViewUpdate();
    }

    onSortChange(e){
        this.props.onSortUpdate(e);
    }

    onSearchChange(search){
        this.setState({search_keyword: search});
    }

    render(){
        return (
            <div>
              <NgIf cond={this.state.type !== null} className="component_thing">
                <Card className="mouse-is-hover highlight">
                  <Icon className="component_updater--icon" name={this.state.icon} />
                  <span className="file-details">
                    <form onSubmit={this.onSave.bind(this)}>
                      <input onChange={(e) => this.setState({name: e.target.value})} value={this.state.name} type="text" autoFocus/>
                    </form>
                  </span>
                  <NgIf className="component_message" cond={this.state.message !== null}>
                    {this.state.message}
                  </NgIf>
                  <span className="component_action">
                    <div className="action">
                      <div>
                        <Icon className="component_updater--icon" name="delete" onClick={this.onDelete.bind(this)} />
                      </div>
                    </div>
                  </span>
                </Card>
              </NgIf>
            </div>
        );
    };
}

NewThing.propTypes = {
    accessRight: PropTypes.object.isRequired,
    onSortUpdate: PropTypes.func.isRequired,
    sort: PropTypes.string.isRequired
};
