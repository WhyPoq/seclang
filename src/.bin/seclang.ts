#!/usr/bin/env node

import runShell from "../seclangShell";
import runFile from "../seclangFile";

function displayHelp() {
	console.log(`\
- Execute without arguments to run as REPL
- Give filepath of the program to run it\
`);
}

function fail() {
	process.exit(1);
}

async function main() {
	const args = process.argv.slice(2);

	if (args.length === 1 && args[0] === "--help") {
		displayHelp();
		return;
	}

	if (args.length == 0) {
		runShell();
		return;
	}

	if (args.length == 1) {
		const filepath = args[0];
		try {
			await runFile(filepath);
		} catch (err) {
			if (err.code === "ENOENT") {
				console.log("This file does not exist");
				fail();
			} else {
				throw err;
			}
		}
		return;
	}

	displayHelp();
	fail();
}

main();
