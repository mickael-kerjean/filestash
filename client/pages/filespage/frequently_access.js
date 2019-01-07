import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { Container, Icon } from '../../components/';
import { Link } from 'react-router-dom';
import Path from 'path';

import './frequently_access.scss';

export class FrequentlyAccess extends React.Component {
    constructor(props){
        super(props);
    }



    render(){
        let files = this.props.files;
        if(this.props.files.length === 0){
            const keep = [ "Documents", "Users", "home", "Home", "Desktop", "Downloads", "Movie", "Music", "Picture", "Photos", "Guest", "Share", "Shared", "share", "shared"];
            files = this.props.default
                .filter((file) => keep.indexOf(file.name) !== -1)
                .sort((a, b) => keep.indexOf(b) > keep.indexOf(a))
                .map((f) => f.path)
                .slice(0, 2);
        }

        if(files.length === 0){
            return null;
        }

        return (
            <ReactCSSTransitionGroup transitionName="frequent-access" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={300}>
              <div className="component_frequently-access">
                <Container>
                  <span>Quick Access</span>
                  <div className="frequent_wrapper">
                    {
                        files.map(function(path, index){
                            return (
                                <Link key={path} to={"/files"+path+window.location.search}>
                                  <Icon name={'directory'} />
                                  <div>{Path.basename(path)}</div>
                                </Link>
                            );
                        })
                    }
                  </div>
                </Container>
              </div>
            </ReactCSSTransitionGroup>
        );
    }
}
