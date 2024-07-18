import type { Observer } from "rx-core";

import {
    Observable, fromEvent, startWith,
    catchError, tap, first, of,
    map, mapTo, filter, mergeMap, EMPTY, empty,
    switchMapTo, switchMap,
    BehaviorSubject, Subject, ReplaySubject,
    pipe, share, toArray, distinctUntilChanged, from,
    combineLatest, shareReplay, race, repeat, interval, merge,
    debounceTime, debounce, delay, concatMap, distinct, scan, throwError,
    zip, animationFrames, retry, forkJoin, skip, takeUntil, timer,
} from "./vendor/rxjs/rxjs.min.js";

import * as rxajax from "./vendor/rxjs/rxjs-ajax.min.js";

declare const rxjs: {
    of: typeof of,
    from: typeof from,
    Observable: typeof Observable,
    BehaviorSubject: typeof BehaviorSubject,
    ReplaySubject: typeof ReplaySubject,
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
    animationFrames: typeof animationFrames,
    debounce: typeof debounce,
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
    race: typeof race,
    retry: typeof retry,
    zip: typeof zip,
    forkJoin: typeof forkJoin,
    skip: typeof skip,
    takeUntil: typeof takeUntil,
    timer: typeof timer,
};

export default rxjs;

export function ajax(opts: object);

export function effect(obs: Observer<any>): void;

export function applyMutation($node: HTMLElement, ...keys: string[]): typeof tap;

export function applyMutations($node: HTMLElement, ...keys: string[]): typeof tap;

export function stateMutation($node: HTMLElement, attr: string);

export function preventDefault(): typeof tap;

export function onClick($node: HTMLElement): typeof fromEvent;

export function onLoad($node: HTMLElement): typeof fromEvent;