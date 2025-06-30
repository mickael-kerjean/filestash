const DEBUG = false;
const log = (msg) => DEBUG && console.log(msg);

const wasmCache = new Map();

export default async function(baseURL, path, opts = {}) {
    const wasi = new Wasi();
    const url = new URL(path, baseURL);

    let wasm;
    if (wasmCache.has(url.pathname)) wasm = wasmCache.get(url.pathname);
    else {
        wasm = await WebAssembly.instantiateStreaming(
            fetch(url), {
                wasi_snapshot_preview1: {
                    ...wasi,
                },
                env: {
                    ...wasi,
                    ...syscalls,
                    ...javascripts,
                },
            },
        );
        wasmCache.set(url.pathname, wasm);
    }
    wasi.instance = wasm.instance;
    return wasm;
}

const FS = {};
let nextFd = 0;
writeFS(new Uint8Array(0), "/dev/stdin");
writeFS(new Uint8Array(1024*8), "/dev/stdout");
writeFS(new Uint8Array(1024*8), "/dev/stderr");
if (nextFd !== 3) throw new Error("Unexpected next fd");

export function writeFS(buffer, path = "") {
    if (!(buffer instanceof Uint8Array)) throw new Error("can only write Uint8Array");
    FS[nextFd] = {
        buffer,
        position: 0,
        path,
    };
    nextFd += 1;
    return nextFd - 1;
}

export function readFS(fd) {
    const file = FS[fd];
    if (!file) throw new Error("file does not exist");

    let end = file.buffer.length;
    while (end > 0 && file.buffer[end - 1] === 0) end--;
    return file.buffer.subarray(0, end);
}

export function clearFS() {
    Object.keys(FS).forEach((key) => {
        if (key > 2) delete FS[key];
    });
    nextFd = 3;
}

function getFile(path) {
    const allFds = Object.keys(FS);
    for (let i=allFds.length - 1; i>0; i--) {
        if (FS[allFds[i]].path === path) {
            log(`  fileopen fd=${i} path=${path}`);
            return FS[allFds[i]];
        }
    }
    throw new Error(`cannot get file "${path}"`);
}

export const syscalls = {
    __syscall_fcntl64: (fd, cmd, varargs) => {
        console.log(`Stubbed __syscall_fcntl64 called with fd=${fd}, cmd=${cmd}, varargs=${varargs}`);
        return -1;
    },
    __syscall_ioctl: (fd, op, varargs) => {
        switch (op) {
        case 21523:
            break;
        default:
            console.log(`Stubbed __syscall_ioctl called with fd=${fd}, request=${op}, varargs=${varargs}`);
        }
        return 0;
    },
    __syscall_unlinkat: (fd) => {
        console.log(`Stubbed __syscall_unlinkat called with fd=${fd}`);
        return -1;
    },
    __syscall_rmdir: (fd) => {
        console.log(`Stubbed __syscall_rmdir called with fd=${fd}`);
        return -1;
    },
    __syscall_newfstatat: (pathPtr, bufPtr) => {
        console.log(`Stubbed __syscall_stat64 called with pathPtr=${pathPtr}, bufPtr=${bufPtr}`);
        return 0; // Return 0 for a successful call
    },
    __syscall_lstat64: () => {
        console.log(`Stubbed __syscall_lstat64 called`);
        return -1;
    },
    __assert_fail: () => {
        console.log(`Stubbed __assert_fail called`);
        return -1;
    },
    __syscall_ftruncate64: () => {
        console.log(`Stubbed __syscall_ftruncate64`);
        return -1;
    },
    __syscall_renameat: () => {
        console.log(`Stubbed __syscall_renameat`);
        return -1;
    },
};

