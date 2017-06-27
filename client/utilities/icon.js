import React from 'react';

export const Icon = (props) => {
    let url;
    if(props.name === 'directory'){
        url = "/img/folder.svg";
    }else if(props.name === 'file'){
        url = "/img/file.svg";
    }else if(props.name === 'loader'){
        url = "/img/loader.svg";
    }else if(props.name === 'save'){
        url = "/img/save.svg";
    }else if(props.name === 'power'){
        url = "/img/power.svg";
    }else if(props.name === 'edit'){
        url = "/img/edit.svg";
    }else if(props.name === 'delete'){
        url = "/img/delete.svg";
    }else if(props.name === 'bucket'){
        url = "/img/bucket.svg";
    }else if(props.name === 'link'){
        url = "/img/link.svg";
    }else if(props.name === 'loading'){
        url = "/img/loader.svg";
    }else if(props.name === 'download'){
        url = "/img/download.svg";
    }else if(props.name === 'play'){
        url = "/img/play.svg";
    }else if(props.name === 'pause'){
        url = "/img/pause.svg";
    }else if(props.name === 'error'){
        url = "/img/error.svg";
    }else if(props.name === 'loading_white'){
        url = "/img/loader_white.svg";
    }else{
        throw('unknown icon');
    }
    let style = props.style || {};
    style.verticalAlign = 'bottom';
    style.maxHeight = '100%';
    return (
        <img onClick={props.onClick} src={url} alt={props.name} style={style}/>
    );
}
