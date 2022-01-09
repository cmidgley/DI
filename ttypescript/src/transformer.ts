import type { Program } from "typescript";
import { di } from "@wessberg/di-compiler";
const transformer = (program: Program) => di({ program });
export default transformer;
