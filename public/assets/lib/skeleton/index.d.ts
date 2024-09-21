import { onDestroy } from "./lifecycle";
import { navigate } from "./router";

export default function($root: HTMLElement | null, routes: object, opts: object);

export function createElement(str: string): HTMLElement;

export function createFragment(str: string): DocumentFragment;

export function createRender($parent: HTMLElement | null): (HTMLElement) => void;

export function nop(): void

export { onDestroy, navigate };
