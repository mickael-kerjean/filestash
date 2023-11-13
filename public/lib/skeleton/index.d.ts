import { onDestroy } from "./lifecycle";
import { navigate } from "./router";

export default function($root: HTMLElement | null, routes: object, opts: object);

export function createElement(str: string): HTMLElement;

export function createRender($parent: HTMLElement | null): ($page: HTMLElement) => void;

export function nop(): void

export { onDestroy, navigate };
