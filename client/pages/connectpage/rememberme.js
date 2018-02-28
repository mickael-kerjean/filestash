import React from 'react';
import './rememberme.scss';

export const RememberMe = (props) => {
    return (
        <label className="no-select component_rememberme">
            <input checked={props.state} onChange={(e) => props.onChange(e.target.checked)} type="checkbox"/> Remember me
        </label>
    );
};
