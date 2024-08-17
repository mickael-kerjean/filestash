interface Window {
    pdfjsLib: {
        getDocument: (url: string) => { promise: Promise<any> };
        GlobalWorkerOptions: {
            workerSrc: string;
        };
        // Add other properties and methods of pdfjsLib as needed
    };
    env?: string;
    chrome: object;
}

export default function(any): void;