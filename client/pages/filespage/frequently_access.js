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
        if(this.props.files.length < 1) return null;
        return (
            <ReactCSSTransitionGroup transitionName="frequent-access" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={300}>
              <Container>
                <div className="component_frequently-access">
                  {
                      this.props.files.map(function(path, index){
                          return (
                              <Link key={path} to={"/files"+path}>
                                <Icon name={'directory'} />
                                <div>{Path.basename(path)}</div>
                              </Link>
                          );
                      })
                  }
                </div>
              </Container>
            </ReactCSSTransitionGroup>
        );
    }
}
