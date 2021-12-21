import React, { useState, useEffect, useRef } from "react";

import { Input, Button, Container, Icon } from "../../components/";
import { Admin } from "../../model/";
import { nop } from "../../helpers/";
import { t } from "../../locales/";

export function LoginPage({ reload = nop }) {
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const $input = useRef(null);
    const marginTop = () => ({ marginTop: `${parseInt(window.innerHeight / 3)}px` });
    const authenticate = (e) => {
        e.preventDefault();
        setIsLoading(true);
        Admin.login($input.current.ref.value)
            .then(() => reload())
            .catch(() => {
                $input.current.ref.value = "";
                setIsLoading(false);
                setHasError(true);
                setTimeout(() => {
                    setHasError(false);
                }, 500);
            });
    };

    useEffect(() => {
        $input.current.ref.focus();
    }, []);

    return (
        <Container maxWidth="300px" className="sharepage_component">
            <form className={hasError ? "error" : ""}
                onSubmit={authenticate} style={marginTop()}>
                <Input ref={$input} type="password" placeholder={ t("Password") } />
                <Button theme="transparent">
                    <Icon name={isLoading ? "loading" : "arrow_right"}/>
                </Button>
            </form>
        </Container>
    );
}
