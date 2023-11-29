import ctrlError from "./ctrl_error.js";
import { ApplicationError } from "../lib/error.js";

export default function(render) {
    ctrlError(render)(new ApplicationError("Not Found", "404 - Not Found"));
}
