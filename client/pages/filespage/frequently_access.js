import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { Container, Icon, NgIf } from '../../components/';
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

        return (
            <ReactCSSTransitionGroup transitionName="frequent-access" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={300}>
              <div className="component_frequently-access">
                <Container>
                  <span className="caption">Quick Access</span>
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
                <NgIf cond={files.length === 0} className="nothing_placeholder">
                  <svg aria-hidden="true" focusable="false" data-icon="layer-group" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                     <path fill="currentColor" d="M12.41 148.02l232.94 105.67c6.8 3.09 14.49 3.09 21.29 0l232.94-105.67c16.55-7.51 16.55-32.52 0-40.03L266.65 2.31a25.607 25.607 0 0 0-21.29 0L12.41 107.98c-16.55 7.51-16.55 32.53 0 40.04zm487.18 88.28l-58.09-26.33-161.64 73.27c-7.56 3.43-15.59 5.17-23.86 5.17s-16.29-1.74-23.86-5.17L70.51 209.97l-58.1 26.33c-16.55 7.5-16.55 32.5 0 40l232.94 105.59c6.8 3.08 14.49 3.08 21.29 0L499.59 276.3c16.55-7.5 16.55-32.5 0-40zm0 127.8l-57.87-26.23-161.86 73.37c-7.56 3.43-15.59 5.17-23.86 5.17s-16.29-1.74-23.86-5.17L70.29 337.87 12.41 364.1c-16.55 7.5-16.55 32.5 0 40l232.94 105.59c6.8 3.08 14.49 3.08 21.29 0L499.59 404.1c16.55-7.5 16.55-32.5 0-40z"></path>
                   </svg>
                   Frequently access folders will be shown here
                </NgIf>
                </Container>
              </div>
            </ReactCSSTransitionGroup>
        );
    }
}
