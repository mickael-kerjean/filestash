export default async function(baseURL, path) {
    const wasi = new Wasi();
    const wasm = await WebAssembly.instantiateStreaming(
        fetch(new URL(path, baseURL)), {
            wasi_snapshot_preview1: {
                ...wasi,
            },
            env: {
                ...wasi,
                ...syscalls,
            },
        },
    );
    wasi.instance = wasm.instance;
    return wasm;
}

const FS = {};
let nextFd = 0;
writeFS(new Uint8Array(), 0); // stdin
writeFS(new Uint8Array(), 1); // stdout
writeFS(new Uint8Array(), 2); // stderr
if (nextFd !== 3) throw new Error("Unexpected next fd");

export function writeFS(buffer, fd) {
    if (fd === undefined) fd = nextFd;
    else if (!(buffer instanceof Uint8Array)) throw new Error("can only write Uint8Array");

    FS[fd] = {
        buffer,
        position: 0,
    };
    nextFd += 1;
    return nextFd - 1;
}

export function readFS(fd) {
    if (fd < 3) throw new Error("cannot read from stdin, stdout or stderr");
    const file = FS[fd];
    if (!file) throw new Error("file does not exist");
    return file.buffer;
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
};

export class Wasi {
    #instance;

    constructor() {
        this.fd_read = this.fd_read.bind(this);
        this.fd_write = this.fd_write.bind(this);
        this.fd_seek = this.fd_seek.bind(this);
        this.fd_close = this.fd_close.bind(this);
    }

    set instance(val) {
        this.#instance = val;
    }

    fd_write(fd, iovs, iovs_len, nwritten) {
        if (!FS[fd]) {
            console.error(`Invalid fd: ${fd}`);
            return -1;
        }
        let output = FS[fd].buffer;
        const ioVecArray = new Uint32Array(this.#instance.exports.memory.buffer, iovs, iovs_len * 2);
        const memory = new Uint8Array(this.#instance.exports.memory.buffer);
        let totalBytesWritten = 0;
        for (let i = 0; i < iovs_len * 2; i += 2) {
            const sub = memory.subarray(
                (ioVecArray[i] || 0),
                (ioVecArray[i] || 0) + (ioVecArray[i+1] || 0),
            );
            const tmp = new Uint8Array(output.byteLength + sub.byteLength);
            tmp.set(output, 0);
            tmp.set(sub, output.byteLength);
            output = tmp;
            totalBytesWritten += ioVecArray[i+1] || 0;
        }
        const dataView = new DataView(this.#instance.exports.memory.buffer);
        dataView.setUint32(nwritten, totalBytesWritten, true);

        FS[fd].buffer = output;
        if (fd < 3 && fd >= 0) {
            const msg = fd === 1 ? "stdout" : fd === 2 ? "stderr" : "stdxx";
            console.log(msg + ": " + (new TextDecoder()).decode(output));
            FS[fd].buffer = new ArrayBuffer(0);
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
            if (bytesToRead <= 0) {
                break;
            }
            memory.set(
                file.buffer.subarray(file.position, file.position + bytesToRead),
                offset,
            );
            file.position += bytesToRead;
            totalBytesRead += bytesToRead;
        }

        const dataView = new DataView(this.#instance.exports.memory.buffer);
        dataView.setUint32(nread, totalBytesRead, true);
        return 0;
    }

    fd_seek(fd, offsetBigInt, whence) {
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
            console.log("Invalid whence", error.stack);
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
}
