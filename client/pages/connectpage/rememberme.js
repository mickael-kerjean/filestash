import React from 'react';
import { t } from '../../locales/';
import './rememberme.scss';

export const RememberMe = (props) => {
    if(CONFIG.remember_me !== false){
        return (
            <label className="no-select component_rememberme">
              <input checked={props.state} onChange={(e) => props.onChange(e.target.checked)} type="checkbox"/> { t("Remember me") }
            </label>
        );
    }
    return null;
};