const javascripts = {
    _tzset_js: () => {
        console.log("Initializing time zone settings (stub)");
    },
    _abort_js: () => {
        console.error("WebAssembly module called _abort_js!");
        throw new Error("_abort_js was called");
    },
    _mktime_js: () => {
        console.error("WebAssembly module called _abort_js!");
        throw new Error("_abort_js was called");
    },
    _localtime_js: () => {
        console.error("WebAssembly module called _localtime_js!");
        throw new Error("_localtime_js was called");
    },
    emscripten_date_now: () => {
        console.error("WebAssembly module called emscripten_date_now!");
        throw new Error("_localtime_js was called");
    },
    emscripten_get_now: () => {
        console.error("WebAssembly module called emscripten_get_now!");
        throw new Error("_localtime_js was called");
    },
    emscripten_errn: () => {
        console.error("WebAssembly module called emscripten_errn!");
        throw new Error("_errn was called");
    },
    HaveOffsetConverter: () => {
        console.error("WebAssembly module called HaveOffsetConverter!");
        throw new Error("HaveOffsetConverter was called");
    },
    emscripten_pc_get_function: () => {
        console.error("WebAssembly module called emscripten_pc_get_function!");
        throw new Error("emscripten_pc_get_function was called");
    },
    emscripten_asm_const_int: () => {
        console.error("WebAssembly module called emscripten_asm_const_int!");
        throw new Error("emscripten_asm_const_int was called");
    },
    emscripten_stack_snapshot: () => {
        console.error("WebAssembly module called emscripten_stack_snapshot!");
        throw new Error("emscripten_stack_snapshot was called");
    },
    emscripten_stack_unwind_buffer: () => {
        console.error("WebAssembly module called emscripten_stack_unwind_buffer!");
        throw new Error("emscripten_stack_unwind_buffer was called");
    },
    emscripten_get_heap_max: () => {
        console.error("WebAssembly module called emscripten_get_heap_max!");
        throw new Error("emscripten_get_heap_max was called");
    },
    _timegm_js: () => {
        console.error("WebAssembly module called _timegm_js!");
        throw new Error("_timegm_js was called");
    },
    _gmtime_js: () => {
        console.error("WebAssembly module called _gmtime_js!");
        throw new Error("_gmtime_js was called");
    },
    _munmap_js: () => {
        console.error("WebAssembly module called _munmap_js!");
        throw new Error("_munmap_js was called");
    },
    _mmap_js: () => {
        console.error("WebAssembly module called _mmap_js!");
        throw new Error("_mmap_js was called");
    }
};

export class Wasi {
    #instance;

    constructor() {
        this.fd_read = this.fd_read.bind(this);
        this.fd_write = this.fd_write.bind(this);
        this.fd_seek = this.fd_seek.bind(this);
        this.fd_close = this.fd_close.bind(this);

        this._emscripten_memcpy_js = this._emscripten_memcpy_js.bind(this);
        this.emscripten_resize_heap = this.emscripten_resize_heap.bind(this);
        this.environ_sizes_get = this.environ_sizes_get.bind(this);
        this.environ_get = this.environ_get.bind(this);
        this.clock_time_get = this.clock_time_get.bind(this);
        this.__syscall_openat = this.__syscall_openat.bind(this);
        this.__syscall_stat64 = this.__syscall_stat64.bind(this);
        this.__cxa_throw = this.__cxa_throw.bind(this);
        this.random_get = this.random_get.bind(this);
        this.proc_exit = this.proc_exit.bind(this);
        this.fd_pread = this.fd_pread.bind(this);
        this.__syscall_fstat64 = this.__syscall_fstat64.bind(this);
    }

    set instance(val) {
        this.#instance = val;
    }

