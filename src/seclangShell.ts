import { run, InstructionLimitReachedError, VarsLimitReachedError } from "./seclangCore";
import * as readline from "readline-sync";

function runShell() {
	while (true) {
		const text = readline.question("seclang> ", { keepWhitespace: true });

		if (text.length === 0) continue;

		if (text == "quit()") {
			break;
		}

		try {
			const runResult = run(text, "<stdin>");

			if (runResult.error) {
				console.log(runResult.error.toString());
			} else {
				console.log(runResult.result.toString());
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
}

export default runShell;
