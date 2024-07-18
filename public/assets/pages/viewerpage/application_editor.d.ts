interface Window {
    CodeMirror: {
        (element: HTMLElement, options: any): any;
        __mode: string;
        commands: {
            save: (editor: any) => void;
        };
    };
}