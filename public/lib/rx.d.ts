import { Observable, Observer } from "rx-core";

import {
    fromEvent, startWith,
    catchError, tap, first, of,
    map, mapTo, filter, mergeMap, EMPTY, empty,
    switchMapTo, switchMap,
    BehaviorSubject, Subject,
    pipe, share, toArray, distinctUntilChanged, from,
    combineLatest, shareReplay, repeat, interval, merge,
    debounceTime, delay, concatMap, distinct, scan, throwError,
} from "./vendor/rxjs.min.js";

import * as rxajax from "./vendor/rxjs-ajax.min.js";

declare const rxjs: {
    of: typeof of,
    from: typeof from,
    BehaviorSubject: typeof BehaviorSubject,
    Subject: typeof Subject,
    catchError: typeof catchError,
    combineLatest: typeof combineLatest,
    distinct: typeof distinct,
    shareReplay: typeof shareReplay,
    repeat: typeof repeat,
    first: typeof first,
    toArray: typeof toArray,
    startWith: typeof startWith,
    fromEvent: typeof fromEvent,
    delay: typeof delay,
    concatMap: typeof concatMap,
    debounceTime: typeof debounceTime,
    throwError: typeof throwError,
    interval: typeof interval,
    merge: typeof merge,
    tap: typeof tap,
    map: typeof map,
    mapTo: typeof mapTo,
    filter: typeof filter,
    mergeMap: typeof mergeMap,
    switchMapTo: typeof switchMapTo,
    switchMap: typeof switchMap,
    distinctUntilChanged: typeof distinctUntilChanged,
    EMPTY: typeof EMPTY,
    empty: typeof empty,
    pipe: typeof pipe,
    share: typeof share,
    scan: typeof scan,
};

export default rxjs;

export function ajax(opts: object);

export function effect(obs: Observer<any>): void;

export function applyMutation($node: HTMLElement, ...keys: string[]): typeof tap;

export function applyMutations($node: HTMLElement, ...keys: string[]): typeof tap;

export function stateMutation($node: HTMLElement, attr: string);

export function preventDefault(): typeof tap;

export function onClick($node: HTMLElement): typeof fromEvent;
