export function init($root: HTMLElement): Promise<void>;

export function navigate(href: string);

export function currentRoute(r: object, notFoundRoute: string);

export function base();

export function fromHref(h: string): string;

export function toHref(h: string): string;