import { createElement } from "../lib/skeleton/index.js";
import { qs } from "../lib/dom.js";
import { ApplicationError } from "../lib/error.js";
import { animate, slideYIn, slideYOut } from "../lib/animate.js";
import { loadCSS } from "../helpers/loader.js";

const createNotification = async(msg, type) => {
    const $notification = createElement(`
        <span class="component_notification" role="alert">
            <div class="no-select">
                <div class="component_notification--container ${type}">
                    <div class="message"></div>
                    <div class="close">
                        <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MS45NzYgNTEuOTc2Ij4KICA8cGF0aCBzdHlsZT0iZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eTowLjUzMzMzMjg1O3N0cm9rZS13aWR0aDoxLjQ1NjgxMTE5IiBkPSJtIDQxLjAwNTMxLDQwLjg0NDA2MiBjIC0xLjEzNzc2OCwxLjEzNzc2NSAtMi45ODIwODgsMS4xMzc3NjUgLTQuMTE5ODYxLDAgTCAyNi4wNjg2MjgsMzAuMDI3MjM0IDE0LjczNzU1MSw0MS4zNTgzMSBjIC0xLjEzNzc3MSwxLjEzNzc3MSAtMi45ODIwOTMsMS4xMzc3NzEgLTQuMTE5ODYxLDAgLTEuMTM3NzcyMiwtMS4xMzc3NjggLTEuMTM3NzcyMiwtMi45ODIwODggMCwtNC4xMTk4NjEgTCAyMS45NDg3NjYsMjUuOTA3MzcyIDExLjEzMTkzOCwxNS4wOTA1NTEgYyAtMS4xMzc3NjQ3LC0xLjEzNzc3MSAtMS4xMzc3NjQ3LC0yLjk4MzU1MyAwLC00LjExOTg2MSAxLjEzNzc3NCwtMS4xMzc3NzIxIDIuOTgyMDk4LC0xLjEzNzc3MjEgNC4xMTk4NjUsMCBMIDI2LjA2ODYyOCwyMS43ODc1MTIgMzYuMzY5NzM5LDExLjQ4NjM5OSBjIDEuMTM3NzY4LC0xLjEzNzc2OCAyLjk4MjA5MywtMS4xMzc3NjggNC4xMTk4NjIsMCAxLjEzNzc2NywxLjEzNzc2OSAxLjEzNzc2NywyLjk4MjA5NCAwLDQuMTE5ODYyIEwgMzAuMTg4NDg5LDI1LjkwNzM3MiA0MS4wMDUzMSwzNi43MjQxOTcgYyAxLjEzNzc3MSwxLjEzNzc2NyAxLjEzNzc3MSwyLjk4MjA5MSAwLDQuMTE5ODY1IHoiIC8+Cjwvc3ZnPgo=" alt="close">
                    </div>
                </div>
            </div>
        </span>
    `);
    if (msg instanceof HTMLElement) qs($notification, ".message").appendChild(msg);
    else qs($notification, ".message").innerText = msg;
    return $notification;
};

class NotificationComponent extends HTMLElement {
    buffer = [];

    async connectedCallback() {
        await loadCSS(import.meta.url, "./notification.css");
    }

    async trigger(message, type) {
        if (this.buffer.length > 20) this.buffer.pop(); // failsafe
        this.buffer.push({ message, type });
        if (this.buffer.length !== 1) {
            const $close = this.querySelector(".close");
            if (!($close instanceof HTMLElement) || !$close.onclick) return;
            $close.onclick(new PointerEvent("mousedown"));
            return;
        }
        await this.run();
    }

    async run() {
        if (this.buffer.length === 0) return;
        const { message, type } = this.buffer[0];
        const $notification = await createNotification(message, type);
        this.replaceChildren($notification);
        await animate($notification, {
            keyframes: slideYIn(50),
            time: 100,
        });
        const ids = [];
        await Promise.race([
            new Promise((done) => ids.push(setTimeout(() => {
                done(new MouseEvent("mousedown"));
            }, this.buffer.length === 1 ? 8000 : 800))),
            new Promise((done) => ids.push(setTimeout(() => {
                const $close = $notification.querySelector(".close");
                if (!($close instanceof HTMLElement)) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: notification close button missing");
                $close.onclick = done;
            }, 1000))),
        ]);
        ids.forEach((id) => clearTimeout(id));
        await animate($notification, {
            keyframes: slideYOut(10),
            time: 200,
        });
        $notification.remove();
        this.buffer.shift();
        await this.run();
    }
}

customElements.define("component-notification", NotificationComponent);

function find() {
    const $dom = document.body.querySelector("component-notification");
    if (!($dom instanceof NotificationComponent)) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: wrong type notification component");
    return $dom;
}

export default class Notification {
    static info(msg) {
        find().trigger(msg, "info");
    }

    static success(msg) {
        find().trigger(msg, "success");
    }

    static error(msg) {
        find().trigger(msg, "error");
    }
}
