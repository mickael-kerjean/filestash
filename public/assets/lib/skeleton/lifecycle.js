let _cleanup = [];

export async function init($root) {
    $root.cleanup = () => {
        const fns = _cleanup.map((fn) => fn($root));
        _cleanup = [];
        return Promise.all(fns);
    };
}

export async function onDestroy(fn) {
    _cleanup.push(fn);
}
