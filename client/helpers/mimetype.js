import Path from 'path';

export function getMimeType(file){
    let ext = Path.extname(file).replace(/^\./, '').toLowerCase();
    let mime = CONFIG.mime[ext];
    if(mime){
        return mime;
    }else{
        return 'text/plain';
    }
}

export function opener(file){
    let mime = getMimeType(file);
    if(mime.split('/')[0] === 'text'){
        return 'editor';
    }else if(mime === 'application/pdf'){
        return 'pdf';
    }else if(mime.split('/')[0] === 'image'){
        return 'image';
    }else if(['application/javascript', 'application/xml', 'application/json', 'application/x-perl'].indexOf(mime) !== -1){
        return 'editor';
    }else if(['audio/wav', 'audio/mp3', 'audio/flac', 'audio/ogg'].indexOf(mime) !== -1){
        return 'audio';
    }else if(mime.split('/')[0] === 'video'){
        return 'video';
    }else if(mime.split('/')[0] === "application")
        return 'download';
    else{
        return 'editor';
    }
}
