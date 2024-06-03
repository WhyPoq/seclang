"use strict";
/* =================== */
// ERRORS
/* =================== */
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
var SeclangError = /** @class */ (function () {
    function SeclangError(posStart, posEnd, errorName, details) {
        this.posStart = posStart;
        this.posEnd = posEnd;
        this.errorName = errorName;
        this.details = details;
    }
    // add arrows pointing to the error
    SeclangError.prototype.genArrowsLine = function () {
        // TODO: add support for errors on multiple lines
        var lineText = this.posStart.fileText.split("\n")[this.posStart.line];
        var str = "\n" + lineText + "\n";
        for (var i = 0; i < this.posStart.col; i++)
            str += " ";
        for (var i = this.posStart.col; i < this.posEnd.col; i++)
            str += "^";
        str += "\n";
        return str;
    };
    SeclangError.prototype.toString = function () {
        var str = "".concat(this.errorName, ": ").concat(this.details, "\n");
        str += "File ".concat(this.posStart.filename, ", line ").concat(this.posEnd.line + 1, "\n");
        str += this.genArrowsLine();
        return str;
    };
    return SeclangError;
}());
var IllegalCharSeclangError = /** @class */ (function (_super) {
    __extends(IllegalCharSeclangError, _super);
    function IllegalCharSeclangError(posStart, posEnd, details) {
        return _super.call(this, posStart, posEnd, "Illegal Character", details) || this;
    }
    return IllegalCharSeclangError;
}(SeclangError));
var ExpectedCharSeclangError = /** @class */ (function (_super) {
    __extends(ExpectedCharSeclangError, _super);
    function ExpectedCharSeclangError(posStart, posEnd, details) {
        return _super.call(this, posStart, posEnd, "Expected Character", details) || this;
    }
    return ExpectedCharSeclangError;
}(SeclangError));
var NotClosedStringSeclangError = /** @class */ (function (_super) {
    __extends(NotClosedStringSeclangError, _super);
    function NotClosedStringSeclangError(posStart, posEnd, details) {
        return _super.call(this, posStart, posEnd, "Not closed string", details) || this;
    }
    return NotClosedStringSeclangError;
}(SeclangError));
var InvalidSyntaxSeclangError = /** @class */ (function (_super) {
    __extends(InvalidSyntaxSeclangError, _super);
    function InvalidSyntaxSeclangError(posStart, posEnd, details) {
        return _super.call(this, posStart, posEnd, "Invalid Syntax", details) || this;
    }
    return InvalidSyntaxSeclangError;
}(SeclangError));
var RuntimeSeclangError = /** @class */ (function (_super) {
    __extends(RuntimeSeclangError, _super);
    function RuntimeSeclangError(posStart, posEnd, details, context) {
        var _this = _super.call(this, posStart, posEnd, "Runtime error", details) || this;
        _this.context = context;
        return _this;
    }
    RuntimeSeclangError.prototype.generateTraceback = function () {
        var result = "";
        var curPos = this.posStart;
        var curContext = this.context;
        while (curContext !== null) {
            while (curContext !== null && curContext.displayName === null) {
                curContext = curContext.parentContext;
            }
            if (curContext === null) {
                break;
            }
            result =
                "  File ".concat(curPos.filename, ", line ").concat(curPos.line + 1, ", in ").concat(curContext.displayName, "\n") + result;
            curPos = curContext.parentEntryPos;
            curContext = curContext.parentContext;
        }
        return "Traceback (most recent call last):\n" + result;
    };
    RuntimeSeclangError.prototype.toString = function () {
        var str = this.generateTraceback();
        str += "".concat(this.errorName, ": ").concat(this.details, "\n");
        str += this.genArrowsLine();
        return str;
    };
    return RuntimeSeclangError;
}(SeclangError));
/* =================== */
// POSITION
/* =================== */
var Position = /** @class */ (function () {
    function Position(idx, line, col, filename, fileText, curChar) {
        this.idx = idx;
        this.line = line;
        this.col = col;
        this.filename = filename;
        this.fileText = fileText;
        this.curChar = curChar;
    }
    Position.prototype.advance = function () {
        this.idx++;
        this.col++;
        if (this.curChar === "\n") {
            this.line++;
            this.col = 0;
        }
        if (this.idx < this.fileText.length) {
            this.curChar = this.fileText[this.idx];
        }
        else {
            this.curChar = null;
        }
    };
    Position.prototype.copy = function () {
        return new Position(this.idx, this.line, this.col, this.filename, this.fileText, this.curChar);
    };
    return Position;
}());
/* =================== */
// TOKENS
/* =================== */
var TokType;
(function (TokType) {
    TokType["INT"] = "INT";
    TokType["FLOAT"] = "FLOAT";
    TokType["PLUS"] = "PLUS";
    TokType["MINUS"] = "MINUS";
    TokType["MUL"] = "MUL";
    TokType["DIV"] = "DIV";
    TokType["POW"] = "POW";
    TokType["L_PAREN"] = "L_PAREN";
    TokType["R_PAREN"] = "R_PAREN";
    TokType["L_CURLY"] = "L_CURLY";
    TokType["R_CURLY"] = "R_CURLY";
    TokType["L_SQUARE"] = "L_SQUARE";
    TokType["R_SQUARE"] = "R_SQUARE";
    TokType["SEMICOLON"] = "SEMICOLON";
    TokType["COMMA"] = "COMMA";
    TokType["IDENTIFIER"] = "IDENTIFIER";
    TokType["KEYWORD"] = "KEYWORD";
    TokType["EQ"] = "EQ";
    TokType["EE"] = "EE";
    TokType["NE"] = "NE";
    TokType["LT"] = "LT";
    TokType["GT"] = "GT";
    TokType["LTE"] = "LTE";
    TokType["GTE"] = "GTE";
    TokType["D_AND"] = "D_AND";
    TokType["D_OR"] = "D_OR";
    TokType["NOT"] = "NOT";
    TokType["STRING_L"] = "STRING_L";
    TokType["NEWLINE"] = "NEWLINE";
    TokType["EOF"] = "EOF";
})(TokType || (TokType = {}));
var KEYWORDS = ["let", "if", "else", "while", "for", "function"];
var KEYWORDS_SET = new Set(KEYWORDS);
var Token = /** @class */ (function () {
    function Token(type, value, posStart, posEnd) {
        if (value === void 0) { value = null; }
        if (posEnd === void 0) { posEnd = null; }
        this.type = type;
        this.value = value;
        this.posStart = posStart;
        if (!posEnd) {
            this.posEnd = posStart.copy();
            this.posEnd.advance();
        }
        else {
            this.posEnd = posEnd;
        }
    }
    Token.prototype.toString = function () {
        if (this.value !== null) {
            return "".concat(this.type, ":").concat(this.value);
        }
        return "".concat(this.type);
    };
    return Token;
}());
var IntToken = /** @class */ (function (_super) {
    __extends(IntToken, _super);
    function IntToken(value, posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.INT, value, posStart, posEnd) || this;
    }
    return IntToken;
}(Token));
var FloatToken = /** @class */ (function (_super) {
    __extends(FloatToken, _super);
    function FloatToken(value, posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.FLOAT, value, posStart, posEnd) || this;
    }
    return FloatToken;
}(Token));
var PlusToken = /** @class */ (function (_super) {
    __extends(PlusToken, _super);
    function PlusToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.PLUS, null, posStart, posEnd) || this;
    }
    return PlusToken;
}(Token));
var MinusToken = /** @class */ (function (_super) {
    __extends(MinusToken, _super);
    function MinusToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.MINUS, null, posStart, posEnd) || this;
    }
    return MinusToken;
}(Token));
var MulToken = /** @class */ (function (_super) {
    __extends(MulToken, _super);
    function MulToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.MUL, null, posStart, posEnd) || this;
    }
    return MulToken;
}(Token));
var DivToken = /** @class */ (function (_super) {
    __extends(DivToken, _super);
    function DivToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.DIV, null, posStart, posEnd) || this;
    }
    return DivToken;
}(Token));
var PowToken = /** @class */ (function (_super) {
    __extends(PowToken, _super);
    function PowToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.POW, null, posStart, posEnd) || this;
    }
    return PowToken;
}(Token));
var LParenToken = /** @class */ (function (_super) {
    __extends(LParenToken, _super);
    function LParenToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.L_PAREN, null, posStart, posEnd) || this;
    }
    return LParenToken;
}(Token));
var RParenToken = /** @class */ (function (_super) {
    __extends(RParenToken, _super);
    function RParenToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.R_PAREN, null, posStart, posEnd) || this;
    }
    return RParenToken;
}(Token));
var LCurlyToken = /** @class */ (function (_super) {
    __extends(LCurlyToken, _super);
    function LCurlyToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.L_CURLY, null, posStart, posEnd) || this;
    }
    return LCurlyToken;
}(Token));
var RCurlyToken = /** @class */ (function (_super) {
    __extends(RCurlyToken, _super);
    function RCurlyToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.R_CURLY, null, posStart, posEnd) || this;
    }
    return RCurlyToken;
}(Token));
var LSquareToken = /** @class */ (function (_super) {
    __extends(LSquareToken, _super);
    function LSquareToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.L_SQUARE, null, posStart, posEnd) || this;
    }
    return LSquareToken;
}(Token));
var RSquareToken = /** @class */ (function (_super) {
    __extends(RSquareToken, _super);
    function RSquareToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.R_SQUARE, null, posStart, posEnd) || this;
    }
    return RSquareToken;
}(Token));
var SemicolonToken = /** @class */ (function (_super) {
    __extends(SemicolonToken, _super);
    function SemicolonToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.SEMICOLON, null, posStart, posEnd) || this;
    }
    return SemicolonToken;
}(Token));
var CommaToken = /** @class */ (function (_super) {
    __extends(CommaToken, _super);
    function CommaToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.COMMA, null, posStart, posEnd) || this;
    }
    return CommaToken;
}(Token));
var IdentifierToken = /** @class */ (function (_super) {
    __extends(IdentifierToken, _super);
    function IdentifierToken(value, posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.IDENTIFIER, value, posStart, posEnd) || this;
    }
    return IdentifierToken;
}(Token));
var KeywordToken = /** @class */ (function (_super) {
    __extends(KeywordToken, _super);
    function KeywordToken(value, posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.KEYWORD, value, posStart, posEnd) || this;
    }
    return KeywordToken;
}(Token));
var EQToken = /** @class */ (function (_super) {
    __extends(EQToken, _super);
    function EQToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.EQ, null, posStart, posEnd) || this;
    }
    return EQToken;
}(Token));
var EEToken = /** @class */ (function (_super) {
    __extends(EEToken, _super);
    function EEToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.EE, null, posStart, posEnd) || this;
    }
    return EEToken;
}(Token));
var NEToken = /** @class */ (function (_super) {
    __extends(NEToken, _super);
    function NEToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.NE, null, posStart, posEnd) || this;
    }
    return NEToken;
}(Token));
var LTToken = /** @class */ (function (_super) {
    __extends(LTToken, _super);
    function LTToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.LT, null, posStart, posEnd) || this;
    }
    return LTToken;
}(Token));
var GTToken = /** @class */ (function (_super) {
    __extends(GTToken, _super);
    function GTToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.GT, null, posStart, posEnd) || this;
    }
    return GTToken;
}(Token));
var LTEToken = /** @class */ (function (_super) {
    __extends(LTEToken, _super);
    function LTEToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.LTE, null, posStart, posEnd) || this;
    }
    return LTEToken;
}(Token));
var GTEToken = /** @class */ (function (_super) {
    __extends(GTEToken, _super);
    function GTEToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.GTE, null, posStart, posEnd) || this;
    }
    return GTEToken;
}(Token));
var DOrToken = /** @class */ (function (_super) {
    __extends(DOrToken, _super);
    function DOrToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.D_OR, null, posStart, posEnd) || this;
    }
    return DOrToken;
}(Token));
var DAndToken = /** @class */ (function (_super) {
    __extends(DAndToken, _super);
    function DAndToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.D_AND, null, posStart, posEnd) || this;
    }
    return DAndToken;
}(Token));
var NotToken = /** @class */ (function (_super) {
    __extends(NotToken, _super);
    function NotToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.NOT, null, posStart, posEnd) || this;
    }
    return NotToken;
}(Token));
var StringLToken = /** @class */ (function (_super) {
    __extends(StringLToken, _super);
    function StringLToken(value, posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.STRING_L, value, posStart, posEnd) || this;
    }
    return StringLToken;
}(Token));
var NewlineToken = /** @class */ (function (_super) {
    __extends(NewlineToken, _super);
    function NewlineToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.NEWLINE, null, posStart, posEnd) || this;
    }
    return NewlineToken;
}(Token));
var EOFToken = /** @class */ (function (_super) {
    __extends(EOFToken, _super);
    function EOFToken(posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        return _super.call(this, TokType.EOF, null, posStart, posEnd) || this;
    }
    return EOFToken;
}(Token));
/* =================== */
// STEP RESULT
/* =================== */
var StepResult = /** @class */ (function () {
    function StepResult(result, error) {
        this.result = result;
        this.error = error;
    }
    return StepResult;
}());
/* =================== */
// LEXER
/* =================== */
var LexerResult = /** @class */ (function (_super) {
    __extends(LexerResult, _super);
    function LexerResult() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    LexerResult.prototype.toString = function () {
        return this.result.join(", ");
    };
    return LexerResult;
}(StepResult));
var LexingPartResult = /** @class */ (function () {
    function LexingPartResult() {
        this.token = null;
        this.error = null;
    }
    LexingPartResult.prototype.success = function (token) {
        this.token = token;
        return this;
    };
    LexingPartResult.prototype.failure = function (error) {
        this.error = error;
        return this;
    };
    return LexingPartResult;
}());
var Lexer = /** @class */ (function () {
    function Lexer(filename, text) {
        this.pos = new Position(-1, 0, -1, filename, text, null);
        this.advance();
    }
    Lexer.prototype.advance = function () {
        this.pos.advance();
    };
    Lexer.prototype.isDigit = function (char) {
        var charCode = char.charCodeAt(0);
        return "0".charCodeAt(0) <= charCode && charCode <= "9".charCodeAt(0);
    };
    Lexer.prototype.isLetter = function (char) {
        var charCode = char.charCodeAt(0);
        return (("a".charCodeAt(0) <= charCode && charCode <= "z".charCodeAt(0)) ||
            ("A".charCodeAt(0) <= charCode && charCode <= "Z".charCodeAt(0)));
    };
    // if letter or '_'
    Lexer.prototype.isIdentifierStartChar = function (char) {
        return this.isLetter(char) || char === "_";
    };
    // if letter or number or '_'
    Lexer.prototype.isNameChar = function (char) {
        return this.isDigit(char) || this.isLetter(char) || char === "_";
    };
    Lexer.prototype.isWhitespace = function (char) {
        var whitespaceChars = " \t";
        return whitespaceChars.includes(char);
    };
    Lexer.prototype.isKeyword = function (identifier) {
        return KEYWORDS_SET.has(identifier);
    };
    Lexer.prototype.makeNumber = function () {
        var posStart = this.pos.copy();
        var curNumber = "";
        var countDots = 0;
        while (this.pos.curChar != null &&
            (this.isDigit(this.pos.curChar) || this.pos.curChar === ".")) {
            if (this.pos.curChar === ".") {
                if (countDots === 1)
                    break;
                countDots++;
            }
            curNumber += this.pos.curChar;
            this.advance();
        }
        if (countDots === 0) {
            return new IntToken(Number(curNumber), posStart, this.pos.copy());
        }
        // TODO: does not handle number with more than 1 dot properly
        return new FloatToken(Number(curNumber), posStart, this.pos.copy());
    };
    Lexer.prototype.makeIdentifier = function () {
        var posStart = this.pos.copy();
        var curIdentifier = "";
        while (this.pos.curChar != null && this.isNameChar(this.pos.curChar)) {
            curIdentifier += this.pos.curChar;
            this.advance();
        }
        if (this.isKeyword(curIdentifier)) {
            return new KeywordToken(curIdentifier, posStart, this.pos.copy());
        }
        return new IdentifierToken(curIdentifier, posStart, this.pos.copy());
    };
    Lexer.prototype.makeMulOrPow = function () {
        var posStart = this.pos.copy();
        this.advance();
        if (this.pos.curChar === "*") {
            this.advance();
            return new PowToken(posStart, this.pos.copy());
        }
        return new MulToken(posStart);
    };
    Lexer.prototype.makeNeOrNot = function () {
        var posStart = this.pos.copy();
        this.advance();
        if (this.pos.curChar === "=") {
            this.advance();
            return new NEToken(posStart, this.pos.copy());
        }
        return new NotToken(posStart);
    };
    Lexer.prototype.makeEquals = function () {
        var posStart = this.pos.copy();
        this.advance();
        if (this.pos.curChar === "=") {
            this.advance();
            return new EEToken(posStart, this.pos.copy());
        }
        return new EQToken(posStart);
    };
    Lexer.prototype.makeLessThan = function () {
        var posStart = this.pos.copy();
        this.advance();
        if (this.pos.curChar === "=") {
            this.advance();
            return new LTEToken(posStart, this.pos.copy());
        }
        return new LTToken(posStart);
    };
    Lexer.prototype.makeGreaterThan = function () {
        var posStart = this.pos.copy();
        this.advance();
        if (this.pos.curChar === "=") {
            this.advance();
            return new GTEToken(posStart, this.pos.copy());
        }
        return new GTToken(posStart);
    };
    Lexer.prototype.makeDAnd = function () {
        var lexingPartResult = new LexingPartResult();
        var posStart = this.pos.copy();
        this.advance();
        if (this.pos.curChar === "&") {
            this.advance();
            return lexingPartResult.success(new DAndToken(posStart, this.pos.copy()));
        }
        this.advance();
        return lexingPartResult.failure(new ExpectedCharSeclangError(posStart, this.pos, "'&' (after '&')"));
    };
    Lexer.prototype.makeDOr = function () {
        var lexingPartResult = new LexingPartResult();
        var posStart = this.pos.copy();
        this.advance();
        if (this.pos.curChar === "|") {
            this.advance();
            return lexingPartResult.success(new DOrToken(posStart, this.pos.copy()));
        }
        this.advance();
        return lexingPartResult.failure(new ExpectedCharSeclangError(posStart, this.pos, "'|' (after '|')"));
    };
    Lexer.prototype.makeStringL = function () {
        var _a;
        var lexingPartResult = new LexingPartResult();
        var posStart = this.pos.copy();
        var strClosingChar = this.pos.curChar;
        this.advance();
        var resString = "";
        var escapeMapping = {
            n: "\n",
            t: "\t",
        };
        var escaped = false;
        while (this.pos.curChar != null && (escaped || this.pos.curChar !== strClosingChar)) {
            if (this.pos.curChar === "\\") {
                escaped = true;
            }
            else {
                if (escaped) {
                    resString += (_a = escapeMapping[this.pos.curChar]) !== null && _a !== void 0 ? _a : this.pos.curChar;
                }
                else {
                    resString += this.pos.curChar;
                }
                escaped = false;
            }
            this.advance();
        }
        if (this.pos.curChar !== strClosingChar) {
            return lexingPartResult.failure(new NotClosedStringSeclangError(posStart, this.pos, resString));
        }
        this.advance();
        return lexingPartResult.success(new StringLToken(resString, posStart, this.pos.copy()));
    };
    Lexer.prototype.makeTokens = function () {
        var tokens = [];
        while (this.pos.curChar != null) {
            if (this.isDigit(this.pos.curChar) || this.pos.curChar === ".")
                tokens.push(this.makeNumber());
            else if (this.isIdentifierStartChar(this.pos.curChar))
                tokens.push(this.makeIdentifier());
            else if (this.pos.curChar === "*")
                tokens.push(this.makeMulOrPow());
            else if (this.pos.curChar === "!")
                tokens.push(this.makeNeOrNot());
            else if (this.pos.curChar === "=")
                tokens.push(this.makeEquals());
            else if (this.pos.curChar === "<")
                tokens.push(this.makeLessThan());
            else if (this.pos.curChar === ">")
                tokens.push(this.makeGreaterThan());
            else if (this.pos.curChar === "&") {
                var res = this.makeDAnd();
                if (res.error)
                    return new LexerResult([], res.error);
                tokens.push(res.token);
            }
            else if (this.pos.curChar === "|") {
                var res = this.makeDOr();
                if (res.error)
                    return new LexerResult([], res.error);
                tokens.push(res.token);
            }
            else if (this.pos.curChar === '"' || this.pos.curChar === "'") {
                var res = this.makeStringL();
                if (res.error)
                    return new LexerResult([], res.error);
                tokens.push(res.token);
            }
            else {
                if (this.pos.curChar === "+")
                    tokens.push(new PlusToken(this.pos.copy()));
                else if (this.pos.curChar === "-")
                    tokens.push(new MinusToken(this.pos.copy()));
                else if (this.pos.curChar === "/")
                    tokens.push(new DivToken(this.pos.copy()));
                else if (this.pos.curChar === "/")
                    tokens.push(new DivToken(this.pos.copy()));
                else if (this.pos.curChar === "(")
                    tokens.push(new LParenToken(this.pos.copy()));
                else if (this.pos.curChar === ")")
                    tokens.push(new RParenToken(this.pos.copy()));
                else if (this.pos.curChar === "{")
                    tokens.push(new LCurlyToken(this.pos.copy()));
                else if (this.pos.curChar === "}")
                    tokens.push(new RCurlyToken(this.pos.copy()));
                else if (this.pos.curChar === "[")
                    tokens.push(new LSquareToken(this.pos.copy()));
                else if (this.pos.curChar === "]")
                    tokens.push(new RSquareToken(this.pos.copy()));
                else if (this.pos.curChar === ";")
                    tokens.push(new SemicolonToken(this.pos.copy()));
                else if (this.pos.curChar === "\n")
                    tokens.push(new NewlineToken(this.pos.copy()));
                else if (this.pos.curChar === ",")
                    tokens.push(new CommaToken(this.pos.copy()));
                else if (!this.isWhitespace(this.pos.curChar)) {
                    var char = this.pos.curChar;
                    var posStart = this.pos.copy();
                    this.advance();
                    return new LexerResult([], new IllegalCharSeclangError(posStart, this.pos, "'".concat(char, "'")));
                }
                this.advance();
            }
        }
        tokens.push(new EOFToken(this.pos.copy()));
        return new LexerResult(tokens, null);
    };
    return Lexer;
}());
/* =================== */
// NODES
/* =================== */
var Node = /** @class */ (function () {
    function Node() {
    }
    return Node;
}());
var StringLNode = /** @class */ (function (_super) {
    __extends(StringLNode, _super);
    function StringLNode(token) {
        var _this = _super.call(this) || this;
        _this.posStart = token.posStart;
        _this.posEnd = token.posEnd;
        _this.token = token;
        return _this;
    }
    StringLNode.prototype.toString = function () {
        return "\"".concat(this.token.value, "\"");
    };
    return StringLNode;
}(Node));
var NumberNode = /** @class */ (function (_super) {
    __extends(NumberNode, _super);
    function NumberNode(token) {
        var _this = _super.call(this) || this;
        _this.posStart = token.posStart;
        _this.posEnd = token.posEnd;
        _this.token = token;
        return _this;
    }
    NumberNode.prototype.toString = function () {
        return this.token.toString();
    };
    return NumberNode;
}(Node));
var BinOpNode = /** @class */ (function (_super) {
    __extends(BinOpNode, _super);
    function BinOpNode(leftNode, operationToken, rightNode) {
        var _this = _super.call(this) || this;
        _this.posStart = leftNode.posStart;
        _this.posEnd = rightNode.posEnd;
        _this.leftNode = leftNode;
        _this.operationToken = operationToken;
        _this.rightNode = rightNode;
        return _this;
    }
    BinOpNode.prototype.toString = function () {
        return "(".concat(this.leftNode, ", ").concat(this.operationToken, ", ").concat(this.rightNode, ")");
    };
    return BinOpNode;
}(Node));
var UnaryOpNode = /** @class */ (function (_super) {
    __extends(UnaryOpNode, _super);
    function UnaryOpNode(operationToken, node) {
        var _this = _super.call(this) || this;
        // TODO: take into account that operation token can be in the end (for example, x++)
        _this.posStart = operationToken.posStart;
        _this.posEnd = node.posEnd;
        _this.operationToken = operationToken;
        _this.node = node;
        return _this;
    }
    UnaryOpNode.prototype.toString = function () {
        return "(".concat(this.operationToken, ", ").concat(this.node, ")");
    };
    return UnaryOpNode;
}(Node));
var VarAccessNode = /** @class */ (function (_super) {
    __extends(VarAccessNode, _super);
    function VarAccessNode(varNameToken) {
        var _this = _super.call(this) || this;
        _this.posStart = varNameToken.posStart;
        _this.posEnd = varNameToken.posEnd;
        _this.varNameToken = varNameToken;
        return _this;
    }
    VarAccessNode.prototype.toString = function () {
        return "($".concat(this.varNameToken, ")");
    };
    return VarAccessNode;
}(Node));
var VarAssignNode = /** @class */ (function (_super) {
    __extends(VarAssignNode, _super);
    function VarAssignNode(varNameToken, valueNode) {
        var _this = _super.call(this) || this;
        _this.posStart = varNameToken.posStart;
        _this.posEnd = valueNode.posEnd;
        _this.varNameToken = varNameToken;
        _this.valueNode = valueNode;
        return _this;
    }
    VarAssignNode.prototype.toString = function () {
        return "(".concat(this.varNameToken, " = ").concat(this.valueNode, ")");
    };
    return VarAssignNode;
}(Node));
var CreateVarNode = /** @class */ (function (_super) {
    __extends(CreateVarNode, _super);
    function CreateVarNode(varNameToken, initValNode) {
        var _this = _super.call(this) || this;
        _this.posStart = varNameToken.posStart;
        if (initValNode) {
            _this.posEnd = initValNode.posEnd;
        }
        else {
            _this.posEnd = varNameToken.posEnd;
        }
        _this.varNameToken = varNameToken;
        _this.initValNode = initValNode;
        return _this;
    }
    CreateVarNode.prototype.toString = function () {
        return "(let ".concat(this.varNameToken, " = ").concat(this.initValNode, ")");
    };
    return CreateVarNode;
}(Node));
var IfNode = /** @class */ (function (_super) {
    __extends(IfNode, _super);
    function IfNode(condition, onTrue, onFalse) {
        if (onFalse === void 0) { onFalse = null; }
        var _this = _super.call(this) || this;
        _this.posStart = condition.posStart;
        if (onFalse) {
            _this.posEnd = onFalse.posEnd;
        }
        else {
            _this.posEnd = onTrue.posEnd;
        }
        _this.condition = condition;
        _this.onTrue = onTrue;
        _this.onFalse = onFalse;
        return _this;
    }
    IfNode.prototype.toString = function () {
        if (this.onFalse) {
            return "(if(".concat(this.condition, ") ").concat(this.onTrue, " else ").concat(this.onTrue, ")");
        }
        return "(if(".concat(this.condition, ") ").concat(this.onTrue, " )");
    };
    return IfNode;
}(Node));
var WhileNode = /** @class */ (function (_super) {
    __extends(WhileNode, _super);
    function WhileNode(condition, body) {
        var _this = _super.call(this) || this;
        _this.posStart = condition.posStart;
        _this.posEnd = body.posEnd;
        _this.condition = condition;
        _this.body = body;
        return _this;
    }
    WhileNode.prototype.toString = function () {
        return "(while(".concat(this.condition, ") ").concat(this.body, " )");
    };
    return WhileNode;
}(Node));
var ForNode = /** @class */ (function (_super) {
    __extends(ForNode, _super);
    function ForNode(initStatement, condition, iterateStatement, body) {
        var _this = _super.call(this) || this;
        _this.posStart = initStatement.posStart;
        _this.posEnd = body.posEnd;
        _this.initStatement = initStatement;
        _this.condition = condition;
        _this.iterateStatement = iterateStatement;
        _this.body = body;
        return _this;
    }
    ForNode.prototype.toString = function () {
        return "(for(".concat(this.initStatement, "; ").concat(this.condition, "; ").concat(this.iterateStatement, ") ").concat(this.body, " )");
    };
    return ForNode;
}(Node));
var EmptyNode = /** @class */ (function (_super) {
    __extends(EmptyNode, _super);
    function EmptyNode(posStart, posEnd) {
        var _this = _super.call(this) || this;
        _this.posStart = posStart;
        _this.posEnd = posEnd;
        return _this;
    }
    EmptyNode.prototype.toString = function () {
        return "(-)";
    };
    return EmptyNode;
}(Node));
var FunDefNode = /** @class */ (function (_super) {
    __extends(FunDefNode, _super);
    function FunDefNode(funName, argNames, body) {
        var _this = _super.call(this) || this;
        if (funName !== null) {
            _this.posStart = funName.posStart;
        }
        else if (argNames.length > 0) {
            _this.posStart = argNames[0].posStart;
        }
        else {
            _this.posStart = body.posStart;
        }
        _this.posEnd = body.posEnd;
        _this.funName = funName;
        _this.argNames = argNames;
        _this.body = body;
        return _this;
    }
    FunDefNode.prototype.toString = function () {
        if (this.funName === null) {
            return "(function (".concat(this.argNames.join(", "), ") {").concat(this.body, "} )");
        }
        return "(function ".concat(this.funName, " (").concat(this.argNames.join(", "), ") {").concat(this.body, "} )");
    };
    return FunDefNode;
}(Node));
var FunCallNode = /** @class */ (function (_super) {
    __extends(FunCallNode, _super);
    function FunCallNode(funNameToCallNode, argNodes) {
        var _this = _super.call(this) || this;
        _this.posStart = funNameToCallNode.posStart;
        if (argNodes.length > 0) {
            _this.posEnd = argNodes[argNodes.length - 1].posEnd;
        }
        else {
            _this.posEnd = funNameToCallNode.posEnd;
        }
        _this.funNameToCallNode = funNameToCallNode;
        _this.argNodes = argNodes;
        return _this;
    }
    FunCallNode.prototype.toString = function () {
        return "(".concat(this.funNameToCallNode, " (").concat(this.argNodes.join(", "), "))");
    };
    return FunCallNode;
}(Node));
var ListNode = /** @class */ (function (_super) {
    __extends(ListNode, _super);
    function ListNode(elementNodes, posStart, posEnd) {
        var _this = _super.call(this) || this;
        _this.posStart = posStart;
        _this.posEnd = posEnd;
        _this.elementNodes = elementNodes;
        return _this;
    }
    ListNode.prototype.toString = function () {
        return "[".concat(this.elementNodes.join(", "), "]");
    };
    return ListNode;
}(Node));
var ListInitNode = /** @class */ (function (_super) {
    __extends(ListInitNode, _super);
    function ListInitNode(listNameToken, length) {
        var _this = _super.call(this) || this;
        _this.posStart = listNameToken.posStart;
        _this.posEnd = length.posEnd;
        _this.listNameToken = listNameToken;
        _this.length = length;
        return _this;
    }
    ListInitNode.prototype.toString = function () {
        return "".concat(this.listNameToken.value, "[").concat(this.length, "]");
    };
    return ListInitNode;
}(Node));
var ListAccessNode = /** @class */ (function (_super) {
    __extends(ListAccessNode, _super);
    function ListAccessNode(listNameNode, indexNode) {
        var _this = _super.call(this) || this;
        _this.posStart = listNameNode.posStart;
        _this.posEnd = indexNode.posEnd;
        _this.listNameNode = listNameNode;
        _this.indexNode = indexNode;
        return _this;
    }
    ListAccessNode.prototype.toString = function () {
        return "".concat(this.listNameNode, "[").concat(this.indexNode, "]");
    };
    return ListAccessNode;
}(Node));
var ListSetNode = /** @class */ (function (_super) {
    __extends(ListSetNode, _super);
    function ListSetNode(listNameNode, indexNode, valNode) {
        var _this = _super.call(this) || this;
        _this.posStart = listNameNode.posStart;
        _this.posEnd = valNode.posEnd;
        _this.listNameNode = listNameNode;
        _this.indexNode = indexNode;
        _this.valNode = valNode;
        return _this;
    }
    ListSetNode.prototype.toString = function () {
        return "".concat(this.listNameNode, "[").concat(this.indexNode, "] = ").concat(this.valNode);
    };
    return ListSetNode;
}(Node));
var StatementsNode = /** @class */ (function (_super) {
    __extends(StatementsNode, _super);
    function StatementsNode(statementNodes, posStart, posEnd) {
        var _this = _super.call(this) || this;
        _this.posStart = posStart;
        _this.posEnd = posEnd;
        _this.statementNodes = statementNodes;
        return _this;
    }
    StatementsNode.prototype.toString = function () {
        return "{".concat(this.statementNodes.join("; "), "}");
    };
    return StatementsNode;
}(Node));
/* =================== */
// PARSER
/* =================== */
var ParserResult = /** @class */ (function (_super) {
    __extends(ParserResult, _super);
    function ParserResult() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ParserResult.prototype.toString = function () {
        return this.result.toString();
    };
    return ParserResult;
}(StepResult));
var ParseNodeResult = /** @class */ (function () {
    function ParseNodeResult() {
        this.node = null;
        this.error = null;
        this.advanceCount = 0;
        this.backtrackCount = 0;
    }
    ParseNodeResult.prototype.registerAdvancement = function () {
        this.advanceCount++;
    };
    ParseNodeResult.prototype.unregisterAdvancement = function (amount) {
        if (amount === void 0) { amount = 1; }
        this.advanceCount -= amount;
        this.backtrackCount -= amount;
    };
    ParseNodeResult.prototype.resetAdvancementCount = function () {
        this.advanceCount = 0;
    };
    ParseNodeResult.prototype.registerChild = function (res) {
        this.advanceCount += res.advanceCount;
        if (res.error) {
            this.error = res.error;
        }
        return res.node;
    };
    ParseNodeResult.prototype.registerTry = function (res) {
        if (res.error) {
            this.backtrackCount += res.advanceCount;
            return null;
        }
        this.advanceCount += res.advanceCount;
        return res.node;
    };
    ParseNodeResult.prototype.success = function (node) {
        this.node = node;
        return this;
    };
    ParseNodeResult.prototype.failure = function (error) {
        if (this.error === null || this.advanceCount === 0) {
            this.error = error;
        }
        return this;
    };
    return ParseNodeResult;
}());
var Parser = /** @class */ (function () {
    function Parser(tokens) {
        this.tokens = tokens;
        this.tokenIdx = -1;
        this.curToken = null;
        this.advance();
    }
    Parser.prototype.advance = function () {
        this.tokenIdx++;
        if (this.tokenIdx < this.tokens.length) {
            this.curToken = this.tokens[this.tokenIdx];
        }
        else {
            this.curToken = null;
        }
    };
    Parser.prototype.unadvance = function (amount) {
        if (amount === void 0) { amount = 1; }
        this.tokenIdx -= amount;
        if (this.tokenIdx < this.tokens.length) {
            this.curToken = this.tokens[this.tokenIdx];
        }
        else {
            this.curToken = null;
        }
    };
    Parser.prototype.parse = function () {
        var res = this.makeStatements();
        if (res.error) {
            return new ParserResult(null, res.error);
        }
        if (!(this.curToken instanceof EOFToken)) {
            return new ParserResult(null, new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '+', '-', '*', '/', '**', '&&', '||', '==', '!=', '<', '> ,'<=', '>='"));
        }
        return new ParserResult(res.node, null);
    };
    Parser.prototype.makeFunDef = function () {
        var res = new ParseNodeResult();
        var funName = null;
        if (this.curToken instanceof IdentifierToken) {
            funName = this.curToken;
            res.registerAdvancement();
            this.advance();
        }
        if (!(this.curToken instanceof LParenToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '('"));
        }
        res.registerAdvancement();
        this.advance();
        var argNames = [];
        if (this.curToken instanceof IdentifierToken) {
            argNames.push(this.curToken);
            res.registerAdvancement();
            this.advance();
            while (this.curToken instanceof CommaToken) {
                res.registerAdvancement();
                this.advance();
                if (!(this.curToken instanceof IdentifierToken)) {
                    return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected 'argument name'"));
                }
                argNames.push(this.curToken);
                res.registerAdvancement();
                this.advance();
            }
        }
        if (!(this.curToken instanceof RParenToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected ')'"));
        }
        res.registerAdvancement();
        this.advance();
        if (this.curToken instanceof LCurlyToken) {
            res.registerAdvancement();
            this.advance();
            var funBody_1 = res.registerChild(this.makeStatements());
            if (res.error)
                return res;
            if (!(this.curToken instanceof RCurlyToken)) {
                return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '}'"));
            }
            res.registerAdvancement();
            this.advance();
            return res.success(new FunDefNode(funName, argNames, funBody_1));
        }
        var funBody = res.registerChild(this.makeExpr());
        if (res.error)
            return res;
        return res.success(new FunDefNode(funName, argNames, funBody));
    };
    Parser.prototype.makeList = function () {
        var res = new ParseNodeResult();
        var elementNodes = [];
        var posStart = this.curToken.posStart.copy();
        if (!(this.curToken instanceof RSquareToken)) {
            var firstElNode = res.registerChild(this.makeExpr());
            if (res.error)
                return res;
            elementNodes.push(firstElNode);
            while (this.curToken instanceof CommaToken) {
                res.registerAdvancement();
                this.advance();
                var curElNode = res.registerChild(this.makeExpr());
                if (res.error)
                    return res;
                elementNodes.push(curElNode);
            }
        }
        if (!(this.curToken instanceof RSquareToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "expected ']'"));
        }
        res.registerAdvancement();
        this.advance();
        return res.success(new ListNode(elementNodes, posStart, this.curToken.posEnd.copy()));
    };
    Parser.prototype.makeAtom = function () {
        var res = new ParseNodeResult();
        var firstToken = this.curToken;
        if (this.curToken instanceof KeywordToken && this.curToken.value === "function") {
            res.registerAdvancement();
            this.advance();
            return this.makeFunDef();
        }
        if (this.curToken instanceof LSquareToken) {
            res.registerAdvancement();
            this.advance();
            return this.makeList();
        }
        if (firstToken instanceof IdentifierToken) {
            res.registerAdvancement();
            this.advance();
            return res.success(new VarAccessNode(firstToken));
        }
        else if (firstToken instanceof IntToken || firstToken instanceof FloatToken) {
            res.registerAdvancement();
            this.advance();
            return res.success(new NumberNode(firstToken));
        }
        else if (firstToken instanceof StringLToken) {
            res.registerAdvancement();
            this.advance();
            return res.success(new StringLNode(firstToken));
        }
        else if (firstToken instanceof LParenToken) {
            res.registerAdvancement();
            this.advance();
            var expr = res.registerChild(this.makeExpr());
            if (res.error)
                return res;
            if (this.curToken instanceof RParenToken) {
                res.registerAdvancement();
                this.advance();
                return res.success(expr);
            }
            else {
                return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected ')'"));
            }
        }
        return res.failure(new InvalidSyntaxSeclangError(firstToken.posStart, firstToken.posEnd, "Expected int or float"));
    };
    Parser.prototype.makeFunCall = function (atom) {
        var res = new ParseNodeResult();
        var argNodes = [];
        if (!(this.curToken instanceof RParenToken)) {
            var firstArgNode = res.registerChild(this.makeExpr());
            if (res.error)
                return res;
            argNodes.push(firstArgNode);
            while (this.curToken instanceof CommaToken) {
                res.registerAdvancement();
                this.advance();
                var curArgNode = res.registerChild(this.makeExpr());
                if (res.error)
                    return res;
                argNodes.push(curArgNode);
            }
        }
        if (!(this.curToken instanceof RParenToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected ')'"));
        }
        res.registerAdvancement();
        this.advance();
        return res.success(new FunCallNode(atom, argNodes));
    };
    Parser.prototype.makeListManip = function (atom) {
        var res = new ParseNodeResult();
        var index = res.registerChild(this.makeExpr());
        if (res.error)
            return res;
        if (!(this.curToken instanceof RSquareToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected ']'"));
        }
        res.registerAdvancement();
        this.advance();
        if (this.curToken instanceof EQToken) {
            res.registerAdvancement();
            this.advance();
            var value = res.registerChild(this.makeExpr());
            if (res.error)
                return res;
            return res.success(new ListSetNode(atom, index, value));
        }
        return res.success(new ListAccessNode(atom, index));
    };
    Parser.prototype.makeAtomManip = function () {
        var res = new ParseNodeResult();
        var atom = res.registerChild(this.makeAtom());
        if (res.error)
            return res;
        if (this.curToken instanceof LParenToken) {
            res.registerAdvancement();
            this.advance();
            return this.makeFunCall(atom);
        }
        if (this.curToken instanceof LSquareToken) {
            res.registerAdvancement();
            this.advance();
            return this.makeListManip(atom);
        }
        return res.success(atom);
    };
    Parser.prototype.makePower = function () {
        var res = new ParseNodeResult();
        var atom = res.registerChild(this.makeAtomManip());
        if (res.error)
            return res;
        if (this.curToken instanceof PowToken) {
            var powerToken = this.curToken;
            res.registerAdvancement();
            this.advance();
            var powIndex = res.registerChild(this.makeFactor());
            if (res.error)
                return res;
            return res.success(new BinOpNode(atom, powerToken, powIndex));
        }
        return res.success(atom);
    };
    Parser.prototype.makeFactor = function () {
        var res = new ParseNodeResult();
        var firstToken = this.curToken;
        if (firstToken instanceof PlusToken || firstToken instanceof MinusToken) {
            res.registerAdvancement();
            this.advance();
            var factor = res.registerChild(this.makeFactor());
            if (res.error)
                return res;
            return res.success(new UnaryOpNode(firstToken, factor));
        }
        return this.makePower();
    };
    Parser.prototype.makeTerm = function () {
        var res = new ParseNodeResult();
        var left = res.registerChild(this.makeFactor());
        if (res.error)
            return res;
        while (this.curToken instanceof MulToken || this.curToken instanceof DivToken) {
            var operationToken = this.curToken;
            res.registerAdvancement();
            this.advance();
            var right = res.registerChild(this.makeFactor());
            if (res.error)
                return res;
            left = new BinOpNode(left, operationToken, right);
        }
        return res.success(left);
    };
    Parser.prototype.makeArithmExpr = function () {
        var res = new ParseNodeResult();
        var left = res.registerChild(this.makeTerm());
        if (res.error)
            return res;
        while (this.curToken instanceof PlusToken || this.curToken instanceof MinusToken) {
            var operationToken = this.curToken;
            res.registerAdvancement();
            this.advance();
            var right = res.registerChild(this.makeTerm());
            if (res.error)
                return res;
            left = new BinOpNode(left, operationToken, right);
        }
        return res.success(left);
    };
    Parser.prototype.makeNoExpr = function () {
        var res = new ParseNodeResult();
        if (this.curToken instanceof NotToken) {
            var notToken = this.curToken;
            res.registerAdvancement();
            this.advance();
            var arithmExpr = res.registerChild(this.makeNoExpr());
            if (res.error)
                return res;
            return res.success(new UnaryOpNode(notToken, arithmExpr));
        }
        return this.makeArithmExpr();
    };
    Parser.prototype.makeCompExpr = function () {
        var res = new ParseNodeResult();
        var left = res.registerChild(this.makeNoExpr());
        if (res.error) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '!', int or float"));
        }
        while (this.curToken instanceof EEToken ||
            this.curToken instanceof NEToken ||
            this.curToken instanceof LTToken ||
            this.curToken instanceof GTToken ||
            this.curToken instanceof LTEToken ||
            this.curToken instanceof GTEToken) {
            var operationToken = this.curToken;
            res.registerAdvancement();
            this.advance();
            var right = res.registerChild(this.makeNoExpr());
            if (res.error)
                return res;
            left = new BinOpNode(left, operationToken, right);
        }
        return res.success(left);
    };
    Parser.prototype.makeAndLogExpr = function () {
        var res = new ParseNodeResult();
        var left = res.registerChild(this.makeCompExpr());
        if (res.error)
            return res;
        while (this.curToken instanceof DAndToken) {
            var operationToken = this.curToken;
            res.registerAdvancement();
            this.advance();
            var right = res.registerChild(this.makeCompExpr());
            if (res.error)
                return res;
            left = new BinOpNode(left, operationToken, right);
        }
        return res.success(left);
    };
    Parser.prototype.makeExpr = function () {
        var res = new ParseNodeResult();
        if (this.curToken instanceof KeywordToken && this.curToken.value === "let") {
            res.registerAdvancement();
            this.advance();
            if (!(this.curToken instanceof IdentifierToken)) {
                return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected variable name"));
            }
            var varName = this.curToken;
            res.registerAdvancement();
            this.advance();
            if (this.curToken instanceof LSquareToken) {
                res.registerAdvancement();
                this.advance();
                var listLen = res.registerChild(this.makeExpr());
                if (!(this.curToken instanceof RSquareToken)) {
                    return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected ']"));
                }
                res.registerAdvancement();
                this.advance();
                return res.success(new ListInitNode(varName, listLen));
            }
            if (!(this.curToken instanceof EQToken)) {
                return res.success(new CreateVarNode(varName, null));
            }
            res.registerAdvancement();
            this.advance();
            var initVal = res.registerChild(this.makeExpr());
            if (res.error)
                return res;
            return res.success(new CreateVarNode(varName, initVal));
        }
        if (this.curToken instanceof IdentifierToken) {
            var varName = this.curToken;
            res.registerAdvancement();
            this.advance();
            if (this.curToken instanceof EQToken) {
                res.registerAdvancement();
                this.advance();
                var newVal = res.registerChild(this.makeExpr());
                if (res.error)
                    return res;
                return res.success(new VarAssignNode(varName, newVal));
            }
            res.unregisterAdvancement();
            this.unadvance();
        }
        var left = res.registerChild(this.makeAndLogExpr());
        if (res.error) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '!', 'let', int or float"));
        }
        while (this.curToken instanceof DOrToken) {
            var operationToken = this.curToken;
            res.registerAdvancement();
            this.advance();
            var right = res.registerChild(this.makeAndLogExpr());
            if (res.error)
                return res;
            left = new BinOpNode(left, operationToken, right);
        }
        return res.success(left);
    };
    Parser.prototype.makeStatementIf = function () {
        var res = new ParseNodeResult();
        if (!(this.curToken instanceof LParenToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '('"));
        }
        res.registerAdvancement();
        this.advance();
        var condition = res.registerChild(this.makeExpr());
        if (res.error)
            return res;
        if (!(this.curToken instanceof RParenToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected ')'"));
        }
        res.registerAdvancement();
        this.advance();
        res.resetAdvancementCount();
        if (!(this.curToken instanceof LCurlyToken)) {
            var onTrueStatement_1 = res.registerChild(this.makeExpr());
            if (res.error) {
                return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '{', '!', 'let', int or float"));
            }
            return res.success(new IfNode(condition, onTrueStatement_1));
        }
        res.registerAdvancement();
        this.advance();
        var onTrueStatement = res.registerChild(this.makeStatements());
        if (res.error) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '{', 'if', '!', 'let', int or float"));
        }
        if (!(this.curToken instanceof RCurlyToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '}'"));
        }
        res.registerAdvancement();
        this.advance();
        if (this.curToken instanceof KeywordToken && this.curToken.value === "else") {
            res.registerAdvancement();
            this.advance();
            res.resetAdvancementCount();
            var elseHasCurly = this.curToken instanceof LCurlyToken;
            if (elseHasCurly) {
                res.registerAdvancement();
                this.advance();
            }
            var onFalseStatement = res.registerChild(this.makeStatements());
            if (res.error) {
                return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '{', 'if', '!', 'let', int or float"));
            }
            if (elseHasCurly) {
                if (!(this.curToken instanceof RCurlyToken)) {
                    return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '}'"));
                }
                res.registerAdvancement();
                this.advance();
            }
            return res.success(new IfNode(condition, onTrueStatement, onFalseStatement));
        }
        return res.success(new IfNode(condition, onTrueStatement));
    };
    Parser.prototype.makeStatementWhile = function () {
        var res = new ParseNodeResult();
        if (!(this.curToken instanceof LParenToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '('"));
        }
        res.registerAdvancement();
        this.advance();
        var condition = res.registerChild(this.makeExpr());
        if (res.error)
            return res;
        if (!(this.curToken instanceof RParenToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected ')'"));
        }
        res.registerAdvancement();
        this.advance();
        res.resetAdvancementCount();
        if (!(this.curToken instanceof LCurlyToken)) {
            var whileBody_1 = res.registerChild(this.makeExpr());
            if (res.error) {
                return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '{', '!', 'let', int or float"));
            }
            return res.success(new WhileNode(condition, whileBody_1));
        }
        res.registerAdvancement();
        this.advance();
        var whileBody = res.registerChild(this.makeStatements());
        if (res.error) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '{', 'while', 'if', '!', 'let', int or float"));
        }
        if (!(this.curToken instanceof RCurlyToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '}'"));
        }
        res.registerAdvancement();
        this.advance();
        return res.success(new WhileNode(condition, whileBody));
    };
    Parser.prototype.makeStatementFor = function () {
        var res = new ParseNodeResult();
        if (!(this.curToken instanceof LParenToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '('"));
        }
        res.registerAdvancement();
        this.advance();
        var initStatement = null;
        if (!(this.curToken instanceof SemicolonToken)) {
            initStatement = res.registerChild(this.makeExpr());
            if (res.error)
                return res;
        }
        else {
            initStatement = new EmptyNode(this.curToken.posStart.copy(), this.curToken.posEnd.copy());
        }
        if (!(this.curToken instanceof SemicolonToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected ';'"));
        }
        res.registerAdvancement();
        this.advance();
        var condition = null;
        if (!(this.curToken instanceof SemicolonToken)) {
            condition = res.registerChild(this.makeExpr());
            if (res.error)
                return res;
        }
        else {
            condition = new EmptyNode(this.curToken.posStart.copy(), this.curToken.posEnd.copy());
        }
        if (!(this.curToken instanceof SemicolonToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected ';'"));
        }
        res.registerAdvancement();
        this.advance();
        var iterateStatement = null;
        if (!(this.curToken instanceof RParenToken)) {
            iterateStatement = res.registerChild(this.makeExpr());
            if (res.error)
                return res;
        }
        else {
            iterateStatement = new EmptyNode(this.curToken.posStart.copy(), this.curToken.posEnd.copy());
        }
        if (!(this.curToken instanceof RParenToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected ')'"));
        }
        res.registerAdvancement();
        this.advance();
        res.resetAdvancementCount();
        if (!(this.curToken instanceof LCurlyToken)) {
            var forBody_1 = res.registerChild(this.makeExpr());
            if (res.error) {
                return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '{', '!', 'let', int or float"));
            }
            return res.success(new ForNode(initStatement, condition, iterateStatement, forBody_1));
        }
        res.registerAdvancement();
        this.advance();
        var forBody = res.registerChild(this.makeStatements());
        if (res.error) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '{', 'for', 'while', 'if', '!', 'let', int or float"));
        }
        if (!(this.curToken instanceof RCurlyToken)) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected '}'"));
        }
        res.registerAdvancement();
        this.advance();
        return res.success(new ForNode(initStatement, condition, iterateStatement, forBody));
    };
    Parser.prototype.makeStatement = function () {
        var res = new ParseNodeResult();
        if (this.curToken instanceof RCurlyToken) {
            return res.success(new EmptyNode(this.curToken.posStart, this.curToken.posEnd));
        }
        if (this.curToken instanceof KeywordToken && this.curToken.value === "if") {
            res.registerAdvancement();
            this.advance();
            return this.makeStatementIf();
        }
        if (this.curToken instanceof KeywordToken && this.curToken.value === "while") {
            res.registerAdvancement();
            this.advance();
            return this.makeStatementWhile();
        }
        if (this.curToken instanceof KeywordToken && this.curToken.value === "for") {
            res.registerAdvancement();
            this.advance();
            return this.makeStatementFor();
        }
        var expr = res.registerChild(this.makeExpr());
        if (res.error) {
            return res.failure(new InvalidSyntaxSeclangError(this.curToken.posStart, this.curToken.posEnd, "Expected 'for', 'while', 'if', '!', 'let', int or float"));
        }
        return res.success(expr);
    };
    // read any number of newlines/semicolons
    Parser.prototype.readAllNewlines = function () {
        var res = new ParseNodeResult();
        while (this.curToken instanceof NewlineToken || this.curToken instanceof SemicolonToken) {
            res.registerAdvancement();
            this.advance();
        }
        return res.success(null);
    };
    Parser.prototype.makeStatements = function () {
        var res = new ParseNodeResult();
        var statementNodes = [];
        var posStart = this.curToken.posStart.copy();
        if (this.curToken instanceof EOFToken) {
            return res.success(new EmptyNode(this.curToken.posStart.copy(), this.curToken.posEnd.copy()));
        }
        res.registerChild(this.readAllNewlines());
        while (this.curToken != null) {
            var curStatement = res.registerTry(this.makeStatement());
            // backtrack and exit in case of an error
            if (curStatement === null) {
                res.unregisterAdvancement(res.backtrackCount);
                this.unadvance(res.backtrackCount);
                break;
            }
            statementNodes.push(curStatement);
            // no more neline separators - stop reading statements
            if (!(this.curToken instanceof NewlineToken || this.curToken instanceof SemicolonToken))
                break;
            // read all other newlines
            res.registerChild(this.readAllNewlines());
        }
        // read all other newlines
        res.registerChild(this.readAllNewlines());
        return res.success(new StatementsNode(statementNodes, posStart, this.curToken.posEnd.copy()));
    };
    return Parser;
}());
/* =================== */
// CONTEXT
/* =================== */
var Context = /** @class */ (function () {
    function Context(displayName, parentContext, parentEntryPos) {
        if (parentContext === void 0) { parentContext = null; }
        if (parentEntryPos === void 0) { parentEntryPos = null; }
        this.displayName = displayName;
        this.parentContext = parentContext;
        this.parentEntryPos = parentEntryPos;
        this.symbolTable = null;
    }
    return Context;
}());
/* =================== */
// SYMBOL TABLE
/* =================== */
var SymbolTable = /** @class */ (function () {
    function SymbolTable(parentTable) {
        if (parentTable === void 0) { parentTable = null; }
        this.symbols = new Map();
        this.parentTable = parentTable;
    }
    SymbolTable.prototype.get = function (name) {
        var curTable = this;
        while (curTable !== null && !curTable.symbols.has(name)) {
            curTable = curTable.parentTable;
        }
        if (!curTable)
            return null;
        return curTable.symbols.get(name);
    };
    SymbolTable.prototype.isDefined = function (name) {
        return this.symbols.has(name);
    };
    SymbolTable.prototype.set = function (name, value) {
        var curTable = this;
        while (curTable !== null && !curTable.symbols.has(name)) {
            curTable = curTable.parentTable;
        }
        if (!curTable) {
            throw new Error("Trying to set a value for a variable (".concat(name, " = ").concat(value, ") without first creating it (calling 'setNew')"));
        }
        curTable.symbols.set(name, value);
    };
    SymbolTable.prototype.setNew = function (name, value) {
        this.symbols.set(name, value);
    };
    SymbolTable.prototype.remove = function (name) {
        this.symbols.delete(name);
    };
    return SymbolTable;
}());
/* =================== */
// INTERPRETER
/* =================== */
var InterpreterResult = /** @class */ (function (_super) {
    __extends(InterpreterResult, _super);
    function InterpreterResult() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    InterpreterResult.prototype.toString = function () {
        return this.result.toString();
    };
    return InterpreterResult;
}(StepResult));
var SeclangValue = /** @class */ (function () {
    function SeclangValue() {
        this.context = null;
        this.posStart = null;
        this.posEnd = null;
    }
    SeclangValue.prototype.setContext = function (context) {
        this.context = context;
        return this;
    };
    SeclangValue.prototype.setPos = function (posStart, posEnd) {
        if (posStart === void 0) { posStart = null; }
        if (posEnd === void 0) { posEnd = null; }
        this.posStart = posStart;
        this.posEnd = posEnd;
        return this;
    };
    SeclangValue.prototype.copy = function () {
        throw new Error("No copy method defined");
        return null;
    };
    SeclangValue.prototype.toString = function () {
        throw new Error("No toString method defined");
        return null;
    };
    SeclangValue.prototype.asString = function () {
        throw new Error("No asString method defined");
        return null;
    };
    SeclangValue.prototype.illegalOperation = function (other) {
        if (other === void 0) { other = null; }
        if (other === null) {
            other = this;
        }
        return new RuntimeSeclangError(this.posStart, other.posEnd, "Illegal operation", this.context);
    };
    SeclangValue.prototype.addTo = function (other) {
        return [null, this.illegalOperation(other)];
    };
    SeclangValue.prototype.subBy = function (other) {
        return [null, this.illegalOperation(other)];
    };
    SeclangValue.prototype.multBy = function (other) {
        return [null, this.illegalOperation(other)];
    };
    SeclangValue.prototype.divBy = function (other) {
        return [null, this.illegalOperation(other)];
    };
    SeclangValue.prototype.toPow = function (other) {
        return [null, this.illegalOperation(other)];
    };
    SeclangValue.prototype.getCompEq = function (other) {
        return [null, this.illegalOperation(other)];
    };
    SeclangValue.prototype.getCompNe = function (other) {
        return [null, this.illegalOperation(other)];
    };
    SeclangValue.prototype.getCompLt = function (other) {
        return [null, this.illegalOperation(other)];
    };
    SeclangValue.prototype.getCompGt = function (other) {
        return [null, this.illegalOperation(other)];
    };
    SeclangValue.prototype.getCompLte = function (other) {
        return [null, this.illegalOperation(other)];
    };
    SeclangValue.prototype.getCompGte = function (other) {
        return [null, this.illegalOperation(other)];
    };
    SeclangValue.prototype.getAndWith = function (other) {
        return [null, this.illegalOperation(other)];
    };
    SeclangValue.prototype.getOrWith = function (other) {
        return [null, this.illegalOperation(other)];
    };
    SeclangValue.prototype.notted = function () {
        return [null, this.illegalOperation()];
    };
    SeclangValue.prototype.toBool = function () {
        return false;
    };
    return SeclangValue;
}());
var SeclangNumber = /** @class */ (function (_super) {
    __extends(SeclangNumber, _super);
    function SeclangNumber(value) {
        var _this = _super.call(this) || this;
        _this.value = value;
        return _this;
    }
    SeclangNumber.prototype.copy = function () {
        var copy = new SeclangNumber(this.value);
        copy.context = this.context;
        copy.posStart = this.posStart;
        copy.posEnd = this.posEnd;
        return copy;
    };
    SeclangNumber.prototype.toString = function () {
        if (this.value === null)
            return "null";
        return this.value.toString();
    };
    SeclangNumber.prototype.asString = function () {
        return this.toString();
    };
    SeclangNumber.prototype.addTo = function (other) {
        if (other instanceof SeclangNumber)
            return [new SeclangNumber(this.value + other.value).setContext(this.context), null];
        if (other instanceof SeclangString)
            return [
                new SeclangString(this.value + other.value.toString()).setContext(this.context),
                null,
            ];
        return [null, this.illegalOperation(other)];
    };
    SeclangNumber.prototype.subBy = function (other) {
        if (!(other instanceof SeclangNumber))
            return [null, this.illegalOperation(other)];
        return [new SeclangNumber(this.value - other.value).setContext(this.context), null];
    };
    SeclangNumber.prototype.multBy = function (other) {
        if (!(other instanceof SeclangNumber))
            return [null, this.illegalOperation(other)];
        return [new SeclangNumber(this.value * other.value).setContext(this.context), null];
    };
    SeclangNumber.prototype.divBy = function (other) {
        if (!(other instanceof SeclangNumber))
            return [null, this.illegalOperation(other)];
        if (other.value === 0) {
            return [
                null,
                new RuntimeSeclangError(other.posStart, other.posEnd, "Division by zero", this.context),
            ];
        }
        return [new SeclangNumber(this.value / other.value).setContext(this.context), null];
    };
    SeclangNumber.prototype.toPow = function (other) {
        if (!(other instanceof SeclangNumber))
            return [null, this.illegalOperation(other)];
        return [new SeclangNumber(Math.pow(this.value, other.value)).setContext(this.context), null];
    };
    SeclangNumber.prototype.getCompEq = function (other) {
        if (!(other instanceof SeclangNumber))
            return [null, this.illegalOperation(other)];
        return [
            SeclangNumber.boolToSeclandNum(this.value === other.value).setContext(this.context),
            null,
        ];
    };
    SeclangNumber.prototype.getCompNe = function (other) {
        if (!(other instanceof SeclangNumber))
            return [null, this.illegalOperation(other)];
        return [
            SeclangNumber.boolToSeclandNum(this.value !== other.value).setContext(this.context),
            null,
        ];
    };
    SeclangNumber.prototype.getCompLt = function (other) {
        if (!(other instanceof SeclangNumber))
            return [null, this.illegalOperation(other)];
        return [
            SeclangNumber.boolToSeclandNum(this.value < other.value).setContext(this.context),
            null,
        ];
    };
    SeclangNumber.prototype.getCompGt = function (other) {
        if (!(other instanceof SeclangNumber))
            return [null, this.illegalOperation(other)];
        return [
            SeclangNumber.boolToSeclandNum(this.value > other.value).setContext(this.context),
            null,
        ];
    };
    SeclangNumber.prototype.getCompLte = function (other) {
        if (!(other instanceof SeclangNumber))
            return [null, this.illegalOperation(other)];
        return [
            SeclangNumber.boolToSeclandNum(this.value <= other.value).setContext(this.context),
            null,
        ];
    };
    SeclangNumber.prototype.getCompGte = function (other) {
        if (!(other instanceof SeclangNumber))
            return [null, this.illegalOperation(other)];
        return [
            SeclangNumber.boolToSeclandNum(this.value >= other.value).setContext(this.context),
            null,
        ];
    };
    SeclangNumber.prototype.getAndWith = function (other) {
        if (!(other instanceof SeclangNumber))
            return [null, this.illegalOperation(other)];
        return [
            SeclangNumber.boolToSeclandNum(this.toBool() && other.toBool()).setContext(this.context),
            null,
        ];
    };
    SeclangNumber.prototype.getOrWith = function (other) {
        if (!(other instanceof SeclangNumber))
            return [null, this.illegalOperation(other)];
        return [
            SeclangNumber.boolToSeclandNum(this.toBool() || other.toBool()).setContext(this.context),
            null,
        ];
    };
    SeclangNumber.prototype.notted = function () {
        return [SeclangNumber.boolToSeclandNum(!this.toBool()).setContext(this.context), null];
    };
    SeclangNumber.boolToSeclandNum = function (value) {
        if (value)
            return new SeclangNumber(1);
        return new SeclangNumber(0);
    };
    SeclangNumber.prototype.toBool = function () {
        if (this.value === 0)
            return false;
        return true;
    };
    SeclangNumber.false = new SeclangNumber(0);
    SeclangNumber.true = new SeclangNumber(1);
    return SeclangNumber;
}(SeclangValue));
var SeclangBaseFunction = /** @class */ (function (_super) {
    __extends(SeclangBaseFunction, _super);
    function SeclangBaseFunction(name) {
        var _this = _super.call(this) || this;
        if (name === null) {
            _this.name = "<anonymous>";
        }
        else {
            _this.name = name;
        }
        return _this;
    }
    SeclangBaseFunction.prototype.toString = function () {
        return "<function ".concat(this.name, ">");
    };
    SeclangBaseFunction.prototype.asString = function () {
        return this.toString();
    };
    SeclangBaseFunction.prototype.generateNewContext = function () {
        var newContext = new Context(this.name, this.context, this.posStart);
        newContext.symbolTable = new SymbolTable(this.context.symbolTable);
        return newContext;
    };
    SeclangBaseFunction.prototype.checkArgs = function (argNames, args) {
        var res = new RuntimeResult();
        if (args.length !== argNames.length) {
            return res.failure(new RuntimeSeclangError(this.posStart, this.posEnd, "".concat(this.name, " function expected ").concat(argNames.length, " arguments but ").concat(args.length, " were passed"), this.context));
        }
        return res.success(null);
    };
    SeclangBaseFunction.prototype.populateArgs = function (argNames, args, newContext) {
        args.forEach(function (argValue, idx) {
            var argName = argNames[idx];
            argValue.setContext(newContext);
            newContext.symbolTable.setNew(argName, argValue);
        });
    };
    SeclangBaseFunction.prototype.execute = function (args) {
        throw new Error("'execute' method is not implemented for function '".concat(this.name, "'"));
        return null;
    };
    return SeclangBaseFunction;
}(SeclangValue));
var SeclangFunction = /** @class */ (function (_super) {
    __extends(SeclangFunction, _super);
    function SeclangFunction(name, bodyNode, argNames) {
        var _this = _super.call(this, name) || this;
        _this.bodyNode = bodyNode;
        _this.argNames = argNames;
        return _this;
    }
    SeclangFunction.prototype.copy = function () {
        var copy = new SeclangFunction(this.name, this.bodyNode, this.argNames);
        copy.context = this.context;
        copy.posStart = this.posStart;
        copy.posEnd = this.posEnd;
        return copy;
    };
    SeclangFunction.prototype.execute = function (args) {
        var res = new RuntimeResult();
        var interpreter = new Interpreter();
        var newContext = this.generateNewContext();
        res.registerChild(this.checkArgs(this.argNames, args));
        if (res.error)
            return res;
        this.populateArgs(this.argNames, args, newContext);
        var value = res.registerChild(interpreter.visit(this.bodyNode, newContext));
        if (res.error)
            return res;
        return res.success(value);
    };
    return SeclangFunction;
}(SeclangBaseFunction));
var SeclangPrintFunction = /** @class */ (function (_super) {
    __extends(SeclangPrintFunction, _super);
    function SeclangPrintFunction() {
        var _this = _super.call(this, "print") || this;
        _this.argNames = ["value"];
        return _this;
    }
    SeclangPrintFunction.prototype.copy = function () {
        var copy = new SeclangPrintFunction();
        copy.context = this.context;
        copy.posStart = this.posStart;
        copy.posEnd = this.posEnd;
        return copy;
    };
    SeclangPrintFunction.prototype.execute = function (args) {
        var res = new RuntimeResult();
        var newContext = this.generateNewContext();
        res.registerChild(this.checkArgs(this.argNames, args));
        if (res.error)
            return res;
        this.populateArgs(this.argNames, args, newContext);
        console.log(newContext.symbolTable.get("value").asString());
        return res.success(new SeclangNumber(null));
    };
    return SeclangPrintFunction;
}(SeclangBaseFunction));
var SeclangSqrtFunction = /** @class */ (function (_super) {
    __extends(SeclangSqrtFunction, _super);
    function SeclangSqrtFunction() {
        var _this = _super.call(this, "sqrt") || this;
        _this.argNames = ["value"];
        return _this;
    }
    SeclangSqrtFunction.prototype.copy = function () {
        var copy = new SeclangSqrtFunction();
        copy.context = this.context;
        copy.posStart = this.posStart;
        copy.posEnd = this.posEnd;
        return copy;
    };
    SeclangSqrtFunction.prototype.execute = function (args) {
        var res = new RuntimeResult();
        var newContext = this.generateNewContext();
        res.registerChild(this.checkArgs(this.argNames, args));
        if (res.error)
            return res;
        this.populateArgs(this.argNames, args, newContext);
        var val = newContext.symbolTable.get("value");
        if (!(val instanceof SeclangNumber)) {
            return res.failure(new RuntimeSeclangError(this.posStart, this.posEnd, "sqrt accept argument of type number", this.context));
        }
        var sqrtRes = Math.sqrt(val.value);
        return res.success(new SeclangNumber(sqrtRes));
    };
    return SeclangSqrtFunction;
}(SeclangBaseFunction));
var SeclangString = /** @class */ (function (_super) {
    __extends(SeclangString, _super);
    function SeclangString(value) {
        var _this = _super.call(this) || this;
        _this.value = value;
        return _this;
    }
    SeclangString.prototype.copy = function () {
        var copy = new SeclangString(this.value);
        copy.context = this.context;
        copy.posStart = this.posStart;
        copy.posEnd = this.posEnd;
        return copy;
    };
    SeclangString.prototype.toString = function () {
        return this.value;
    };
    SeclangString.prototype.asString = function () {
        return this.toString();
    };
    SeclangString.prototype.addTo = function (other) {
        if (other instanceof SeclangNumber)
            return [
                new SeclangString(this.value + other.value.toString()).setContext(this.context),
                null,
            ];
        if (other instanceof SeclangString)
            return [new SeclangString(this.value + other.value).setContext(this.context), null];
        return [null, this.illegalOperation(other)];
    };
    SeclangString.prototype.toBool = function () {
        return this.value.length > 0;
    };
    return SeclangString;
}(SeclangValue));
var SeclangList = /** @class */ (function (_super) {
    __extends(SeclangList, _super);
    function SeclangList(elements) {
        var _this = _super.call(this) || this;
        _this.elements = elements;
        return _this;
    }
    SeclangList.prototype.copy = function () {
        var copy = new SeclangList(this.elements);
        copy.context = this.context;
        copy.posStart = this.posStart;
        copy.posEnd = this.posEnd;
        return copy;
    };
    SeclangList.prototype.toString = function () {
        return "[".concat(this.elements.join(", "), "]");
    };
    SeclangList.prototype.asString = function () {
        return this.toString();
    };
    SeclangList.prototype.accessEl = function (index) {
        if (index instanceof SeclangNumber) {
            if (!(0 <= index.value && index.value < this.elements.length))
                return [null, this.outOfBounds(index)];
            return [this.elements[index.value].copy().setContext(this.context), null];
        }
        return [null, this.illegalOperation(index)];
    };
    SeclangList.prototype.setEl = function (index, newVal) {
        if (index instanceof SeclangNumber) {
            if (!(0 <= index.value && index.value < this.elements.length))
                return [null, this.outOfBounds(index)];
            this.elements[index.value] = newVal;
            return [this.elements[index.value].copy().setContext(this.context), null];
        }
        return [null, this.illegalOperation(index)];
    };
    SeclangList.prototype.toBool = function () {
        return this.elements.length > 0;
    };
    SeclangList.prototype.outOfBounds = function (index) {
        return new RuntimeSeclangError(this.posStart, index.posEnd, "Out of bounds", this.context);
    };
    return SeclangList;
}(SeclangValue));
var RuntimeResult = /** @class */ (function () {
    function RuntimeResult() {
        this.value = null;
        this.error = null;
    }
    RuntimeResult.prototype.registerChild = function (res) {
        if (res instanceof RuntimeResult) {
            if (res.error) {
                this.error = res.error;
            }
            return res.value;
        }
        return res;
    };
    RuntimeResult.prototype.success = function (value) {
        this.value = value;
        return this;
    };
    RuntimeResult.prototype.failure = function (error) {
        this.error = error;
        return this;
    };
    return RuntimeResult;
}());
var Interpreter = /** @class */ (function () {
    function Interpreter() {
    }
    Interpreter.prototype.interpret = function (astRoot, context) {
        var result = this.visit(astRoot, context);
        return new InterpreterResult(result.value, result.error);
    };
    Interpreter.prototype.visit = function (node, context) {
        if (node instanceof NumberNode)
            return this.visitNumberNode(node, context);
        if (node instanceof StringLNode)
            return this.visitStringLNode(node, context);
        if (node instanceof BinOpNode)
            return this.visitBinOpNode(node, context);
        if (node instanceof UnaryOpNode)
            return this.visitUnaryOpNode(node, context);
        if (node instanceof VarAccessNode)
            return this.visitVarAccessNode(node, context);
        if (node instanceof VarAssignNode)
            return this.visitVarAssignNode(node, context);
        if (node instanceof CreateVarNode)
            return this.visitCreateVarNode(node, context);
        if (node instanceof ListInitNode)
            return this.visitListInitNode(node, context);
        if (node instanceof IfNode)
            return this.visitIfNode(node, context);
        if (node instanceof WhileNode)
            return this.visitWhileNode(node, context);
        if (node instanceof ForNode)
            return this.visitForNode(node, context);
        if (node instanceof EmptyNode)
            return this.visitEmptyNode(node, context);
        if (node instanceof FunDefNode)
            return this.visitFunDefNode(node, context);
        if (node instanceof FunCallNode)
            return this.visitFunCallNode(node, context);
        if (node instanceof ListNode)
            return this.visitListNode(node, context);
        if (node instanceof ListAccessNode)
            return this.visitListAccessNode(node, context);
        if (node instanceof ListSetNode)
            return this.visitListSetNode(node, context);
        if (node instanceof StatementsNode)
            return this.visitStatementsNode(node, context);
        return this.noVisitMethod(node, context);
    };
    Interpreter.prototype.visitNumberNode = function (node, context) {
        var num = new SeclangNumber(node.token.value);
        num.setContext(context);
        num.setPos(node.posStart, node.posEnd);
        return new RuntimeResult().success(num);
    };
    Interpreter.prototype.visitStringLNode = function (node, context) {
        var str = new SeclangString(node.token.value);
        str.setContext(context);
        str.setPos(node.posStart, node.posEnd);
        return new RuntimeResult().success(str);
    };
    Interpreter.prototype.visitBinOpNode = function (node, context) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        var res = new RuntimeResult();
        var leftVal = res.registerChild(this.visit(node.leftNode, context));
        if (res.error)
            return res;
        var rightVal = res.registerChild(this.visit(node.rightNode, context));
        if (res.error)
            return res;
        var result = null;
        var error = null;
        if (node.operationToken instanceof PlusToken)
            _a = leftVal.addTo(rightVal), result = _a[0], error = _a[1];
        else if (node.operationToken instanceof MinusToken)
            _b = leftVal.subBy(rightVal), result = _b[0], error = _b[1];
        else if (node.operationToken instanceof MulToken)
            _c = leftVal.multBy(rightVal), result = _c[0], error = _c[1];
        else if (node.operationToken instanceof DivToken)
            _d = leftVal.divBy(rightVal), result = _d[0], error = _d[1];
        else if (node.operationToken instanceof PowToken)
            _e = leftVal.toPow(rightVal), result = _e[0], error = _e[1];
        else if (node.operationToken instanceof EEToken)
            _f = leftVal.getCompEq(rightVal), result = _f[0], error = _f[1];
        else if (node.operationToken instanceof NEToken)
            _g = leftVal.getCompNe(rightVal), result = _g[0], error = _g[1];
        else if (node.operationToken instanceof LTToken)
            _h = leftVal.getCompLt(rightVal), result = _h[0], error = _h[1];
        else if (node.operationToken instanceof GTToken)
            _j = leftVal.getCompGt(rightVal), result = _j[0], error = _j[1];
        else if (node.operationToken instanceof LTEToken)
            _k = leftVal.getCompLte(rightVal), result = _k[0], error = _k[1];
        else if (node.operationToken instanceof GTEToken)
            _l = leftVal.getCompGte(rightVal), result = _l[0], error = _l[1];
        else if (node.operationToken instanceof DAndToken)
            _m = leftVal.getAndWith(rightVal), result = _m[0], error = _m[1];
        else if (node.operationToken instanceof DOrToken)
            _o = leftVal.getOrWith(rightVal), result = _o[0], error = _o[1];
        else {
            throw new Error("Not implemented operator " + node.operationToken);
        }
        if (error) {
            return res.failure(error);
        }
        result.setPos(node.posStart, node.posEnd);
        return res.success(result);
    };
    Interpreter.prototype.visitUnaryOpNode = function (node, context) {
        var _a, _b;
        var res = new RuntimeResult();
        var num = res.registerChild(this.visit(node.node, context));
        if (res.error)
            return res;
        var result = null;
        var error = null;
        if (node.operationToken instanceof MinusToken) {
            _a = num.multBy(new SeclangNumber(-1)), result = _a[0], error = _a[1];
        }
        else if (node.operationToken instanceof NotToken) {
            _b = num.notted(), result = _b[0], error = _b[1];
        }
        // TODO: handle unknown operator (throw error)
        if (error)
            return res.failure(error);
        result.setPos(node.posStart, node.posEnd);
        return res.success(result);
    };
    Interpreter.prototype.visitVarAccessNode = function (node, context) {
        var res = new RuntimeResult();
        var varName = node.varNameToken.value;
        var varValue = context.symbolTable.get(varName);
        if (varValue === null) {
            return res.failure(new RuntimeSeclangError(node.posStart, node.posEnd, "".concat(varName, " is not defined"), context));
        }
        return res.success(varValue.copy().setPos(node.posStart, node.posEnd).setContext(context));
    };
    Interpreter.prototype.visitVarAssignNode = function (node, context) {
        var res = new RuntimeResult();
        var varName = node.varNameToken.value;
        var assignValue = res.registerChild(this.visit(node.valueNode, context));
        if (res.error)
            return res;
        if (context.symbolTable.get(varName) === null) {
            return res.failure(new RuntimeSeclangError(node.posStart, node.posEnd, "".concat(varName, " is not defined"), context));
        }
        context.symbolTable.set(varName, assignValue);
        return res.success(assignValue);
    };
    Interpreter.prototype.visitCreateVarNode = function (node, context) {
        var res = new RuntimeResult();
        var varName = node.varNameToken.value;
        var assignValue = new SeclangNumber(null);
        if (node.initValNode !== null) {
            assignValue = res.registerChild(this.visit(node.initValNode, context));
            if (res.error)
                return res;
        }
        if (context.symbolTable.isDefined(varName)) {
            return res.failure(new RuntimeSeclangError(node.posStart, node.posEnd, "".concat(varName, " is already defined"), context));
        }
        context.symbolTable.setNew(varName, assignValue);
        return res.success(assignValue);
    };
    Interpreter.prototype.visitListInitNode = function (node, context) {
        var res = new RuntimeResult();
        var listName = node.listNameToken.value;
        if (context.symbolTable.isDefined(listName)) {
            return res.failure(new RuntimeSeclangError(node.posStart, node.posEnd, "".concat(listName, " is already defined"), context));
        }
        var listLen = res.registerChild(this.visit(node.length, context));
        if (res.error)
            return res;
        if (!(listLen instanceof SeclangNumber)) {
            return res.failure(new RuntimeSeclangError(node.posStart, node.posEnd, "index should be a number", context));
        }
        var nullElements = [];
        for (var i = 0; i < listLen.value; i++)
            nullElements.push(new SeclangNumber(0));
        var list = new SeclangList(nullElements);
        context.symbolTable.setNew(listName, list);
        return res.success(list);
    };
    Interpreter.prototype.visitIfNode = function (node, context) {
        var res = new RuntimeResult();
        var newContext = new Context(null, context, node.posStart);
        newContext.symbolTable = new SymbolTable(context.symbolTable);
        var conditionEval = res.registerChild(this.visit(node.condition, newContext));
        if (res.error)
            return res;
        if (conditionEval.toBool()) {
            return this.visit(node.onTrue, newContext);
        }
        if (node.onFalse) {
            return this.visit(node.onFalse, newContext);
        }
        return res.success(new SeclangNumber(null));
    };
    Interpreter.prototype.visitWhileNode = function (node, context) {
        var res = new RuntimeResult();
        var newContext = new Context(null, context, node.posStart);
        newContext.symbolTable = new SymbolTable(context.symbolTable);
        while (true) {
            var conditionEval = res.registerChild(this.visit(node.condition, newContext));
            if (res.error)
                return res;
            if (conditionEval.toBool() === false) {
                break;
            }
            res.registerChild(this.visit(node.body, newContext));
            if (res.error)
                return res;
        }
        return res.success(new SeclangNumber(null));
    };
    Interpreter.prototype.visitForNode = function (node, context) {
        var res = new RuntimeResult();
        var newContext = new Context(null, context, node.posStart);
        newContext.symbolTable = new SymbolTable(context.symbolTable);
        res.registerChild(this.visit(node.initStatement, newContext));
        if (res.error)
            return res;
        while (true) {
            var conditionEval = res.registerChild(this.visit(node.condition, newContext));
            if (res.error)
                return res;
            if (conditionEval.toBool() === false) {
                break;
            }
            res.registerChild(this.visit(node.body, newContext));
            if (res.error)
                return res;
            res.registerChild(this.visit(node.iterateStatement, newContext));
            if (res.error)
                return res;
        }
        return res.success(new SeclangNumber(null));
    };
    Interpreter.prototype.visitEmptyNode = function (node, context) {
        var res = new RuntimeResult();
        return res.success(new SeclangNumber(null));
    };
    Interpreter.prototype.visitFunDefNode = function (node, context) {
        var res = new RuntimeResult();
        var argNamesStr = node.argNames.map(function (argName) { return argName.value; });
        var funName = null;
        if (node.funName !== null) {
            funName = node.funName.value;
        }
        var fun = new SeclangFunction(funName, node.body, argNamesStr);
        fun.setContext(context);
        fun.setPos(node.posStart, node.posEnd);
        if (funName !== null) {
            context.symbolTable.setNew(funName, fun);
        }
        return res.success(fun);
    };
    Interpreter.prototype.visitFunCallNode = function (node, context) {
        var res = new RuntimeResult();
        var funNameToCall = res.registerChild(this.visit(node.funNameToCallNode, context));
        if (res.error)
            return res;
        funNameToCall = funNameToCall.copy().setPos(node.posStart, node.posEnd);
        if (!(funNameToCall instanceof SeclangBaseFunction)) {
            return res.failure(new RuntimeSeclangError(node.posStart, node.posEnd, "".concat(funNameToCall, " is not a function"), context));
        }
        var args = [];
        for (var _i = 0, _a = node.argNodes; _i < _a.length; _i++) {
            var argNode = _a[_i];
            var argVal = res.registerChild(this.visit(argNode, context));
            if (res.error)
                return res;
            args.push(argVal);
        }
        var returnVal = res.registerChild(funNameToCall.execute(args));
        if (res.error)
            return res;
        return res.success(returnVal.copy().setPos(node.posStart, node.posEnd).setContext(context));
    };
    Interpreter.prototype.visitListNode = function (node, context) {
        var res = new RuntimeResult();
        var elements = [];
        for (var _i = 0, _a = node.elementNodes; _i < _a.length; _i++) {
            var elementNode = _a[_i];
            var element = res.registerChild(this.visit(elementNode, context));
            if (res.error)
                return res;
            elements.push(element);
        }
        var list = new SeclangList(elements);
        list.setContext(context);
        list.setPos(node.posStart, node.posEnd);
        return res.success(list);
    };
    Interpreter.prototype.visitListAccessNode = function (node, context) {
        var res = new RuntimeResult();
        var list = res.registerChild(this.visit(node.listNameNode, context));
        if (res.error)
            return res;
        list = list.copy().setPos(node.posStart, node.posEnd);
        if (!(list instanceof SeclangList)) {
            return res.failure(new RuntimeSeclangError(node.posStart, node.posEnd, "".concat(list, " is not a list"), context));
        }
        var index = res.registerChild(this.visit(node.indexNode, context));
        if (res.error)
            return res;
        var _a = list.accessEl(index), element = _a[0], error = _a[1];
        if (error) {
            return res.failure(error);
        }
        return res.success(element);
    };
    Interpreter.prototype.visitListSetNode = function (node, context) {
        var res = new RuntimeResult();
        var list = res.registerChild(this.visit(node.listNameNode, context));
        if (res.error)
            return res;
        list = list.copy().setPos(node.posStart, node.posEnd);
        if (!(list instanceof SeclangList)) {
            return res.failure(new RuntimeSeclangError(node.posStart, node.posEnd, "".concat(list, " is not a list"), context));
        }
        var index = res.registerChild(this.visit(node.indexNode, context));
        if (res.error)
            return res;
        var newVal = res.registerChild(this.visit(node.valNode, context));
        if (res.error)
            return res;
        var _a = list.setEl(index, newVal), element = _a[0], error = _a[1];
        if (error) {
            return res.failure(error);
        }
        return res.success(element);
    };
    Interpreter.prototype.visitStatementsNode = function (node, context) {
        var res = new RuntimeResult();
        var lastVal = new SeclangNumber(null);
        for (var _i = 0, _a = node.statementNodes; _i < _a.length; _i++) {
            var elementNode = _a[_i];
            lastVal = res.registerChild(this.visit(elementNode, context));
            if (res.error)
                return res;
        }
        return res.success(lastVal);
    };
    Interpreter.prototype.noVisitMethod = function (node, context) {
        throw new Error("No visit method defined for node ".concat(node, " of type ").concat(node.constructor.name));
        return null;
    };
    return Interpreter;
}());
/* =================== */
// RUN
/* =================== */
var globalSymbolTable = new SymbolTable();
globalSymbolTable.setNew("true", SeclangNumber.true);
globalSymbolTable.setNew("false", SeclangNumber.false);
globalSymbolTable.setNew("print", new SeclangPrintFunction());
globalSymbolTable.setNew("sqrt", new SeclangSqrtFunction());
var RunResult = /** @class */ (function (_super) {
    __extends(RunResult, _super);
    function RunResult() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RunResult.prototype.toString = function () {
        return this.result;
    };
    return RunResult;
}(StepResult));
var run = function (filename, text) {
    var lexer = new Lexer(filename, text);
    var lexerRes = lexer.makeTokens();
    if (lexerRes.error) {
        return new RunResult(null, lexerRes.error);
    }
    var parser = new Parser(lexerRes.result);
    var parseRes = parser.parse();
    if (parseRes.error) {
        return new RunResult(null, parseRes.error);
    }
    var interpreter = new Interpreter();
    var context = new Context("<program>");
    context.symbolTable = globalSymbolTable;
    var interpreterRes = interpreter.interpret(parseRes.result, context);
    if (interpreterRes.error) {
        return new RunResult(null, interpreterRes.error);
    }
    return new RunResult(interpreterRes.toString(), null);
};
exports.default = run;
//# sourceMappingURL=seclang.js.map