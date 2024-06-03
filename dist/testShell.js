"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var seclang_1 = require("./seclang");
var readline = require("readline-sync");
while (true) {
    var text = readline.question("seclang> ", { keepWhitespace: true });
    var runResult = (0, seclang_1.default)("<stdin>", text);
    if (runResult.error) {
        console.log(runResult.error.toString());
    }
    else {
        console.log(runResult.result);
    }
}
//# sourceMappingURL=testShell.js.map