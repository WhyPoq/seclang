import { promises as fs } from "node:fs";
import * as path from "node:path";
import { InstructionLimitReachedError, VarsLimitReachedError } from "./seclangCore";
import { run } from "./seclangCore";

async function runFile(filepath: string) {
	const programText = await fs.readFile(filepath, "utf8");

	try {
		const filename = path.basename(filepath);
		const runResult = run(programText, filename);

		if (runResult.error) {
			console.log(runResult.error.toString());
		}
	} catch (e) {
		if (e instanceof InstructionLimitReachedError) {
			console.log("Too many instructions. Force stop");
		} else if (e instanceof VarsLimitReachedError) {
			console.log("Too many variables. Force stop");
		} else {
			throw e;
		}
	}
}

export default runFile;
