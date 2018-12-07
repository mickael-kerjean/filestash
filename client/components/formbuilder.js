import React from 'react';
import { Input, Select, Enabler } from './';
import { FormObjToJSON, bcrypt_password, format } from '../helpers/';

import "./formbuilder.scss";

export class FormBuilder extends React.Component {
    constructor(props){
        super(props);
    }

    section(struct, key, level = 0){
        if(struct == null) struct = "";
        const isALeaf = function(struct){
            if("label" in struct && "type" in struct &&
               "value" in struct && "default" in struct){
                return true;
            }
            return false;
        };

        if(Array.isArray(struct)) return null;
        else if(isALeaf(struct) === false){
            if(level <= 1){
                return (
                    <div className="formbuilder">
                      {
                          key ? <h2 className="no-select">{ format(key) }</h2> : ""
                      }
                      {
                          Object.keys(struct).map((key, index) => {
                              return (
                                  <div key={key+"-"+index}>
                                    { this.section(struct[key], key, level + 1) }
                                  </div>
                              );
                          })
                      }
                    </div>
                );
            }
            return (
                <div>
                  <fieldset>
                    <legend className="no-select">{ format(key) }</legend>
                    {
                        Object.keys(struct).map((key, index) => {
                            return (
                                <div key={key+"-"+index}>
                                  { this.section(struct[key], key, level + 1) }
                                </div>
                            );
                        })
                    }
                  </fieldset>
                </div>
            );
        }

        let id = {};
        let target = [];
        if(struct.id !== undefined){
            id.id = this.props.idx === undefined ? struct.id : struct.id + "_" + this.props.idx;
        }
        if(struct.type === "enable"){
            target = struct.target.map((target) => {
                return this.props.idx === undefined ? target : target + "_" + this.props.idx;
            });
        }

        const onChange = function(e, fn){
            struct.value = e;
            if(typeof fn === "function"){
                fn(struct);
            }
            this.props.onChange.call(
                this,
                FormObjToJSON(this.props.form)
            );
        };
        return ( <FormElement render={this.props.render} onChange={onChange.bind(this)} {...id} params={struct} target={target} name={ format(struct.label) } /> );
    }

    render(){
        return this.section(this.props.form || {});
    }
}


const FormElement = (props) => {
    const id = props.id !== undefined ? {id: props.id} : {};
    let struct = props.params;
    let $input = ( <Input onChange={(e) => props.onChange(e.target.value)} {...id} name={props.name} type="text" defaultValue={struct.value} placeholder={struct.placeholder} /> );
    switch(props.params["type"]){
    case "text":
        const onTextChange = (value) => {
            if(value === ""){
                value = null;
            }
            props.onChange(value);
        };
        $input = ( <Input onChange={(e) => onTextChange(e.target.value)} {...id} name={props.name} type="text" value={struct.value || ""} placeholder={struct.placeholder}/> );
        break;
    case "number":
        const onNumberChange = (value) => {
            value = value === "" ? null : parseInt(value);
            props.onChange(value);
        };
        $input = ( <Input onChange={(e) => onNumberChange(e.target.value)} {...id} name={props.name} type="number" value={struct.value || ""} placeholder={struct.placeholder} /> );
        break;
    case "password":
        const onPasswordChange = (value) => {
            if(value === ""){
                value = null;
            }
            props.onChange(value);
        };
        $input = ( <Input onChange={(e) => onPasswordChange(e.target.value)} {...id} name={props.name} type="password" value={struct.value || ""} placeholder={struct.placeholder} /> );
        break;
    case "bcrypt":
        const onBcryptChange = (value) => {
            if(value === ""){
                return props.onChange(null);
            }
            bcrypt_password(value).then((hash) => {
                props.onChange(hash);
            });
        };
        $input = ( <Input onChange={(e) => onBcryptChange(e.target.value)} {...id} name={props.name} type="password" value={struct.value || ""} placeholder={struct.placeholder} /> );
        break;
    case "hidden":
        $input = ( <Input name={props.name} type="hidden" defaultValue={struct.value} /> );
        break;
    case "boolean":
        $input = ( <Input onChange={(e) => props.onChange(e.target.checked)} {...id} name={props.name} type="checkbox" checked={struct.value === null ? !!struct.default : struct.value} /> );
        break;
    case "select":
        $input = ( <Select onChange={(e) => props.onChange(e.target.value)} {...id} name={props.name} choices={struct.options} value={struct.value === null ? struct.default : struct.value} placeholder={struct.placeholder} />);
        break;
    case "enable":
        $input = ( <Enabler onChange={(e) => props.onChange(e.target.checked)} {...id} name={props.name} target={props.target} defaultValue={struct.value === null ? struct.default : struct.value} /> );
        break;
    case "image":
        $input = ( <img {...id} src={props.value} /> );
        break;
    }

    if(props.render){
        return props.render($input, props, struct, props.onChange.bind(null, null));
    }

    return (
        <label className={"no-select input_type_" + props.params["type"]}>
          <div>
            <span>
              { format(struct.label) }:
            </span>
            <div style={{width: '100%'}}>
              { $input }
            </div>
          </div>
          <div>
            <span className="nothing"></span>
            <div style={{width: '100%'}}>
              { struct.description ? (<div className="description">{struct.description}</div>) : null }
            </div>
          </div>
        </label>
    );
};
