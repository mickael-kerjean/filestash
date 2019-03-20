import React from 'react';
import { Link, withRouter } from 'react-router-dom';

import { Files } from '../../model/';
import { sort } from '../../pages/filespage.helper.js';
import { Icon, NgIf, EventReceiver, EventEmitter } from '../../components/';
import { dirname, basename, settings_get, getMimeType, debounce, gid, appendShareToUrl } from '../../helpers/';
import './pager.scss';


@EventEmitter
@EventReceiver
@withRouter
export class Pager extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            files: [],
            n: 0
        };
        this.onKeyPress = this.onKeyPress.bind(this);
        this.onSubmitDebounced = debounce(this.onFormSubmit.bind(this), 1000);
    }

    componentDidMount(){
        this.setNavigation(this.props);
        window.addEventListener("keyup", this.onKeyPress);
        this.props.subscribe('media::next', () => {
            this.navigatePage(this.calculateNextPageNumber(this.state.n));
        });
        this.props.subscribe('media::previous', () => {
            this.navigatePage(this.calculatePrevPageNumber(this.state.n));
        });
    }

    componentWillReceiveProps(props){
        if(props.path !== this.props.path){
            this.setNavigation(props);
        }
    }

    componentWillUnmount(){
        window.removeEventListener("keyup", this.onKeyPress);
        this.props.unsubscribe('media::next');
        this.props.unsubscribe('media::previous');
        this.hasUnmounted = true;
    }

    navigatePage(n){
        if(this.state.files[n]){
            const url = appendShareToUrl(this.state.files[n].link);
            if(this.refs.$page) this.refs.$page.blur();
            let preload_index = (n >= this.state.n || (this.state.n === this.state.files.length - 1 && n === 0)) ? this.calculateNextPageNumber(n) : this.calculatePrevPageNumber(n);
            Files.url(this.state.files[preload_index].path)
                .then((url) => this.props.emit("media::preload", url))
                .then(() => this.props.history.push(url))
                .catch(() => {});
        }
    }
    calculateNextPageNumber(n){
        if(n + 1 >= this.state.files.length) return 0;
        return n + 1;
    }
    calculatePrevPageNumber(n){
        if(n <= 0) return this.state.files.length - 1;
        return n - 1;
    }

    setNavigation(props){
        Files._ls_from_cache(dirname(props.path))
            .then((f) => {
                if(f === null) return Promise.reject({code: "NO_DATA"});
                return Promise.resolve(f);
            })
            .then((f) => f.results.filter((file) => (isImage(file.name) || isVideo(file.name)) && file.type === "file"))
            .then((f) => sort(f, settings_get('filespage_sort') || 'type'))
            .then((f) => findPosition(f, basename(props.path)))
            .then((res) => {
                if(this.hasUnmounted === true) return;
                if(this.props.pageChange) this.props.pageChange(res[0]);
                this.setState({
                    files: res[0],
                    n: res[1]
                });
            })
            .catch(() => {});

        const findPosition = (files, filename) => {
            let i;
            for(i=0; i < files.length; i++){
                if(files[i].name === filename){
                    break;
                }
            }
            return [files, i];
        };
        const isVideo = (filename) => {
            return getMimeType(filename).split("/")[0] === "video";
        };
        const isImage = (filename) => {
            return getMimeType(filename).split("/")[0] === "image";
        };
    }

    onFormInputChange(e){
        let n = parseInt(e.target.value);
        if(Number.isNaN(n)) n = undefined;
        else if(n < 1) n = 0;
        else if(n > this.state.files.length) n = this.state.files.length - 1;
        else{ n = n - 1; }
        this.setState({n: n});
        if(n >= 0){
            this.onSubmitDebounced();
        }
    }

    onFormSubmit(e){
        if(e) e.preventDefault();
        this.navigatePage(this.state.n);
    }

    onKeyPress(e){
        if(e.target.classList.contains("prevent")) return;
        if(e.keyCode === 39){
            this.navigatePage(this.calculateNextPageNumber(this.state.n));
        }else if(e.keyCode === 37){
            this.navigatePage(this.calculatePrevPageNumber(this.state.n));
        }
    }

    render(){
        let inputWidth = this.state.n === undefined ? 12 : ((this.state.n + 1).toString().length) * 12;
        const nextLink = () => {
            const l = this.state.files[this.calculateNextPageNumber(this.state.n)];
            return (((l && l.link) || "") + window.location.search) || '#';
        };
        const prevLink = () => {
            const l = this.state.files[this.calculatePrevPageNumber(this.state.n)];
            return (((l && l.link) || "") + window.location.search) || '#';
        };
        const current_page_number = this.state.n === undefined ? "" : this.state.n + 1;
        return (
            <div className="component_pager">
              <div className="wrapper no-select">
                <NgIf cond={this.state.files.length > 0} type="inline">
                  <Link to={prevLink()}><Icon name="arrow_left_white"/></Link>
                  <label className="pager">
                    <form onSubmit={this.onFormSubmit.bind(this)}>
                      <input ref="$page" className="prevent" type="number" style={{width: inputWidth+"px"}} onChange={this.onFormInputChange.bind(this)} value={current_page_number} />
                    </form>
                    <span className="separator">/</span>
                    <span ref="$total">{this.state.files.length}</span>
                  </label>
                  <Link to={nextLink()}><Icon name="arrow_right_white"/></Link>
                </NgIf>
              </div>
            </div>
        );
    }
}
