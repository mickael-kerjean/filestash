import React, { useState, useEffect, useRef, useCallback } from "react";
import { FormBuilder, Loader, Button, Icon } from "../../components/";
import { Config, Log, Audit } from "../../model/";
import { FormObjToJSON, notify, format, nop, debounce } from "../../helpers/";
import { t } from "../../locales/";

import "./logger.scss";

export function LogPage({ isSaving = nop }) {

    return (
        <div className="component_logpage">
            <h2>Logging</h2>
            <LogComponent isSaving={isSaving} />

            <h2>Activity Report</h2>
            <AuditComponent />
        </div>
    );
}



const formRender = ($input, props, struct, onChange) => (
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
);

function LogComponent({ isSaving }) {
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
        <React.Fragment>
            <div style={{ minHeight: "150px" }}>
                <FormBuilder
                    form={form}
                    onChange={onChange}
                    render={formRender} />
            </div>
            <pre style={{ height: "350px" }} ref={$log}>
                { log === "" ? <Loader/> : log }
            </pre>
            <div>
                <a href={Log.url()} download={filename()}>
                    <Button className="primary">Download</Button>
                </a>
            </div>
        </React.Fragment>
    );
}


function AuditComponent() {
    const [loading, setLoading] = useState(false);
    const [formSpec, setFormSpec] = useState(null);
    const [searchParams, setSearchParams] = useState({});
    const [debouncedSearchParams, setDebouncedSearchParams] = useState({});
    const [render, setRender] = useState(null);

    const onChange = (a) => {
        const sp = {};
        const formBlocks = Object.keys(a[""]);
        for(let i=0; i<formBlocks.length; i++) {
            let params = Object.keys(a[""][formBlocks[i]]);
            for(let j=0; j<params.length; j++) {
                const key = params[j];
                const value = a[""][formBlocks[i]][params[j]];
                if(value !== null && value !== "") sp[key] = value;
            }
        }
        setSearchParams(sp);
        debouncedSetSearchParams(sp);
        setLoading(true);
    };

    const debouncedSetSearchParams = useCallback(debounce((a) => {
        setDebouncedSearchParams(a);
    }, 1000), []);

    useEffect(() => {
        setLoading(true);
        const ctrl = new AbortController();
        Audit.get(searchParams, ctrl).then(([form, html]) => {
            setLoading(false);
            if(formSpec === null) setFormSpec({ "": form });
            setRender(html);
        }).catch((err) => {
            if(err.code === "ABORTED") return;
            setLoading(false);
            setRender(err.message);
        });
        return () => ctrl.abort();
    }, [debouncedSearchParams]);

    return (
        <div className="component_audit">
            {
                formSpec && (
                    <FormBuilder
                        form={formSpec}
                        onChange={onChange}
                        render={formRender} />
                )
            }

            <div style={{minHeight: "200px"}}>
                {
                    loading ? (
                        <div className="center"><Icon name="loading" /></div>
                    ) : (
                        <div dangerouslySetInnerHTML={{ __html: render }}></div>
                    )
                }
            </div>
        </div>
    )
}
