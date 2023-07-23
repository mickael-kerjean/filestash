import ctrlError from "./ctrl_error.js";
import { ApplicationError } from "../lib/error/index.js";

export default ctrlError(new ApplicationError("Not Found"));
