import React from 'react';
import PropTypes from 'prop-types';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import { DropTarget } from 'react-dnd';

import Path from 'path';

import "./filesystem.scss";
import { Container, NgIf, Icon } from '../../components/';
import { NewThing } from './thing-new';
import { ExistingThing } from './thing-existing';
import { FileZone } from './filezone';

@DropTarget('__NATIVE_FILE__', {}, (connect, monitor) => ({
    connectDropFile: connect.dropTarget(),
    fileIsOver: monitor.isOver()
}))
export class FileSystem extends React.PureComponent {
    render() {
        return this.props.connectDropFile(
            <div className="component_filesystem">
              <Container>
                <NewThing path={this.props.path} sort={this.props.sort} view={this.props.view} onViewUpdate={(value) => this.props.onView(value)} onSortUpdate={(value) => {this.props.onSort(value);}} accessRight={this.props.metadata || {}}></NewThing>
                <NgIf cond={this.props.fileIsOver && this.props.metadata.can_upload !== false}>
                  <FileZone path={this.props.path} />
                </NgIf>
                <NgIf className="list" cond={this.props.files.length > 0}>
                  <ReactCSSTransitionGroup transitionName="filelist-item" transitionLeave={false} transitionEnter={false} transitionAppear={true} transitionAppearTimeout={200}>
                  {
                      this.props.files.map((file, index) => {
                          if(file.type === 'directory' || file.type === 'file' || file.type === 'link' || file.type === 'bucket'){
                              return ( <ExistingThing view={this.props.view} key={file.name+file.path+(file.icon || '')} file={file} path={this.props.path} metadata={this.props.metadata || {}} /> );
                          }
                      })
                  }
                  </ReactCSSTransitionGroup>
                </NgIf>
                <NgIf className="error" cond={this.props.files.length === 0}>
                  <p className="empty_image">
                    <Icon name="file"/>
                  </p>
                  <p>There is nothing here</p>
                </NgIf>
              </Container>
            </div>
        );
    }
}

FileSystem.propTypes = {
    path: PropTypes.string.isRequired,
    files: PropTypes.array.isRequired,
    metadata: PropTypes.object.isRequired,
    sort: PropTypes.string.isRequired,
    view: PropTypes.string.isRequired,
    onView: PropTypes.func.isRequired,
    onSort: PropTypes.func.isRequired
};
