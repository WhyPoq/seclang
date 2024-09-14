import { CodeError, jsToSeclangValue, sandboxRun, seclangValueToJS } from "./sandbox";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { InstructionLimitReachedError, SeclangFunction, VarsLimitReachedError } from "./seclang";

async function testProgram() {
	const data = await fs.readFile(path.join(__dirname, "myprogram.sl"), "utf8");
	try {
		const output = sandboxRun(data, {
			maxInstructions: undefined,
			maxVariables: undefined,
		});
		console.log("OUTPUT:");
		output.stdout.forEach((line) => console.log(line));
		console.log("=============");
		console.log("SYMBOLS:");
		for (const key in output.globalSymbols) {
			const value = output.globalSymbols[key];
			console.log(`${key} = ${value.toString()}`);
		}
		console.log("=============");
		console.log("RESULT:");
		console.log(output.result.toString());
	} catch (e) {
		if (e instanceof CodeError) console.log(e.message);
		else if (e instanceof InstructionLimitReachedError)
			console.log("Too many instructions. Force stop");
		else if (e instanceof VarsLimitReachedError) console.log("Too many variables. Force stop");
		else throw e;
	}
}

async function runFunction() {
	const functionProgram = await fs.readFile(path.join(__dirname, "myprogram.sl"), "utf8");
	console.log({ functionProgram });
	try {
		const compileOutput = sandboxRun(functionProgram, {
			maxInstructions: undefined,
			maxVariables: undefined,
		});

		const testFunction = seclangValueToJS(
			compileOutput.globalSymbols["test"] as SeclangFunction
		);
		for (let i = 1; i < 12; i++) {
			const res = testFunction([jsToSeclangValue(i ** 2)], true, [], 1000);
			console.log(res);
		}
	} catch (e) {
		if (e instanceof CodeError) console.log(e.message);
		else if (e instanceof InstructionLimitReachedError)
			console.log("Too many instructions. Force stop");
		else if (e instanceof VarsLimitReachedError) console.log("Too many variables. Force stop");
		else throw e;
	}
}

testProgram();
