// taken from https://reacttraining.com/react-router/web/guides/code-splitting
import React from 'react';
import Path from 'path';
import load from "little-loader";

export class Bundle extends React.Component {
    state = { mod: null };

    componentWillMount() {
        this.load(this.props)
    }

    componentWillReceiveProps(nextProps) {
        if(nextProps.load !== this.props.load){ this.load(nextProps) }
    }

    load(props) {
        this.setState({
            mod: null
        });
        Promise.all(
            [props.loader].concat(
                (props.overrides || []).map((src) => loadAsPromise(src))
            )
        ).then((m) => {
            const _mod = m[0];
            this.setState({
                mod: function(mod){
                    if(mod['default']){
                        return mod.default;
                    }else if(mod['__esModule'] === true){
                        return mod[props.symbol] ? mod[props.symbol] : null;
                    }else{
                        return mod;
                    }
                }(_mod)
            });
        }).catch((err) => {
            console.warn(err)
        });
    }

    render() {
        return this.state.mod ? this.props.children(this.state.mod) : null
    }
}


function loadAsPromise(src){
    return new Promise((done, error) => {
        load(src, function(err){
            if(err){
                error(err);
                return;
            }
            done();
        })
    });
}
