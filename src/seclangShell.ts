import seclang from "./seclang";
import * as readline from "readline-sync";

while (true) {
	const text = readline.question("seclang> ", { keepWhitespace: true });

	if (text == "quit()") {
		break;
	}

	const runResult = seclang("<stdin>", text);

	if (runResult.error) {
		console.log(runResult.error.toString());
	} else {
		console.log(runResult.result);
	}
}
