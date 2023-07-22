class Icon extends HTMLElement {
    constructor() {
        super();
    }

    static get observedAttributes() {
        return ["name"];
    }

    attributeChangedCallback() {
        const alt = this.getAttribute("name");
        const img = this._mapOfIcon(alt);
        this.innerHTML = this.render({ alt, img });
    }

    render({ alt, img }) {
        return `<img
                    class="component_icon"
                    draggable="false"
                    src="${img}"
                    alt="${name}" />`;
    }

    _mapOfIcon(name) {
        switch(name) {
        case "arrow_right":
            return "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPHBhdGggc3R5bGU9ImZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MC41MzMzMzMzNiIgZD0iTTguNTkgMTYuMzRsNC41OC00LjU5LTQuNTgtNC41OUwxMCA1Ljc1bDYgNi02IDZ6IiAvPgogIDxwYXRoIGZpbGw9Im5vbmUiIGQ9Ik0wLS4yNWgyNHYyNEgweiIgLz4KPC9zdmc+Cg==";
        case "loading":
            return "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB3aWR0aD0nMTIwcHgnIGhlaWdodD0nMTIwcHgnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIiBjbGFzcz0idWlsLXJpbmctYWx0Ij4KICA8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0ibm9uZSIgY2xhc3M9ImJrIj48L3JlY3Q+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIHN0cm9rZT0ibm9uZSIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48L2NpcmNsZT4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgc3Ryb2tlPSIjNmY2ZjZmIiBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+CiAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJzdHJva2UtZGFzaG9mZnNldCIgZHVyPSIycyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIGZyb209IjAiIHRvPSI1MDIiPjwvYW5pbWF0ZT4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9InN0cm9rZS1kYXNoYXJyYXkiIGR1cj0iMnMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIiB2YWx1ZXM9IjE1MC42IDEwMC40OzEgMjUwOzE1MC42IDEwMC40Ij48L2FuaW1hdGU+CiAgPC9jaXJjbGU+Cjwvc3ZnPgo=";
        }
    }
}

customElements.define("component-icon", Icon);
