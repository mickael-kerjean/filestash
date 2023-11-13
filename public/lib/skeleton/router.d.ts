export function init($root: HTMLElement): Promise<void>;

export function navigate(href: string);

export function currentRoute(r: object, notFoundRoute: string);