    fd_write(fd, iovs, iovs_len, nwritten) {
        if (!FS[fd]) throw new Error(`File descriptor ${fd} does not exist.`);

        const ioVecArray = new Uint32Array(this.#instance.exports.memory.buffer, iovs, iovs_len * 2);
        const memory = new Uint8Array(this.#instance.exports.memory.buffer);
        let totalBytesWritten = 0;

        for (let i = 0; i < iovs_len * 2; i += 2) {
            const offset = ioVecArray[i];
            const length = ioVecArray[i + 1];
            while (FS[fd].buffer.byteLength - FS[fd].position < length) {
                const newBuffer = new Uint8Array(FS[fd].buffer.byteLength + 1024 * 1024 * 5);
                newBuffer.set(FS[fd].buffer, 0);
                FS[fd].buffer = newBuffer;
            }
            FS[fd].buffer.set(
                memory.subarray(offset, offset + length),
                FS[fd].position
            );
            FS[fd].position += length;
            totalBytesWritten += length;
        }
        new DataView(this.#instance.exports.memory.buffer).setUint32(
            nwritten,
            totalBytesWritten,
            true,
        );
        if (fd === 1 || fd === 2) {
            FS[fd] = {
                buffer: new Uint8Array(readFS(fd)),
                position: 0,
                path: FS[fd].path || "",
            };
        } else {
            log(`wasi::fd_write fd=${fd}`);
        }
        return 0;
    }

    fd_read(fd, iovs, iovs_len, nread) {
        const file = FS[fd];
        if (!file) {
            console.error(`Invalid fd: ${fd}`);
            return -1;
        }

        const ioVecArray = new Uint32Array(this.#instance.exports.memory.buffer, iovs, iovs_len * 2);
        const memory = new Uint8Array(this.#instance.exports.memory.buffer);
        let totalBytesRead = 0;
        for (let i = 0; i < iovs_len * 2; i += 2) {
            const offset = ioVecArray[i];
            const length = ioVecArray[i + 1] || 0;
            const bytesToRead = Math.min(
                length,
                file.buffer.length - file.position,
            );
            if (bytesToRead < 0) {
                break;
            }
            memory.set(
                file.buffer.subarray(file.position, file.position + bytesToRead),
                offset,
            );
            file.position += bytesToRead;
            totalBytesRead += bytesToRead;
        }
        log(`wasi::fd_read fd=${fd} iovs_len=${iovs_len} totalBytesRead=${totalBytesRead}`);
        new DataView(this.#instance.exports.memory.buffer).setUint32(
            nread,
            totalBytesRead,
            true,
        );
        return 0;
    }

    fd_pread(fd, iovs, iovs_len, offset_lo, offset_hi, nread) {
        const file = FS[fd];
        if (!file) {
            console.error(`Invalid fd: ${fd}`);
            return -1;
        }

        const start = (offset_hi >>> 0) * 0x100000000 + (offset_lo >>> 0);
        const ioVec = new Uint32Array(this.#instance.exports.memory.buffer, iovs, iovs_len * 2);
        const mem = new Uint8Array(this.#instance.exports.memory.buffer);

        let total = 0;
        for (let i = 0; i < iovs_len * 2; i += 2) {
            const dst = ioVec[i];
            const len = ioVec[i + 1] || 0;
            const avail = Math.max(
                0,
                Math.min(len, file.buffer.length - (start + total)),
            );
            if (avail === 0) {
                console.log(`len=[${len}] buffLength=[${file.buffer.length}] start=[${start}] total=[${total}]`);
                break;
            }
            mem.set(
                file.buffer.subarray(start + total, start + total + avail),
                dst
            );
            total += avail;
        }

        new DataView(this.#instance.exports.memory.buffer).setUint32(nread, total, true);
        return 0;
    }

    fd_seek(fd, offsetBigInt, _, whence) {
        log(`wasi::fd_seek fd=${fd} offset=${offsetBigInt} whence=${whence}`);
        const offset = Number(offsetBigInt);
        const file = FS[fd];
        if (!file) {
            console.error(`Invalid FD: ${fd}`);
            return -1;
        }
        switch (whence) {
        case 0: // SEEK_SET
            file.position = offset;
            break;
        case 1: // SEEK_CUR
            file.position += offset;
            break;
        case 2: // SEEK_END
            file.position = file.buffer.length + offset;
            break;
        default:
            console.log(`fd_seek called with fd=${fd}, offset=${offset}, position=${file.position} whence=${whence}`);
            const error = new Error("fd_seek trace");
            console.log("Invalid whence", whence, error.stack);
            return -1;
        }
        return 0;
    }

    fd_close(fd) {
        if (!FS[fd]) {
            console.error(`Invalid FD: ${fd}`);
            return -1;
        }
        return 0;
    }

    _emscripten_memcpy_js(dest, src, num) {
        const memory = new Uint8Array(this.#instance.exports.memory.buffer);
        memory.set(memory.subarray(src, src + num), dest);
        return dest;
    }

    emscripten_resize_heap(requested) {
        console.log("Stubbed emscripten_resize_heap called");
        throw new Error("Heap resize not supported");
    }

    environ_sizes_get() {
        console.log(`Stubbed environ_sizes_get called`);
        return 0;
    }

    environ_get() {
        console.log(`Stubbed environ_get called`);
        return 0;
    }

    clock_time_get() {
        console.log(`Stubbed clock_time_get called`);
        return -1;
    }

    __syscall_openat(dirFd, pathPtr, flags, mode) {
        const memory = new Uint8Array(this.#instance.exports.memory.buffer);
        let path = "";
        for (let i = pathPtr; memory[i] !== 0; i++) {
            path += String.fromCharCode(memory[i]);
        }
        const allFds = Object.keys(FS);
        for (let i=allFds.length - 1; i>0; i--) {
            if (FS[allFds[i]].path === path) {
                log(`  syscall::openat::result fd=${i} path=${path}`);
                return i;
            }
        }
        throw new Error("Unknown file for __syscall_openat");
    }

    __syscall_stat64(pathPtr, buf) {
        log(`  syscall::stat64 pathPtr=${pathPtr}, bufPtr=${buf}`);
        const memory = new Uint8Array(this.#instance.exports.memory.buffer);
        let path = "";
        for (let i = pathPtr; memory[i] !== 0; i++) {
            path += String.fromCharCode(memory[i]);
        }
        const file = getFile(path);
        const HEAP32 = new Int32Array(this.#instance.exports.memory.buffer);
        const HEAPU32 = new Uint32Array(this.#instance.exports.memory.buffer);
        const stat = {
            dev: 1,
            ino: 42,
            mode: 0o100644,
            nlink: 1,
            uid: 1000,
            gid: 1000,
            rdev: 0,
            size: file.buffer.byteLength,
            blksize: 4096,
            blocks: 256,
            atime: new Date(),
            mtime: new Date(),
            ctime: new Date(),
        };
        HEAP32[(buf >> 2)] = stat.dev;
        HEAP32[((buf + 4) >> 2)] = stat.mode;
        HEAPU32[((buf + 8) >> 2)] = stat.nlink;
        HEAP32[((buf + 12) >> 2)] = stat.uid;
        HEAP32[((buf + 16) >> 2)] = stat.gid;
        HEAP32[((buf + 20) >> 2)] = stat.rdev;
        HEAP32[((buf + 24) >> 2)] = stat.size & 0xFFFFFFFF;
        HEAP32[((buf + 28) >> 2)] = Math.floor(stat.size / 4294967296);
        HEAP32[((buf + 32) >> 2)] = stat.blksize;
        HEAP32[((buf + 36) >> 2)] = stat.blocks;
        HEAP32[((buf + 40) >> 2)] = Math.floor(stat.atime.getTime() / 1000);
        HEAP32[((buf + 44) >> 2)] = 0;
        HEAP32[((buf + 48) >> 2)] = (stat.atime.getTime() % 1000) * 1e6;
        HEAP32[((buf + 56) >> 2)] = Math.floor(stat.mtime.getTime() / 1000);
        HEAP32[((buf + 60) >> 2)] = 0;
        HEAP32[((buf + 64) >> 2)] = (stat.mtime.getTime() % 1000) * 1e6;
        HEAP32[((buf + 72) >> 2)] = Math.floor(stat.ctime.getTime() / 1000);
        HEAP32[((buf + 76) >> 2)] = 0;
        HEAP32[((buf + 80) >> 2)] = (stat.ctime.getTime() % 1000) * 1e6;
        HEAP32[((buf + 88) >> 2)] = stat.ino & 0xFFFFFFFF;
        HEAP32[((buf + 92) >> 2)] = Math.floor(stat.ino / 4294967296);
        return 0;
    }

    __cxa_throw(ptr, type, destructor) {
        console.error(`  syscall::cxa_throw ptr=${ptr}, type=${type}, destructor=${destructor}`);
        throw new Error("WebAssembly exception");
    }

    random_get() {
        console.log(`Stubbed random_get called`);
        return -1;
    }

    proc_exit() {
        console.log(`Stubbed proc_exit called`);
        return -1;
    }

    __syscall_fstat64(fd, buf) {
        log(`  syscall::fstat64 fd=${fd}, buf=${buf}`);
        const file = FS[fd];
        if (!file) return -1; // EBADF

        const size = file.buffer.byteLength >>> 0; // ≤ 4 GB
        const nowSec = (Date.now() / 1000) | 0;
        const H32 = new Int32Array(this.#instance.exports.memory.buffer);

        /* basic fields */
        H32[buf >> 2] = 1; /* st_dev   */
        H32[(buf+4) >> 2] = 0o100644; /* st_mode  */
        H32[(buf+8) >> 2] = 1; /* st_nlink */
        H32[(buf+12) >> 2] = 1000; /* st_uid   */
        H32[(buf+16) >> 2] = 1000; /* st_gid   */
        H32[(buf+20) >> 2] = 0; /* st_rdev  */

        H32[((buf + 24) >> 2)] = size & 0xFFFFFFFF;
        H32[((buf + 28) >> 2)] = Math.floor(size / 4294967296);

        H32[(buf+32) >> 2] = 4096;
        H32[(buf+36) >> 2] = (size + 511) >> 9;

        /* st_size lives at byte 40 in Emscripten’s 32-bit stat64 */
        H32[(buf+40) >> 2] = size; /* low 32 bits (high word = 0) */
        H32[(buf+44) >> 2] = 0;

        H32[(buf+32) >> 2] = 4096; /* st_blksize */
        H32[(buf+36) >> 2] = (size + 511) >> 9; /* st_blocks */

        /* atime / mtime / ctime: seconds, nsec = 0 */
        for (const off of [48, 56, 64]) {
            H32[((buf+off) >> 2)] = nowSec;
            H32[((buf+off+4) >> 2)] = 0;
        }

        H32[(buf+72) >> 2] = fd; /* st_ino (low) */
        H32[(buf+76) >> 2] = 0; /* st_ino (high) */

        return 0;
    }
}
