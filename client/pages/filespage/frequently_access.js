import React from 'react';
import { Container, Icon } from '../../components/';
import { Link } from 'react-router-dom';
import Path from 'path';

import './frequently_access.scss';

export class FrequentlyAccess extends React.Component {
    constructor(props){
        super(props);
    }

    render(){
        if(this.props.files.length < 4) return null;
        return (
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
        );
    }
}
