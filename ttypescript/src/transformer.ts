import type { Program } from "typescript";
import { di } from "@wessberg/di-compiler";
const transformer = (program: Program) => di({ program });
// console.log("In transformer");
export default transformer;
