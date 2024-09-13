"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sandboxRun = exports.jsToSeclangValue = exports.seclangValueToJS = exports.JsToSeclangValueConvertionError = exports.CodeError = void 0;
var seclang_1 = require("./seclang");
var seclang_2 = require("./seclang");
var CodeError = /** @class */ (function (_super) {
    __extends(CodeError, _super);
    function CodeError(message) {
        if (message === void 0) { message = undefined; }
        var _this = _super.call(this, message) || this;
        Object.setPrototypeOf(_this, CodeError.prototype);
        return _this;
    }
    return CodeError;
}(Error));
exports.CodeError = CodeError;
var JsToSeclangValueConvertionError = /** @class */ (function (_super) {
    __extends(JsToSeclangValueConvertionError, _super);
    function JsToSeclangValueConvertionError(message) {
        if (message === void 0) { message = undefined; }
        var _this = _super.call(this, message) || this;
        Object.setPrototypeOf(_this, JsToSeclangValueConvertionError.prototype);
        return _this;
    }
    return JsToSeclangValueConvertionError;
}(Error));
exports.JsToSeclangValueConvertionError = JsToSeclangValueConvertionError;
function seclangValueToJS(secVal) {
    if (secVal instanceof seclang_1.SeclangNumber)
        return secVal.value;
    if (secVal instanceof seclang_1.SeclangString)
        return secVal.value;
    if (secVal instanceof seclang_1.SeclangList)
        return secVal.elements.map(function (el) { return seclangValueToJS(el); });
    if (secVal instanceof seclang_1.SeclangFunction) {
        return function (args, logOutput, stdout, instructionsLimit) {
            var convertedArgs = args.map(function (arg) { return jsToSeclangValue(arg); });
            var res = secVal.execute(convertedArgs, logOutput, stdout, {
                cur: 0,
                limit: instructionsLimit,
            });
            return seclangValueToJS(res.returningVal);
        };
    }
    return secVal;
}
exports.seclangValueToJS = seclangValueToJS;
function jsToSeclangValue(value) {
    if (typeof value === "number")
        return new seclang_1.SeclangNumber(value);
    if (typeof value === "string")
        return new seclang_1.SeclangString(value);
    if (Array.isArray(value))
        return new seclang_1.SeclangList(value.map(function (el) { return jsToSeclangValue(el); }));
    return value;
}
exports.jsToSeclangValue = jsToSeclangValue;
function sandboxRun(programText, limits, environment) {
    if (environment === void 0) { environment = {}; }
    var stdout = [];
    var innerGlobalSymbolTable = new seclang_1.SymbolTable();
    for (var key in environment) {
        innerGlobalSymbolTable.setNew(key, jsToSeclangValue(environment[key]));
    }
    var runResult = (0, seclang_2.run)(programText, "<program>", limits, false, stdout, innerGlobalSymbolTable);
    if (runResult.error)
        throw new CodeError(runResult.error.toString());
    return {
        stdout: stdout,
        globalSymbols: Object.fromEntries(innerGlobalSymbolTable.symbols),
        result: runResult.result,
    };
}
exports.sandboxRun = sandboxRun;
//# sourceMappingURL=sandbox.js.map