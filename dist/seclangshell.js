"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var seclang_1 = require("./seclang");
var readline = require("readline-sync");
while (true) {
    var text = readline.question("seclang> ", { keepWhitespace: true });
    if (text == "quit()") {
        break;
    }
    try {
        var runResult = (0, seclang_1.run)(text, "<stdin>");
        if (runResult.error) {
            console.log(runResult.error.toString());
        }
        else {
            console.log(runResult.result.toString());
        }
    }
    catch (e) {
        if (e instanceof seclang_1.InstructionLimitReachedError) {
            console.log("Too many instructions. Force stop");
        }
        else if (e instanceof seclang_1.VarsLimitReachedError) {
            console.log("Too many variables. Force stop");
        }
        else {
            throw e;
        }
    }
}
//# sourceMappingURL=seclangShell.js.map