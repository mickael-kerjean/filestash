import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

class LogManager {
    get(maxSize = 1000) {
        return ajax({
            url: `/admin/api/logs?maxSize=${maxSize}`,
            responseType: "text",
        }).pipe(
            rxjs.map(({ response }) => response),
            // rxjs.repeat({ delay: 10000 }),
        );
    }
}

export default new LogManager();
