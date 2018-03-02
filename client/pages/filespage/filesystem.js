import React from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import Path from 'path';

import { Container, NgIf } from '../../components/';
import { NewThing } from './newthing';
import { ExistingThing } from './existingthing';
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
                let idA = ['deleting', 'moving'].indexOf(fileA.state),
                    idB = ['deleting', 'moving'].indexOf(fileB.state);

                if(idA !== -1 && idB !== -1){ return 0; }
                else if(idA !== -1 && idB === -1){ return +1; }
                else if(idA === -1 && idB !== -1){ return -1; }
                else{
                    if(['directory', 'link'].indexOf(fileA.type) !== -1 && ['directory', 'link'].indexOf(fileB.type) !== -1 ){ return 0; }
                    else if(['directory', 'link'].indexOf(fileA.type) !== -1 && ['directory', 'link'].indexOf(fileB.type) === -1){ return -1; }
                    else if(['directory', 'link'].indexOf(fileA.type) === -1 && ['directory', 'link'].indexOf(fileB.type) !== -1){ return +1; }
                    else{ return fileA.name.toLowerCase() > fileB.name.toLowerCase();  }
                }
            });
        }
        function sortByName(files){
            return files.sort((fileA, fileB) => {
                let idA = ['deleting', 'moving'].indexOf(fileA.state),
                    idB = ['deleting', 'moving'].indexOf(fileB.state);

                if(idA !== -1 && idB !== -1){ return 0; }
                else if(idA !== -1 && idB === -1){ return +1; }
                else if(idA === -1 && idB !== -1){ return -1; }
                else{ return fileA.name.toLowerCase() > fileB.name.toLowerCase(); }
            });
        }
        function sortByDate(files){
            return files.sort((fileA, fileB) => {
                let idA = ['deleting', 'moving'].indexOf(fileA.state),
                    idB = ['deleting', 'moving'].indexOf(fileB.state);

                if(idA !== -1 && idB !== -1){ return 0; }
                else if(idA !== -1 && idB === -1){ return +1; }
                else if(idA === -1 && idB !== -1){ return -1; }
                else{ return fileB.time - fileA.time; }
            });
        }
    }

    onComponentPropsUpdate(props){
        this.setState({access_right: this._findAccessRight(props.files)});
    }

    render() {
        return this.props.connectDropFile(
            <div style={{height: '100%'}}>
              <Container style={{height: '100%'}}>
                <NewThing path={this.props.path} sort={this.state.sort} onSortUpdate={(value) => {this.setState({sort: value})}} accessRight={this.state.access_right}></NewThing>
                <NgIf cond={this.props.fileIsOver}>
                  <FileZone path={this.props.path} />
                </NgIf>
                <NgIf cond={this.props.files.length > 0} style={{clear: 'both', paddingBottom: '15px'}}>
                  {
                      this.sort(this.props.files, this.state.sort).map((file, index) => {
                          if(file.type === 'directory' || file.type === 'file' || file.type === 'link' || file.type === 'bucket'){
                              return <ExistingThing key={file.name} file={file} path={this.props.path} />
                          }
                      })
                  }
                </NgIf>
                <NgIf cond={this.props.files.length === 0 && !this.state.creating} style={{fontSize: '25px', textAlign: 'center', fontWeight: '100', marginTop: '50px'}}>
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
