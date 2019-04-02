import React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend-filedrop';

import './filespage.scss';
import './error.scss';
import { Files } from '../model/';
import { sort, onCreate, onRename, onDelete, onUpload, onSearch } from './filespage.helper';
import { NgIf, Loader, EventReceiver, LoggedInOnly, ErrorPage } from '../components/';
import { notify, debounce, goToFiles, goToViewer, event, settings_get, settings_put } from '../helpers/';
import { BreadCrumb, FileSystem, FrequentlyAccess, Submenu } from './filespage/';
import InfiniteScroll from 'react-infinite-scroller';

const PAGE_NUMBER_INIT = 2;
const LOAD_PER_SCROLL = 48;

// usefull when user press the back button while keeping the current context
let LAST_PAGE_PARAMS = {
    path: null,
    scroll: 0,
    page_number: PAGE_NUMBER_INIT
};

@ErrorPage
@LoggedInOnly
@EventReceiver
@DragDropContext(HTML5Backend)
export class FilesPage extends React.Component {
    constructor(props){
        super(props);
        if(props.match.url.slice(-1) != "/"){
            this.props.history.push(props.match.url + "/");
        }
        this.state = {
            path: props.match.url.replace('/files', '').replace(/%23/g, "#") || '/',
            sort: settings_get('filespage_sort') || 'type',
            sort_reverse: true,
            show_hidden: settings_get('filespage_show_hidden') || CONFIG["display_hidden"],
            view: settings_get('filespage_view') || 'grid',
            files: [],
            search_loading: false,
            metadata: null,
            frequents: null,
            page_number: PAGE_NUMBER_INIT,
            loading: true
        };

        this.observers = [];
        this.toggleHiddenFilesVisibilityonCtrlK = this.toggleHiddenFilesVisibilityonCtrlK.bind(this);
    }

    componentDidMount(){
        this.onRefresh(this.state.path, 'directory');

        // subscriptions
        this.props.subscribe('file.create', function(){
            return onCreate.apply(this, arguments).then(() => {
                if(this.state.metadata && this.state.metadata.refresh_on_create === true){
                    this.onRefresh(this.state.path, 'directory')
                }
                return Promise.resolve()
            });
        }.bind(this));
        this.props.subscribe('file.upload', onUpload.bind(this));
        this.props.subscribe('file.rename', onRename.bind(this));
        this.props.subscribe('file.delete', onDelete.bind(this));
        this.props.subscribe('file.refresh', this.onRefresh.bind(this));
        window.addEventListener('keydown', this.toggleHiddenFilesVisibilityonCtrlK);
    }

    componentWillUnmount() {
        this.props.unsubscribe('file.upload');
        this.props.unsubscribe('file.create');
        this.props.unsubscribe('file.rename');
        this.props.unsubscribe('file.delete');
        this.props.unsubscribe('file.refresh');
        window.removeEventListener('keydown', this.toggleHiddenFilesVisibilityonCtrlK);
        this._cleanupListeners();

        LAST_PAGE_PARAMS.path = this.state.path;
        LAST_PAGE_PARAMS.scroll = this.refs.$scroll.scrollTop;
        LAST_PAGE_PARAMS.page_number = this.state.page_number;
    }

