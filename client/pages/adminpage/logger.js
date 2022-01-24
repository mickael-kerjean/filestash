import React, { useState, useEffect, useRef } from "react";
import { FormBuilder, Loader, Button } from "../../components/";
import { Config, Log } from "../../model/";
import { FormObjToJSON, notify, format, nop } from "../../helpers/";
import { t } from "../../locales/";

import "./logger.scss";

export function LogPage({ isSaving = nop }) {
    const [log, setLog] = useState("");
    const [form, setForm] = useState({});
    const [config, setConfig] = useState({});
    const $log = useRef();
    const filename = () => {
        const t = new Date().toISOString().substring(0, 10).replace(/-/g, "");
        return `access_${t}.log`;
    };
    const onChange = (r) => {
        const c = Object.assign({}, config);
        c["log"] = r[""]["params"];
        c["connections"] = window.CONFIG.connections;
        delete c["constant"];
        isSaving(true);
        Config.save(c, true, () => {
            isSaving(false);
        }, () => {
            isSaving(false);
            notify.send(err && err.message || t("Oops"), "error");
        });
    };
    const fetchLogs = () => {
        Log.get(1024*100).then((log) => { // get only the last 100kb of log
            setLog(log + "\n\n\n\n\n");
            if ($log.current.scrollTop === 0) {
                $log.current.scrollTop = $log.current.scrollHeight;
            }
        }).catch((err) => {
            setLog(err && err.message || t("Oops"));
        });
    };

    useEffect(() => {
        Config.all().then((config) => {
            setForm({ "": { "params": config["log"] } });
            setConfig(FormObjToJSON(config));
        });
        fetchLogs();
        const id = setInterval(fetchLogs, 5000);
        return () => {
            clearInterval(id);
            Config.clear();
            isSaving(false);
        };
    }, []);

    return (
        <div className="component_logpage">
            <h2>Logging</h2>
            <div style={{ minHeight: "150px" }}>
                <FormBuilder
                    form={form}
                    onChange={onChange}
                    render={ ($input, props, struct, onChange) => (
                        <label className={"no-select input_type_" + props.params["type"]}>
                            <div>
                                <span>
                                    { format(struct.label) }:
                                </span>
                                <div style={{ width: "100%" }}>
                                    { $input }
                                </div>
                            </div>
                            <div>
                                <span className="nothing"></span>
                                <div style={{ width: "100%" }}>
                                    {
                                        struct.description && (
                                            <div className="description">{struct.description}</div>
                                        )
                                    }
                                </div>
                            </div>
                        </label>
                    )} />
            </div>
            <pre style={{ height: "350px" }} ref={$log}>
                { log === "" ? <Loader/> : log }
            </pre>
            <div>
                <a href={Log.url()} download={filename()}>
                    <Button className="primary">{ t("Download") }</Button>
                </a>
            </div>
        </div>
    );
}
