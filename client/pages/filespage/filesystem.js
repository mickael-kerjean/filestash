import React from 'react';
import PropTypes from 'prop-types';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import { DropTarget } from 'react-dnd';
import Path from 'path';

import "./filesystem.scss";
import { Container, NgIf } from '../../components/';
import { NewThing } from './thing-new';
import { ExistingThing } from './thing-existing';
import { FileZone } from './filezone';

@DropTarget('__NATIVE_FILE__', {}, (connect, monitor) => ({
    connectDropFile: connect.dropTarget(),
    fileIsOver: monitor.isOver()
}))
export class FileSystem extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            creating: null,
            access_right: this._findAccessRight(props.files),
            sort: 'type'
        };
    }

    _findAccessRight(files){
        for(let i=0, l=files.length; i< l; i++){
            let file = files[i];
            if(file.name === './' && file.type === 'metadata'){
                return file;
            }
        }
        return {can_create_file: true, can_create_directory: true};
    }

    sort(files, type){
        if(type === 'name'){
            return sortByName(files);
        }else if(type === 'date'){
            return sortByDate(files);
        }else{
            return sortByType(files);
        }
        function sortByType(files){
            return files.sort((fileA, fileB) => {
                if(fileA.icon === 'loading' && fileB.icon !== 'loading'){return +1;}
                else if(fileA.icon !== 'loading' && fileB.icon === 'loading'){return -1;}
                else{
                    if(['directory', 'link'].indexOf(fileA.type) === -1 && ['directory', 'link'].indexOf(fileB.type) !== -1){
                        return +1;
                    }else if(['directory', 'link'].indexOf(fileA.type) !== -1 && ['directory', 'link'].indexOf(fileB.type) === -1){
                        return -1;
                    }else{
                        if(fileA.name[0] === "." && fileB.name[0] !== ".") return +1;
                        else if(fileA.name[0] !== "." && fileB.name[0] === ".") return -1;
                        else{
                            if(fileA.name.toLowerCase() === fileB.name.toLowerCase()){
                                return fileA.name > fileB.name ? +1 : -1;
                            }
                            return fileA.name.toLowerCase() > fileB.name.toLowerCase() ? +1 : -1;
                        }
                    }
                }
            });
        }
        function sortByName(files){
            return files.sort((fileA, fileB) => {
                if(fileA.icon === 'loading' && fileB.icon !== 'loading'){return +1;}
                else if(fileA.icon !== 'loading' && fileB.icon === 'loading'){return -1;}
                else{
                    if(fileA.name[0] === "." && fileB.name[0] !== ".") return +1;
                    else if(fileA.name[0] !== "." && fileB.name[0] === ".") return -1;
                    else{
                        if(fileA.name.toLowerCase() === fileB.name.toLowerCase()){
                            return fileA.name > fileB.name ? +1 : -1;
                        }
                        return fileA.name.toLowerCase() > fileB.name.toLowerCase() ? +1 : -1;
                    }
                }
            });
        }
        function sortByDate(files){
            return files.sort((fileA, fileB) => {
                if(fileA.icon === 'loading' && fileB.icon !== 'loading'){return +1;}
                else if(fileA.icon !== 'loading' && fileB.icon === 'loading'){return -1;}
                else{
                    if(fileB.time === fileA.time){
                        return fileA.name > fileB.name ? +1 : -1;
                    }
                    return fileB.time - fileA.time;
                }
            });
        }
    }

    onComponentPropsUpdate(props){
        this.setState({access_right: this._findAccessRight(props.files)});
    }

    render() {
        return this.props.connectDropFile(
            <div className="component_filesystem">
              <Container>
                <NewThing path={this.props.path} sort={this.state.sort} onSortUpdate={(value) => {this.setState({sort: value})}} accessRight={this.state.access_right}></NewThing>
                <NgIf cond={this.props.fileIsOver}>
                  <FileZone path={this.props.path} />
                </NgIf>
                <NgIf className="list" cond={this.props.files.length > 0}>
                  <ReactCSSTransitionGroup transitionName="filelist-item" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={200}>
                  {
                      this.sort(this.props.files, this.state.sort).map((file, index) => {
                          if(file.type === 'directory' || file.type === 'file' || file.type === 'link' || file.type === 'bucket'){
                              return <ExistingThing key={file.name+(file.icon || '')} file={file} path={this.props.path} />
                          }
                      })
                  }
                  </ReactCSSTransitionGroup>
                </NgIf>
                <NgIf className="error" cond={this.props.files.length === 0 && !this.state.creating}>
                  There is nothing here
                </NgIf>
              </Container>
            </div>
        );
    }
}

FileSystem.PropTypes = {
    path: PropTypes.string.isRequired,
    files: PropTypes.array.isRequired
}
