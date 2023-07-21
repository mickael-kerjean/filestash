const sleep = (t) => new Promise((done) => setTimeout(done, t));

export async function requestAnimation() {
    return new Promise((done) => requestAnimationFrame(done));
}

export async function enterAnimation($node, timeout) {
    $node.classList.remove("leave", "leave-active", "enter", "enter-active");
    await requestAnimation();
    $node.classList.add("enter");
    await requestAnimation();
    $node.classList.add("enter-active")
    await sleep(timeout);
    $node.classList.remove("enter", "enter-active");
}

export async function leaveAnimation($node, timeout) {
    $node.classList.remove("leave", "leave-active", "enter", "enter-active");
    await requestAnimation();
    $node.classList.add("leave");
    await requestAnimation();
    $node.classList.add("leave-active")
    await sleep(timeout);
}

export function slideXIn(size) {
    return function (querySelector, t){
        return `
${querySelector}.enter {
    opacity: 0;
    transform: translateX(${size}px);
}
${querySelector}.enter.enter-active {
    opacity: 1;
    transform: translateX(0);
    transition: all ${t}ms ease;
}`;
    }
}

export function slideYIn(size) {
    return function (querySelector, t){
        return `
${querySelector}.enter {
    opacity: 0;
    transform: translateY(${size}px);
}
${querySelector}.enter.enter-active {
    opacity: 1;
    transform: translateY(0);
    transition: all ${t}ms ease;
}`;
    }
}

export function slideXOut(size) {
    return function (querySelector, t){
        return `
${querySelector}.leave {
    opacity: 1;
    transform: translateX(0);
}
${querySelector}.leave.leave-active {
    opacity: 0;
    transform: translateX(${size}px);
    transition: all ${t}ms ease;
}`;
    }
}

export function slideYOut(size) {
    return function (querySelector, t){
        return `
${querySelector}.leave {
    opacity: 1;
    transform: translateY(0);
}
${querySelector}.leave.leave-active {
    opacity: 0;
    transform: translateY(${size}px);
    transition: all ${t}ms ease;
}`;
    }
}

export function opacityIn() {
    return function (querySelector, t){
        return `
${querySelector}.enter {
    opacity: 0;
}
${querySelector}.enter.enter-active {
    opacity: 1;
    transition: opacity ${t}ms ease;
}`;
    }
}

export function opacityOut() {
    return function (querySelector, t){
        return `
${querySelector}.leave {
    opacity: 1;
}
${querySelector}.leave.leave-active {
    opacity: 0;
    transition: opacity ${t}ms ease;
}`;
    }
}