    componentWillReceiveProps(nextProps){
        let new_path = function(path){
            if(path === undefined){ path = "/"; }
            if(/\/$/.test(path) === false){ path = path + "/"; }
            if(/^\//.test(path) === false){ path = "/"+ path; }
            return path;
        }((nextProps.match.params.path || "").replace(/%23/g, "#"));
        if(new_path !== this.state.path){
            this.setState({path: new_path, loading: true});
            this.onRefresh(new_path);
        }
    }

    toggleHiddenFilesVisibilityonCtrlK(e){
        if(e.keyCode === 72 && e.ctrlKey === true){
            e.preventDefault();
            this.setState({show_hidden: !this.state.show_hidden}, () => {
                settings_put('filespage_show_hidden', this.state.show_hidden);
                if(!!this.state.show_hidden){
                    notify.send("Display hidden files", 'info');
                }else{
                    notify.send("Hide hidden files", 'info');
                }
            });
            this.onRefresh();
        }
    }

    onRefresh(path = this.state.path){
        this._cleanupListeners();
        const observer = Files.ls(path).subscribe((res) => {
            if(res.status === 'ok'){
                let files = new Array(res.results.length);
                for(let i=0,l=res.results.length; i<l; i++){
                    let path = this.state.path+res.results[i].name;
                    path = path.replace(/#/g, "%23");
                    if(this.state.show_hidden === false && res.results[i].name[0] === "."){
                        continue;
                    }
                    files[i] = res.results[i];
                    files[i].link = res.results[i].type === "file" ? "/view"+path : "/files"+path+"/";
                }
                this.setState({
                    metadata: res.metadata,
                    files: sort(files, this.state.sort),
                    loading: false,
                    page_number: function(){
                        if(this.state.path === LAST_PAGE_PARAMS.path){
                            return LAST_PAGE_PARAMS.page_number;
                        }
                        return PAGE_NUMBER_INIT;
                    }.bind(this)()
                }, () => {
                    if(this.state.path === LAST_PAGE_PARAMS.path){
                        this.refs.$scroll.scrollTop = LAST_PAGE_PARAMS.scroll;
                    }
                });
            }else{
                notify.send(res, 'error');
            }
        }, (error) => {
            this.props.error(error);
        });
        this.observers.push(observer);
        if(path === "/"){
            Files.frequents().then((s) => this.setState({frequents: s}));
        }
    }

    _cleanupListeners(){
        if(this.observers.length > 0) {
            this.observers = this.observers.filter((observer) => {
                observer.unsubscribe();
                return false;
            });
        }
    }

    onSort(_sort){
        settings_put('filespage_sort', _sort);
        const same_sort = _sort === this.state.sort;
        this.setState({
            sort: _sort
        }, () => {
            requestAnimationFrame(() => {
                let files = sort(this.state.files, _sort);
                if(same_sort && this.state.sort_reverse) files = files.reverse();
                this.setState({
                    page_number: PAGE_NUMBER_INIT,
                    sort_reverse: same_sort ? !this.state.sort_reverse : true,
                    files: files
                });
            });
        });
    }

    onView(){
        const _view = this.state.view === "list" ? "grid" : "list";
        settings_put('filespage_view', _view);
        this.setState({
            view: _view
        }, () => {
            requestAnimationFrame(() => {
                this.setState({
                    page_number: PAGE_NUMBER_INIT
                });
            });
        });
    }

    onSearch(search){
        if(search == null || search.length === 0){
            this.onRefresh();
            return;
        }
        if(search.length < 2){
            return;
        }
        if(this._search){
            this._search.unsubscribe();
        }
        this._search = onSearch(search, this.state.path).subscribe((f) => {
            this.setState({
                files: f || [],
                metadata: {
                    can_rename: false,
                    can_delete: false,
                    can_share: false
                }
            });
        });
    }

    loadMore(){
        requestAnimationFrame(() => {
            let page_number = this.state.page_number + 1;
            this.setState({page_number: page_number});
        });
    }

    render() {
        let $moreLoading = ( <div className="infinite_scroll_loading" key={-1}><Loader/></div> );
        if(this.state.files.length <= this.state.page_number * LOAD_PER_SCROLL){
            $moreLoading = null;
        }
        return (
            <div className="component_page_filespage">
              <BreadCrumb className="breadcrumb" path={this.state.path} />
              <div className="page_container">
                <div ref="$scroll" className="scroll-y">
                  <InfiniteScroll pageStart={0} loader={$moreLoading} hasMore={this.state.files.length > 70}
                    initialLoad={false} useWindow={false} loadMore={this.loadMore.bind(this)} threshold={100}>
                    <NgIf className="container" cond={!this.state.loading}>
                      <NgIf cond={this.state.path === '/'}>
                        <FrequentlyAccess files={this.state.frequents} />
                      </NgIf>
                      <Submenu path={this.state.path} sort={this.state.sort} view={this.state.view} onSearch={this.onSearch.bind(this)} onViewUpdate={(value) => this.onView(value)} onSortUpdate={(value) => {this.onSort(value);}} accessRight={this.state.metadata || {}}></Submenu>
                      <NgIf cond={true}>
                        <FileSystem path={this.state.path} sort={this.state.sort} view={this.state.view}
                                    files={this.state.files.slice(0, this.state.page_number * LOAD_PER_SCROLL)}
                                    metadata={this.state.metadata || {}} onSort={this.onSort.bind(this)} onView={this.onView.bind(this)} />
                      </NgIf>
                    </NgIf>
                  </InfiniteScroll>
                  <NgIf cond={!!this.state.loading}>
                    <Loader/>
                  </NgIf>
                </div>
              </div>
              <div className="upload-footer">
                <div className="bar"></div>
              </div>
            </div>
        );
    }
}
