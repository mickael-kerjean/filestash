import React from 'react';
import PropTypes from 'prop-types';

import { Icon, NgIf } from './';
import './video.scss';


export class Video extends React.Component {
    constructor(props){
        super(props);
    }

    render(){
        return (
            <div className="component_video">
              <div className="loader">
                <Icon name="loading"/>
              </div>
            </div>
        );
    }
}


// <video autoPlay="true" width="300" height="200">
//       <source src="https://www.w3schools.com/tags/movie.mp4" type="video/mp4" />
// </video>
