import ctrlError from "./ctrl_error.js";
import { ApplicationError } from "../lib/error.js";

export default ctrlError(new ApplicationError("Not Found"));
