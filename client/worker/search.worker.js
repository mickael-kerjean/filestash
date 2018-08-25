import { Observable } from 'rxjs/Observable';
import { cache } from '../helpers/cache';

let current_search = null;

self.onmessage = function(message){
    if(message.data.action === "search::find"){
        if(current_search != null){
            current_search.unsubscribe();
        }
        current_search = Search(message.data.path, message.data.keyword).subscribe((a) => {
            self.postMessage({type: "search::found", files: a});
        }, null, () => {
            self.postMessage({type: "search::completed"})
        });
    }
}

function Search(path, keyword){
    let results = [];
    return new Observable((obs) => {
        obs.next(results);
        const keys = keyword.split(" ").map((e) => e.toLowerCase());
        cache.fetchAll((record) => {
            const found = record.results.filter((file) => {
                for(let i=0, l=keys.length; i<l; i++){
                    if(file.name.toLowerCase().indexOf(keys[i]) === -1) return false;
                }
                return true;
            });
            if(found.length > 0){
                results = results.concat(found);
                obs.next(results);
            }
        }, cache.FILE_PATH, path).then(() => {
            obs.complete(results);
        });
    });
}




function Indexing(config){
    return;
}
