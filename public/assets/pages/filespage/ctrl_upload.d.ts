interface HttpContext {
    xhr: XMLHttpRequest;
}

declare function executeHttp(
    this: HttpContext,
    url: string,
    options: {
        method: string;
        headers: Record<string, string>;
        body: any;
        progress: (event: ProgressEvent) => void;
        speed: (event: ProgressEvent) => void;
    }
): Promise<any>;

export function init();

export default function(any): void;