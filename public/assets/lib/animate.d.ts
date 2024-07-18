type TransitionEnter = {
    timeEnter: number;
    enter: AnimationFrames[];
}
type TransitionLeave = {
    timeLeave: number;
    leave: AnimationFrames[];
};
type AnimationFrames = {
    transform?: string;
    opacity?: number;
    height?: string;
    width?: string;
    offset?: number;
};

export function transition($node: HTMLElement, opts?: TransitionEnter | TransitionLeave): HTMLElement;

export function animate($node: HTMLElement | null, opts: {
    time: number;
    keyframes: AnimationFrames[];
    easing?: string;
    fill?: string;
    onExit?: () => void;
    onEnter?: () => void;
}): Promise<void>;

export function slideXIn(dist: number): AnimationFrames[];

export function slideXOut(dist: number): AnimationFrames[];

export function opacityIn(): AnimationFrames[];

export function opacityOut(): AnimationFrames[];

export function slideYIn(dist: number): AnimationFrames[];

export function slideYOut(dist: number): AnimationFrames[];

export function zoomIn(size: number): AnimationFrames[];
