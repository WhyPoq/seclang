/* =================== */
// ERRORS
/* =================== */

export class InstructionLimitReachedError extends Error {
	constructor(message: string | undefined = undefined) {
		super(message);
		Object.setPrototypeOf(this, InstructionLimitReachedError.prototype);
	}
}
export class VarsLimitReachedError extends Error {
	constructor(message: string | undefined = undefined) {
		super(message);
		Object.setPrototypeOf(this, VarsLimitReachedError.prototype);
	}
}

class SeclangError {
	public posStart: Position;
	public posEnd: Position;
	public errorName: string;
	public details: string;

	public constructor(posStart: Position, posEnd: Position, errorName: string, details: string) {
		this.posStart = posStart;
		this.posEnd = posEnd;
		this.errorName = errorName;
		this.details = details;
	}

	// add arrows pointing to the error
	protected genArrowsLine() {
		// TODO: add support for errors on multiple lines
		const lineText = this.posStart.fileText.split("\n")[this.posStart.line];
		let str = "\n" + lineText + "\n";

		for (let i = 0; i < this.posStart.col; i++) str += " ";
		for (let i = this.posStart.col; i < this.posEnd.col; i++) str += "^";
		str += "\n";

		return str;
	}

	public toString() {
		let str = `${this.errorName}: ${this.details}\n`;
		if (this.posStart !== null && this.posEnd !== null) {
			str += `File ${this.posStart.filename}, line ${this.posEnd.line + 1}\n`;
			str += this.genArrowsLine();
		}
		return str;
	}
}

class IllegalCharSeclangError extends SeclangError {
	public constructor(posStart: Position, posEnd: Position, details: string) {
		super(posStart, posEnd, "Illegal Character", details);
	}
}

class ExpectedCharSeclangError extends SeclangError {
	public constructor(posStart: Position, posEnd: Position, details: string) {
		super(posStart, posEnd, "Expected Character", details);
	}
}

class NotClosedStringSeclangError extends SeclangError {
	public constructor(posStart: Position, posEnd: Position, details: string) {
		super(posStart, posEnd, "Not closed string", details);
	}
}

class InvalidSyntaxSeclangError extends SeclangError {
	public constructor(posStart: Position, posEnd: Position, details: string) {
		super(posStart, posEnd, "Invalid Syntax", details);
	}
}

class RuntimeSeclangError extends SeclangError {
	public context: Context;

	public constructor(posStart: Position, posEnd: Position, details: string, context: Context) {
		super(posStart, posEnd, "Runtime error", details);
		this.context = context;
	}

	private generateTraceback() {
		let result = "";
		let curPos = this.posStart;
		let curContext = this.context;

		while (curContext !== null) {
			while (curContext !== null && curContext.displayName === null) {
				curContext = curContext.parentContext;
			}
			if (curContext === null) {
				break;
			}

			result =
				`  File ${curPos.filename}, line ${curPos.line + 1}, in ${
					curContext.displayName
				}\n` + result;
			curPos = curContext.parentEntryPos;
			curContext = curContext.parentContext;
		}

		return "Traceback (most recent call last):\n" + result;
	}

	public toString() {
		let str = "";
		if (this.posStart !== null && this.posEnd !== null) {
			str += this.generateTraceback();
		}
		str += `${this.errorName}: ${this.details}\n`;
		if (this.posStart !== null && this.posEnd !== null) {
			str += this.genArrowsLine();
		}
		return str;
	}
}

/* =================== */
// POSITION
/* =================== */

class Position {
	public idx: number;
	public line: number;
	public col: number;
	public filename: string;
	public fileText: string;
	public curChar: string;

	public constructor(
		idx: number,
		line: number,
		col: number,
		filename: string,
		fileText: string,
		curChar: string
	) {
		this.idx = idx;
		this.line = line;
		this.col = col;
		this.filename = filename;
		this.fileText = fileText;
		this.curChar = curChar;
	}

	public advance() {
		this.idx++;
		this.col++;

		if (this.curChar === "\n") {
			this.line++;
			this.col = 0;
		}

		if (this.idx < this.fileText.length) {
			this.curChar = this.fileText[this.idx];
		} else {
			this.curChar = null;
		}
	}

	public peek() {
		if (this.idx + 1 < this.fileText.length) {
			return this.fileText[this.idx + 1];
		}
		return null;
	}

	public copy() {
		return new Position(
			this.idx,
			this.line,
			this.col,
			this.filename,
			this.fileText,
			this.curChar
		);
	}
}

/* =================== */
// TOKENS
/* =================== */

enum TokType {
	INT = "INT",
	FLOAT = "FLOAT",
	MINUS = "MINUS",
	MUL = "MUL",
	DIV = "DIV",
	PLUS = "PLUS",
	DPLUS = "DPLUS",
	DMINUS = "DMINUS",
	MOD = "MOD",
	POW = "POW",
	L_PAREN = "L_PAREN",
	R_PAREN = "R_PAREN",
	L_CURLY = "L_CURLY",
	R_CURLY = "R_CURLY",
	L_SQUARE = "L_SQUARE",
	R_SQUARE = "R_SQUARE",
	SEMICOLON = "SEMICOLON",
	COMMA = "COMMA",
	IDENTIFIER = "IDENTIFIER",
	KEYWORD = "KEYWORD",
	EQ = "EQ",
	PEQ = "PEQ",
	MEQ = "MEQ",
	EE = "EE",
	NE = "NE",
	LT = "LT",
	GT = "GT",
	LTE = "LTE",
	GTE = "GTE",
	D_AND = "D_AND",
	D_OR = "D_OR",
	NOT = "NOT",
	STRING_L = "STRING_L",
	NEWLINE = "NEWLINE",
	EOF = "EOF",
}

const KEYWORDS = ["let", "if", "else", "while", "for", "function", "continue", "break", "return"];
const KEYWORDS_SET = new Set(KEYWORDS);

abstract class Token<T = unknown> {
	public value: T;
	public posStart: Position;
	public posEnd: Position;
	private type: TokType;

	public constructor(
		type: TokType,
		value: T = null,
		posStart: Position,
		posEnd: Position = null
	) {
		this.type = type;
		this.value = value;
		this.posStart = posStart;
		if (!posEnd) {
			this.posEnd = posStart.copy();
			this.posEnd.advance();
		} else {
			this.posEnd = posEnd;
		}
	}

	public toString() {
		if (this.value !== null) {
			return `${this.type}:${this.value}`;
		}
		return `${this.type}`;
	}
}

class IntToken extends Token<number> {
	public constructor(value: number, posStart: Position = null, posEnd: Position = null) {
		super(TokType.INT, value, posStart, posEnd);
	}
}

class FloatToken extends Token<number> {
	public constructor(value: number, posStart: Position = null, posEnd: Position = null) {
		super(TokType.FLOAT, value, posStart, posEnd);
	}
}

class PlusToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.PLUS, null, posStart, posEnd);
	}
}

class MinusToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.MINUS, null, posStart, posEnd);
	}
}

class MulToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.MUL, null, posStart, posEnd);
	}
}

class DivToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.DIV, null, posStart, posEnd);
	}
}

class ModToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.MOD, null, posStart, posEnd);
	}
}

class PowToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.POW, null, posStart, posEnd);
	}
}

class DPLUSToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.DPLUS, null, posStart, posEnd);
	}
}

class DMINUSToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.DMINUS, null, posStart, posEnd);
	}
}

class LParenToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.L_PAREN, null, posStart, posEnd);
	}
}

class RParenToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.R_PAREN, null, posStart, posEnd);
	}
}

class LCurlyToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.L_CURLY, null, posStart, posEnd);
	}
}

class RCurlyToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.R_CURLY, null, posStart, posEnd);
	}
}

class LSquareToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.L_SQUARE, null, posStart, posEnd);
	}
}

class RSquareToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.R_SQUARE, null, posStart, posEnd);
	}
}

class SemicolonToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.SEMICOLON, null, posStart, posEnd);
	}
}

class CommaToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.COMMA, null, posStart, posEnd);
	}
}

class IdentifierToken extends Token<string> {
	public constructor(value: string, posStart: Position = null, posEnd: Position = null) {
		super(TokType.IDENTIFIER, value, posStart, posEnd);
	}
}

class KeywordToken extends Token<string> {
	public constructor(value: string, posStart: Position = null, posEnd: Position = null) {
		super(TokType.KEYWORD, value, posStart, posEnd);
	}
}

class EQToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.EQ, null, posStart, posEnd);
	}
}

class PEQToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.PEQ, null, posStart, posEnd);
	}
}

class MEQToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.MEQ, null, posStart, posEnd);
	}
}

class EEToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.EE, null, posStart, posEnd);
	}
}

class NEToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.NE, null, posStart, posEnd);
	}
}

class LTToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.LT, null, posStart, posEnd);
	}
}

class GTToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.GT, null, posStart, posEnd);
	}
}

class LTEToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.LTE, null, posStart, posEnd);
	}
}

class GTEToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.GTE, null, posStart, posEnd);
	}
}

class DOrToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.D_OR, null, posStart, posEnd);
	}
}

class DAndToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.D_AND, null, posStart, posEnd);
	}
}

class NotToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.NOT, null, posStart, posEnd);
	}
}

class StringLToken extends Token<string> {
	public constructor(value: string, posStart: Position = null, posEnd: Position = null) {
		super(TokType.STRING_L, value, posStart, posEnd);
	}
}

class NewlineToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.NEWLINE, null, posStart, posEnd);
	}
}

class EOFToken extends Token<void> {
	public constructor(posStart: Position = null, posEnd: Position = null) {
		super(TokType.EOF, null, posStart, posEnd);
	}
}

type NumberToken = IntToken | FloatToken;
type BinOperationToken =
	| PlusToken
	| MinusToken
	| MulToken
	| DivToken
	| ModToken
	| PowToken
	| EEToken
	| NEToken
	| LTToken
	| GTToken
	| LTEToken
	| GTEToken
	| DAndToken
	| DOrToken;
type UnaryOperationToken = PlusToken | MinusToken | NotToken;

/* =================== */
// STEP RESULT
/* =================== */

abstract class StepResult<T> {
	public result: T;
	public error: SeclangError;

	public constructor(result: T, error: SeclangError) {
		this.result = result;
		this.error = error;
	}

	public abstract toString(): string;
}

/* =================== */
// LEXER
/* =================== */

class LexerResult extends StepResult<Token[]> {
	public toString() {
		return this.result.join(", ");
	}
}

class LexingPartResult<TokenT> {
	public token: TokenT;
	public error: SeclangError;

	public constructor() {
		this.token = null;
		this.error = null;
	}

	public success(token: TokenT) {
		this.token = token;
		return this;
	}

	public failure(error: SeclangError) {
		this.error = error;
		return this;
	}
}

class Lexer {
	private pos: Position;

	public constructor(filename: string, text: string) {
		this.pos = new Position(-1, 0, -1, filename, text, null);

		this.advance();
	}

	private advance() {
		this.pos.advance();
	}

	private peek() {
		return this.pos.peek();
	}

	private isDigit(char: string) {
		const charCode = char.charCodeAt(0);
		return "0".charCodeAt(0) <= charCode && charCode <= "9".charCodeAt(0);
	}

	private isLetter(char: string) {
		const charCode = char.charCodeAt(0);
		return (
			("a".charCodeAt(0) <= charCode && charCode <= "z".charCodeAt(0)) ||
			("A".charCodeAt(0) <= charCode && charCode <= "Z".charCodeAt(0))
		);
	}

	// if letter or '_'
	private isIdentifierStartChar(char: string) {
		return this.isLetter(char) || char === "_";
	}

	// if letter or number or '_'
	private isNameChar(char: string) {
		return this.isDigit(char) || this.isLetter(char) || char === "_";
	}

	private isWhitespace(char: string) {
		const whitespaceChars = " \t\r";
		return whitespaceChars.includes(char);
	}

	private isKeyword(identifier: string) {
		return KEYWORDS_SET.has(identifier);
	}

	private makeNumber() {
		const posStart = this.pos.copy();
		let curNumber = "";
		let countDots = 0;

		while (
			this.pos.curChar != null &&
			(this.isDigit(this.pos.curChar) || this.pos.curChar === ".")
		) {
			if (this.pos.curChar === ".") {
				if (countDots === 1) break;
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
	}

	private makeIdentifier() {
		const posStart = this.pos.copy();
		let curIdentifier = "";

		while (this.pos.curChar != null && this.isNameChar(this.pos.curChar)) {
			curIdentifier += this.pos.curChar;
			this.advance();
		}

		if (this.isKeyword(curIdentifier)) {
			return new KeywordToken(curIdentifier, posStart, this.pos.copy());
		}
		return new IdentifierToken(curIdentifier, posStart, this.pos.copy());
	}

	private makeMulOrPow(): PowToken | MulToken {
		const posStart = this.pos.copy();
		this.advance();
		if (this.pos.curChar === "*") {
			this.advance();
			return new PowToken(posStart, this.pos.copy());
		}

		return new MulToken(posStart);
	}

	private makeNeOrNot(): NEToken | NotToken {
		const posStart = this.pos.copy();
		this.advance();
		if (this.pos.curChar === "=") {
			this.advance();
			return new NEToken(posStart, this.pos.copy());
		}

		return new NotToken(posStart);
	}

	private makeEquals(): EQToken | EEToken {
		const posStart = this.pos.copy();
		this.advance();
		if (this.pos.curChar === "=") {
			this.advance();
			return new EEToken(posStart, this.pos.copy());
		}

		return new EQToken(posStart);
	}

	private makeLessThan(): LTToken | LTEToken {
		const posStart = this.pos.copy();
		this.advance();
		if (this.pos.curChar === "=") {
			this.advance();
			return new LTEToken(posStart, this.pos.copy());
		}

		return new LTToken(posStart);
	}

	private makeGreaterThan(): GTToken | GTEToken {
		const posStart = this.pos.copy();
		this.advance();
		if (this.pos.curChar === "=") {
			this.advance();
			return new GTEToken(posStart, this.pos.copy());
		}

		return new GTToken(posStart);
	}

	private makeDAnd(): LexingPartResult<DAndToken> {
		const lexingPartResult = new LexingPartResult<DAndToken>();
		const posStart = this.pos.copy();
		this.advance();
		if (this.pos.curChar === "&") {
			this.advance();
			return lexingPartResult.success(new DAndToken(posStart, this.pos.copy()));
		}

		this.advance();
		return lexingPartResult.failure(
			new ExpectedCharSeclangError(posStart, this.pos, "'&' (after '&')")
		);
	}

	private makeDOr(): LexingPartResult<DOrToken> {
		const lexingPartResult = new LexingPartResult<DAndToken>();
		const posStart = this.pos.copy();
		this.advance();
		if (this.pos.curChar === "|") {
			this.advance();
			return lexingPartResult.success(new DOrToken(posStart, this.pos.copy()));
		}

		this.advance();
		return lexingPartResult.failure(
			new ExpectedCharSeclangError(posStart, this.pos, "'|' (after '|')")
		);
	}

	private makeStringL(): LexingPartResult<StringLToken> {
		const lexingPartResult = new LexingPartResult<StringLToken>();
		const posStart = this.pos.copy();
		const strClosingChar = this.pos.curChar;
		this.advance();

		let resString = "";
		const escapeMapping = {
			n: "\n",
			t: "\t",
		};
		let escaped = false;
		while (this.pos.curChar != null && (escaped || this.pos.curChar !== strClosingChar)) {
			if (this.pos.curChar === "\\") {
				escaped = true;
			} else {
				if (escaped) {
					resString += escapeMapping[this.pos.curChar] ?? this.pos.curChar;
				} else {
					resString += this.pos.curChar;
				}
				escaped = false;
			}
			this.advance();
		}

		if (this.pos.curChar !== strClosingChar) {
			return lexingPartResult.failure(
				new NotClosedStringSeclangError(posStart, this.pos, resString)
			);
		}

		this.advance();
		return lexingPartResult.success(new StringLToken(resString, posStart, this.pos.copy()));
	}

	public makeTokens(): LexerResult {
		const tokens: Token[] = [];

		while (this.pos.curChar != null) {
			if (this.pos.curChar == "/" && this.peek() == "/") {
				while (this.pos.curChar != null && (this.pos.curChar as string) != "\n")
					this.advance();
			} else if (this.pos.curChar == "/" && this.peek() == "*") {
				while (
					this.pos.curChar != null &&
					!((this.pos.curChar as string) == "*" && this.peek() == "/")
				)
					this.advance();
				if ((this.pos.curChar as string) == "*" && this.peek() == "/") {
					this.advance();
					this.advance();
				}
			} else if (this.isDigit(this.pos.curChar) || this.pos.curChar === ".")
				tokens.push(this.makeNumber());
			else if (this.isIdentifierStartChar(this.pos.curChar))
				tokens.push(this.makeIdentifier());
			else if (this.pos.curChar === "*") tokens.push(this.makeMulOrPow());
			else if (this.pos.curChar === "!") tokens.push(this.makeNeOrNot());
			else if (this.pos.curChar === "=") tokens.push(this.makeEquals());
			else if (this.pos.curChar === "<") tokens.push(this.makeLessThan());
			else if (this.pos.curChar === ">") tokens.push(this.makeGreaterThan());
			else if (this.pos.curChar === "&") {
				const res = this.makeDAnd();
				if (res.error) return new LexerResult([], res.error);
				tokens.push(res.token);
			} else if (this.pos.curChar === "|") {
				const res = this.makeDOr();
				if (res.error) return new LexerResult([], res.error);
				tokens.push(res.token);
			} else if (this.pos.curChar === '"' || this.pos.curChar === "'") {
				const res = this.makeStringL();
				if (res.error) return new LexerResult([], res.error);
				tokens.push(res.token);
			} else {
				if (this.pos.curChar === "+" && this.peek() === "=") {
					const startPos = this.pos.copy();
					this.advance();
					tokens.push(new PEQToken(startPos, this.pos.copy()));
				} else if (this.pos.curChar === "+") tokens.push(new PlusToken(this.pos.copy()));
				else if (this.pos.curChar === "-" && this.peek() === "=") {
					const startPos = this.pos.copy();
					this.advance();
					tokens.push(new MEQToken(startPos, this.pos.copy()));
				} else if (this.pos.curChar === "-") tokens.push(new MinusToken(this.pos.copy()));
				else if (this.pos.curChar === "/") tokens.push(new DivToken(this.pos.copy()));
				else if (this.pos.curChar === "%") tokens.push(new ModToken(this.pos.copy()));
				else if (this.pos.curChar === "(") tokens.push(new LParenToken(this.pos.copy()));
				else if (this.pos.curChar === ")") tokens.push(new RParenToken(this.pos.copy()));
				else if (this.pos.curChar === "{") tokens.push(new LCurlyToken(this.pos.copy()));
				else if (this.pos.curChar === "}") tokens.push(new RCurlyToken(this.pos.copy()));
				else if (this.pos.curChar === "[") tokens.push(new LSquareToken(this.pos.copy()));
				else if (this.pos.curChar === "]") tokens.push(new RSquareToken(this.pos.copy()));
				else if (this.pos.curChar === ";") tokens.push(new SemicolonToken(this.pos.copy()));
				else if (this.pos.curChar === "\n") tokens.push(new NewlineToken(this.pos.copy()));
				else if (this.pos.curChar === ",") tokens.push(new CommaToken(this.pos.copy()));
				else if (!this.isWhitespace(this.pos.curChar)) {
					const char = this.pos.curChar;
					const posStart = this.pos.copy();
					this.advance();
					return new LexerResult(
						[],
						new IllegalCharSeclangError(posStart, this.pos, `'${char}'`)
					);
				}
				this.advance();
			}
		}

		tokens.push(new EOFToken(this.pos.copy()));

		return new LexerResult(tokens, null);
	}
}

/* =================== */
// NODES
/* =================== */

abstract class Node {
	public posStart: Position;
	public posEnd: Position;

	public abstract toString(): string;
}

class StringLNode extends Node {
	public token: StringLToken;

	public constructor(token: StringLToken) {
		super();
		this.posStart = token.posStart;
		this.posEnd = token.posEnd;

		this.token = token;
	}

	public toString() {
		return `"${this.token.value}"`;
	}
}

class NumberNode extends Node {
	public token: NumberToken;

	public constructor(token: NumberToken) {
		super();
		this.posStart = token.posStart;
		this.posEnd = token.posEnd;

		this.token = token;
	}

	public toString() {
		return this.token.toString();
	}
}

class BinOpNode extends Node {
	public leftNode: Node;
	public operationToken: BinOperationToken;
	public rightNode: Node;

	public constructor(leftNode: Node, operationToken: BinOperationToken, rightNode: Node) {
		super();
		this.posStart = leftNode.posStart;
		this.posEnd = rightNode.posEnd;

		this.leftNode = leftNode;
		this.operationToken = operationToken;
		this.rightNode = rightNode;
	}

	public toString() {
		return `(${this.leftNode}, ${this.operationToken}, ${this.rightNode})`;
	}
}

class UnaryOpNode extends Node {
	public operationToken: UnaryOperationToken;
	public node: Node;

	public constructor(operationToken: UnaryOperationToken, node: Node) {
		super();
		// TODO: take into account that operation token can be in the end (for example, x++)
		this.posStart = operationToken.posStart;
		this.posEnd = node.posEnd;

		this.operationToken = operationToken;
		this.node = node;
	}

	public toString() {
		return `(${this.operationToken}, ${this.node})`;
	}
}

class VarAccessNode extends Node {
	public varNameToken: IdentifierToken;

	public constructor(varNameToken: IdentifierToken) {
		super();
		this.posStart = varNameToken.posStart;
		this.posEnd = varNameToken.posEnd;
		this.varNameToken = varNameToken;
	}

	public toString() {
		return `(\$${this.varNameToken})`;
	}
}

class VarAssignNode extends Node {
	public varNameToken: IdentifierToken;
	public valueNode: Node;

	public constructor(varNameToken: IdentifierToken, valueNode: Node) {
		super();
		this.posStart = varNameToken.posStart;
		this.posEnd = valueNode.posEnd;

		this.varNameToken = varNameToken;
		this.valueNode = valueNode;
	}

	public toString() {
		return `(${this.varNameToken} = ${this.valueNode})`;
	}
}

class CreateVarNode extends Node {
	public varNameToken: IdentifierToken;
	public initValNode: Node;

	public constructor(varNameToken: IdentifierToken, initValNode: Node) {
		super();
		this.posStart = varNameToken.posStart;
		if (initValNode) {
			this.posEnd = initValNode.posEnd;
		} else {
			this.posEnd = varNameToken.posEnd;
		}

		this.varNameToken = varNameToken;
		this.initValNode = initValNode;
	}

	public toString() {
		return `(let ${this.varNameToken} = ${this.initValNode})`;
	}
}

class IfNode extends Node {
	public condition: Node;
	public onTrue: Node;
	public onFalse: Node;

	public constructor(condition: Node, onTrue: Node, onFalse: Node = null) {
		super();
		this.posStart = condition.posStart;
		if (onFalse) {
			this.posEnd = onFalse.posEnd;
		} else {
			this.posEnd = onTrue.posEnd;
		}

		this.condition = condition;
		this.onTrue = onTrue;
		this.onFalse = onFalse;
	}

	public toString() {
		if (this.onFalse) {
			return `(if(${this.condition}) ${this.onTrue} else ${this.onTrue})`;
		}
		return `(if(${this.condition}) ${this.onTrue} )`;
	}
}

class WhileNode extends Node {
	public condition: Node;
	public body: Node;

	public constructor(condition: Node, body: Node) {
		super();
		this.posStart = condition.posStart;
		this.posEnd = body.posEnd;

		this.condition = condition;
		this.body = body;
	}

	public toString() {
		return `(while(${this.condition}) ${this.body} )`;
	}
}

class ForNode extends Node {
	public initStatement: Node;
	public condition: Node;
	public iterateStatement: Node;
	public body: Node;

	public constructor(initStatement: Node, condition: Node, iterateStatement: Node, body: Node) {
		super();
		this.posStart = initStatement.posStart;
		this.posEnd = body.posEnd;

		this.initStatement = initStatement;
		this.condition = condition;
		this.iterateStatement = iterateStatement;
		this.body = body;
	}

	public toString() {
		return `(for(${this.initStatement}; ${this.condition}; ${this.iterateStatement}) ${this.body} )`;
	}
}

class EmptyNode extends Node {
	public constructor(posStart: Position, posEnd: Position) {
		super();
		this.posStart = posStart;
		this.posEnd = posEnd;
	}

	public toString() {
		return `(-)`;
	}
}

class FunDefNode extends Node {
	public funName: IdentifierToken;
	public argNames: IdentifierToken[];
	public body: Node;

	public constructor(funName: IdentifierToken, argNames: IdentifierToken[], body: Node) {
		super();
		if (funName !== null) {
			this.posStart = funName.posStart;
		} else if (argNames.length > 0) {
			this.posStart = argNames[0].posStart;
		} else {
			this.posStart = body.posStart;
		}
		this.posEnd = body.posEnd;

		this.funName = funName;
		this.argNames = argNames;
		this.body = body;
	}

	public toString() {
		if (this.funName === null) {
			return `(function (${this.argNames.join(", ")}) {${this.body}} )`;
		}
		return `(function ${this.funName} (${this.argNames.join(", ")}) {${this.body}} )`;
	}
}

class FunCallNode extends Node {
	public funNameToCallNode: Node;
	public argNodes: Node[];

	public constructor(funNameToCallNode: Node, argNodes: Node[]) {
		super();
		this.posStart = funNameToCallNode.posStart;
		if (argNodes.length > 0) {
			this.posEnd = argNodes[argNodes.length - 1].posEnd;
		} else {
			this.posEnd = funNameToCallNode.posEnd;
		}

		this.funNameToCallNode = funNameToCallNode;
		this.argNodes = argNodes;
	}

	public toString() {
		return `(${this.funNameToCallNode} (${this.argNodes.join(", ")}))`;
	}
}

class ListNode extends Node {
	public elementNodes: Node[];

	public constructor(elementNodes: Node[], posStart: Position, posEnd: Position) {
		super();
		this.posStart = posStart;
		this.posEnd = posEnd;

		this.elementNodes = elementNodes;
	}

	public toString() {
		return `[${this.elementNodes.join(", ")}]`;
	}
}

class ListInitNode extends Node {
	public listNameToken: IdentifierToken;
	public length: Node;

	public constructor(listNameToken: IdentifierToken, length: Node) {
		super();
		this.posStart = listNameToken.posStart;
		this.posEnd = length.posEnd;

		this.listNameToken = listNameToken;
		this.length = length;
	}

	public toString() {
		return `${this.listNameToken.value}[${this.length}]`;
	}
}

class ListAccessNode extends Node {
	public listNameNode: Node;
	public indexNode: Node;

	public constructor(listNameNode: Node, indexNode: Node) {
		super();
		this.posStart = listNameNode.posStart;
		this.posEnd = indexNode.posEnd;

		this.listNameNode = listNameNode;
		this.indexNode = indexNode;
	}

	public toString() {
		return `${this.listNameNode}[${this.indexNode}]`;
	}
}

class ListSetNode extends Node {
	public listNameNode: Node;
	public indexNode: Node;
	public valNode: Node;

	public constructor(listNameNode: Node, indexNode: Node, valNode: Node) {
		super();
		this.posStart = listNameNode.posStart;
		this.posEnd = valNode.posEnd;

		this.listNameNode = listNameNode;
		this.indexNode = indexNode;
		this.valNode = valNode;
	}

	public toString() {
		return `${this.listNameNode}[${this.indexNode}] = ${this.valNode}`;
	}
}

class StatementsNode extends Node {
	public statementNodes: Node[];

	public constructor(statementNodes: Node[], posStart: Position, posEnd: Position) {
		super();
		this.posStart = posStart;
		this.posEnd = posEnd;

		this.statementNodes = statementNodes;
	}

	public toString() {
		return `{${this.statementNodes.join("; ")}}`;
	}
}

class ReturnNode extends Node {
	public returnValue: Node;

	public constructor(returnValue: Node, posStart: Position, posEnd: Position) {
		super();
		this.posStart = posStart;
		this.posEnd = posEnd;

		this.returnValue = returnValue;
	}

	public toString() {
		if (this.returnValue !== null) return `return ${this.returnValue}`;
		return `return`;
	}
}

class BreakNode extends Node {
	public constructor(posStart: Position, posEnd: Position) {
		super();
		this.posStart = posStart;
		this.posEnd = posEnd;
	}

	public toString() {
		return `break`;
	}
}

class ContinueNode extends Node {
	public constructor(posStart: Position, posEnd: Position) {
		super();
		this.posStart = posStart;
		this.posEnd = posEnd;
	}

	public toString() {
		return `continue`;
	}
}

/* =================== */
// PARSER
/* =================== */

class ParserResult extends StepResult<Node> {
	public toString() {
		return this.result.toString();
	}
}

class ParseNodeResult {
	public node: Node;
	public error: SeclangError;
	public advanceCount: number;
	public backtrackCount: number;

	public constructor() {
		this.node = null;
		this.error = null;
		this.advanceCount = 0;
		this.backtrackCount = 0;
	}

	public registerAdvancement() {
		this.advanceCount++;
	}

	public unregisterAdvancement(amount = 1) {
		this.advanceCount -= amount;
		this.backtrackCount -= amount;
	}

	public resetAdvancementCount() {
		this.advanceCount = 0;
	}

	public registerChild(res: ParseNodeResult) {
		this.advanceCount += res.advanceCount;
		if (res.error) {
			this.error = res.error;
		}
		return res.node;
	}

	public registerTry(res: ParseNodeResult) {
		if (res.error) {
			this.backtrackCount += res.advanceCount;
			return null;
		}
		this.advanceCount += res.advanceCount;
		return res.node;
	}

	public success(node: Node) {
		this.node = node;
		return this;
	}

	public failure(error: SeclangError) {
		if (this.error === null || this.advanceCount === 0) {
			this.error = error;
		}
		return this;
	}
}

class Parser {
	public tokens: Token[];
	public tokenIdx: number;
	public curToken: Token;

	public constructor(tokens: Token[]) {
		this.tokens = tokens;
		this.tokenIdx = -1;
		this.curToken = null;
		this.advance();
	}

	private advance() {
		this.tokenIdx++;
		if (this.tokenIdx < this.tokens.length) {
			this.curToken = this.tokens[this.tokenIdx];
		} else {
			this.curToken = null;
		}
	}

	private unadvance(amount: number = 1) {
		this.tokenIdx -= amount;
		if (this.tokenIdx < this.tokens.length) {
			this.curToken = this.tokens[this.tokenIdx];
		} else {
			this.curToken = null;
		}
	}

	private skipEmptyLines(res: ParseNodeResult) {
		let countSkipped = 0;
		while (this.curToken instanceof NewlineToken) {
			res.registerAdvancement();
			this.advance();
			countSkipped++;
		}
		return countSkipped;
	}

	public parse() {
		const res = this.makeStatements();
		if (res.error) {
			return new ParserResult(null, res.error);
		}
		if (!(this.curToken instanceof EOFToken)) {
			return new ParserResult(
				null,
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected '+', '-', '*', '/', '**', '&&', '||', '==', '!=', '<', '> ,'<=', '>='"
				)
			);
		}
		return new ParserResult(res.node, null);
	}

	private makeFunDef() {
		const res = new ParseNodeResult();
		let funName = null;
		if (this.curToken instanceof IdentifierToken) {
			funName = this.curToken;
			res.registerAdvancement();
			this.advance();
		}

		if (!(this.curToken instanceof LParenToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected '('"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		const argNames: IdentifierToken[] = [];
		if (this.curToken instanceof IdentifierToken) {
			argNames.push(this.curToken);
			res.registerAdvancement();
			this.advance();

			while (this.curToken instanceof CommaToken) {
				res.registerAdvancement();
				this.advance();
				if (!((this.curToken as Token) instanceof IdentifierToken)) {
					return res.failure(
						new InvalidSyntaxSeclangError(
							this.curToken.posStart,
							this.curToken.posEnd,
							"Expected 'argument name'"
						)
					);
				}

				argNames.push(this.curToken);
				res.registerAdvancement();
				this.advance();
			}
		}

		if (!((this.curToken as Token) instanceof RParenToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected ')'"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		if (this.curToken instanceof LCurlyToken) {
			res.registerAdvancement();
			this.advance();

			const funBody = res.registerChild(this.makeStatements());
			if (res.error) return res;

			if (!((this.curToken as Token) instanceof RCurlyToken)) {
				return res.failure(
					new InvalidSyntaxSeclangError(
						this.curToken.posStart,
						this.curToken.posEnd,
						"Expected '}'"
					)
				);
			}
			res.registerAdvancement();
			this.advance();

			return res.success(new FunDefNode(funName, argNames, funBody));
		}

		const funBody = res.registerChild(this.makeInlineStatement());
		if (res.error) return res;
		return res.success(new FunDefNode(funName, argNames, funBody));
	}

	private makeList() {
		const res = new ParseNodeResult();

		const elementNodes: Node[] = [];
		const posStart = this.curToken.posStart.copy();

		if (!(this.curToken instanceof RSquareToken)) {
			const firstElNode = res.registerChild(this.makeExpr());
			if (res.error) return res;
			elementNodes.push(firstElNode);

			while ((this.curToken as Token) instanceof CommaToken) {
				res.registerAdvancement();
				this.advance();

				const curElNode = res.registerChild(this.makeExpr());
				if (res.error) return res;
				elementNodes.push(curElNode);
			}
		}

		if (!((this.curToken as Token) instanceof RSquareToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"expected ']'"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		return res.success(new ListNode(elementNodes, posStart, this.curToken.posEnd.copy()));
	}

	private makeAtom() {
		const res = new ParseNodeResult();
		const firstToken = this.curToken;

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
		} else if (firstToken instanceof IntToken || firstToken instanceof FloatToken) {
			res.registerAdvancement();
			this.advance();
			return res.success(new NumberNode(firstToken));
		} else if (firstToken instanceof StringLToken) {
			res.registerAdvancement();
			this.advance();
			return res.success(new StringLNode(firstToken));
		} else if (firstToken instanceof LParenToken) {
			res.registerAdvancement();
			this.advance();
			const expr = res.registerChild(this.makeExpr());
			if (res.error) return res;

			if (this.curToken instanceof RParenToken) {
				res.registerAdvancement();
				this.advance();
				return res.success(expr);
			} else {
				return res.failure(
					new InvalidSyntaxSeclangError(
						this.curToken.posStart,
						this.curToken.posEnd,
						"Expected ')'"
					)
				);
			}
		}

		return res.failure(
			new InvalidSyntaxSeclangError(
				firstToken.posStart,
				firstToken.posEnd,
				"Expected int or float"
			)
		);
	}

	private makeFunCall(atom: Node) {
		const res = new ParseNodeResult();
		const argNodes: Node[] = [];

		if (!(this.curToken instanceof RParenToken)) {
			const firstArgNode = res.registerChild(this.makeExpr());
			if (res.error) return res;
			argNodes.push(firstArgNode);

			while ((this.curToken as Token) instanceof CommaToken) {
				res.registerAdvancement();
				this.advance();

				const curArgNode = res.registerChild(this.makeExpr());
				if (res.error) return res;
				argNodes.push(curArgNode);
			}
		}

		if (!((this.curToken as Token) instanceof RParenToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected ')'"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		return res.success(new FunCallNode(atom, argNodes));
	}

	private makeListManip(atom: Node) {
		const res = new ParseNodeResult();

		const index = res.registerChild(this.makeExpr());
		if (res.error) return res;

		if (!((this.curToken as Token) instanceof RSquareToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected ']'"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		if (
			this.curToken instanceof EQToken ||
			this.curToken instanceof PEQToken ||
			this.curToken instanceof MEQToken
		) {
			const operationToken = this.curToken;
			res.registerAdvancement();
			this.advance();
			let assignVal = res.registerChild(this.makeExpr());
			if (res.error) return res;

			if (operationToken instanceof PEQToken) {
				const plusToken = new PlusToken(operationToken.posStart, operationToken.posEnd);
				assignVal = new BinOpNode(new ListAccessNode(atom, index), plusToken, assignVal);
			} else if (operationToken instanceof MEQToken) {
				const minusToken = new MinusToken(operationToken.posStart, operationToken.posEnd);
				assignVal = new BinOpNode(new ListAccessNode(atom, index), minusToken, assignVal);
			}

			return res.success(new ListSetNode(atom, index, assignVal));
		}

		return res.success(new ListAccessNode(atom, index));
	}

	public makeAtomManip() {
		const res = new ParseNodeResult();
		const atom = res.registerChild(this.makeAtom());
		if (res.error) return res;

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
	}

	private makePower() {
		const res = new ParseNodeResult();
		const atom = res.registerChild(this.makeAtomManip());
		if (res.error) return res;

		if (this.curToken instanceof PowToken) {
			const powerToken = this.curToken;
			res.registerAdvancement();
			this.advance();

			const powIndex = res.registerChild(this.makeFactor());
			if (res.error) return res;

			return res.success(new BinOpNode(atom, powerToken, powIndex));
		}

		return res.success(atom);
	}

	private makeFactor() {
		const res = new ParseNodeResult();
		const firstToken = this.curToken;
		if (firstToken instanceof PlusToken || firstToken instanceof MinusToken) {
			res.registerAdvancement();
			this.advance();
			const factor = res.registerChild(this.makeFactor());
			if (res.error) return res;
			return res.success(new UnaryOpNode(firstToken, factor));
		}

		return this.makePower();
	}

	private makeTerm() {
		const res = new ParseNodeResult();
		let left = res.registerChild(this.makeFactor());
		if (res.error) return res;

		while (
			this.curToken instanceof MulToken ||
			this.curToken instanceof DivToken ||
			this.curToken instanceof ModToken
		) {
			const operationToken = this.curToken;
			res.registerAdvancement();
			this.advance();
			const right = res.registerChild(this.makeFactor());
			if (res.error) return res;
			left = new BinOpNode(left, operationToken, right);
		}
		return res.success(left);
	}

	private makeArithmExpr() {
		const res = new ParseNodeResult();

		let left = res.registerChild(this.makeTerm());
		if (res.error) return res;

		while (this.curToken instanceof PlusToken || this.curToken instanceof MinusToken) {
			const operationToken = this.curToken;
			res.registerAdvancement();
			this.advance();
			const right = res.registerChild(this.makeTerm());
			if (res.error) return res;
			left = new BinOpNode(left, operationToken, right);
		}

		return res.success(left);
	}

	private makeNoExpr() {
		const res = new ParseNodeResult();

		if (this.curToken instanceof NotToken) {
			let notToken = this.curToken;
			res.registerAdvancement();
			this.advance();
			let arithmExpr = res.registerChild(this.makeNoExpr());
			if (res.error) return res;
			return res.success(new UnaryOpNode(notToken, arithmExpr));
		}

		return this.makeArithmExpr();
	}

	private makeCompExpr() {
		const res = new ParseNodeResult();

		let left = res.registerChild(this.makeNoExpr());
		if (res.error) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected '!', int or float"
				)
			);
		}

		while (
			this.curToken instanceof EEToken ||
			this.curToken instanceof NEToken ||
			this.curToken instanceof LTToken ||
			this.curToken instanceof GTToken ||
			this.curToken instanceof LTEToken ||
			this.curToken instanceof GTEToken
		) {
			const operationToken = this.curToken;
			res.registerAdvancement();
			this.advance();
			const right = res.registerChild(this.makeNoExpr());
			if (res.error) return res;
			left = new BinOpNode(left, operationToken, right);
		}

		return res.success(left);
	}

	private makeAndLogExpr() {
		const res = new ParseNodeResult();

		let left = res.registerChild(this.makeCompExpr());
		if (res.error) return res;

		while (this.curToken instanceof DAndToken) {
			const operationToken = this.curToken;
			res.registerAdvancement();
			this.advance();
			const right = res.registerChild(this.makeCompExpr());
			if (res.error) return res;
			left = new BinOpNode(left, operationToken, right);
		}

		return res.success(left);
	}

	private makeExpr() {
		const res = new ParseNodeResult();

		if (this.curToken instanceof KeywordToken && this.curToken.value === "let") {
			res.registerAdvancement();
			this.advance();
			if (!(this.curToken instanceof IdentifierToken)) {
				return res.failure(
					new InvalidSyntaxSeclangError(
						this.curToken.posStart,
						this.curToken.posEnd,
						"Expected variable name"
					)
				);
			}

			const varName = this.curToken;
			res.registerAdvancement();
			this.advance();

			if (this.curToken instanceof LSquareToken) {
				res.registerAdvancement();
				this.advance();
				const listLen = res.registerChild(this.makeExpr());

				if (!(this.curToken instanceof RSquareToken)) {
					return res.failure(
						new InvalidSyntaxSeclangError(
							this.curToken.posStart,
							this.curToken.posEnd,
							"Expected ']"
						)
					);
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
			const initVal = res.registerChild(this.makeExpr());
			if (res.error) return res;

			return res.success(new CreateVarNode(varName, initVal));
		}

		if (this.curToken instanceof IdentifierToken) {
			const varName = this.curToken;
			res.registerAdvancement();
			this.advance();

			if (
				this.curToken instanceof EQToken ||
				this.curToken instanceof PEQToken ||
				this.curToken instanceof MEQToken
			) {
				const operationToken = this.curToken;
				res.registerAdvancement();
				this.advance();
				let assignVal = res.registerChild(this.makeExpr());
				if (res.error) return res;

				if (operationToken instanceof PEQToken) {
					const plusToken = new PlusToken(operationToken.posStart, operationToken.posEnd);
					assignVal = new BinOpNode(new VarAccessNode(varName), plusToken, assignVal);
				} else if (operationToken instanceof MEQToken) {
					const minusToken = new MinusToken(
						operationToken.posStart,
						operationToken.posEnd
					);
					assignVal = new BinOpNode(new VarAccessNode(varName), minusToken, assignVal);
				}

				return res.success(new VarAssignNode(varName, assignVal));
			}
			res.unregisterAdvancement();
			this.unadvance();
		}

		let left = res.registerChild(this.makeAndLogExpr());
		if (res.error) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected '!', 'let', int or float"
				)
			);
		}
		while (this.curToken instanceof DOrToken) {
			const operationToken = this.curToken;
			res.registerAdvancement();
			this.advance();
			const right = res.registerChild(this.makeAndLogExpr());
			if (res.error) return res;
			left = new BinOpNode(left, operationToken, right);
		}

		return res.success(left);
	}

	private makeInlineStatement() {
		const res = new ParseNodeResult();
		const firstPos = this.curToken.posStart.copy();

		if (this.curToken instanceof KeywordToken && this.curToken.value === "break") {
			res.registerAdvancement();
			this.advance();
			return res.success(new BreakNode(firstPos, this.curToken.posStart));
		}

		if (this.curToken instanceof KeywordToken && this.curToken.value === "continue") {
			res.registerAdvancement();
			this.advance();
			return res.success(new ContinueNode(firstPos, this.curToken.posStart));
		}

		if (this.curToken instanceof KeywordToken && this.curToken.value === "return") {
			res.registerAdvancement();
			this.advance();

			let returnVal = null;
			returnVal = res.registerTry(this.makeExpr());
			// backtrack if there were no expr to return
			if (returnVal === null) {
				this.unadvance(res.backtrackCount);
				res.unregisterAdvancement(res.backtrackCount);
			}

			return res.success(new ReturnNode(returnVal, firstPos, this.curToken.posStart));
		}

		return this.makeExpr();
	}

	private makeStatementIf() {
		const res = new ParseNodeResult();

		if (!(this.curToken instanceof LParenToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected '('"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		const condition = res.registerChild(this.makeExpr());
		if (res.error) return res;

		if (!(this.curToken instanceof RParenToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected ')'"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		this.skipEmptyLines(res);

		res.resetAdvancementCount();
		if (!(this.curToken instanceof LCurlyToken)) {
			const onTrueStatement = res.registerChild(this.makeInlineStatement());
			if (res.error) {
				return res.failure(
					new InvalidSyntaxSeclangError(
						this.curToken.posStart,
						this.curToken.posEnd,
						"Expected '{', '!', 'let', int or float"
					)
				);
			}

			return res.success(new IfNode(condition, onTrueStatement));
		}

		res.registerAdvancement();
		this.advance();

		const onTrueStatement = res.registerChild(this.makeStatements());
		if (res.error) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected '{', 'if', '!', 'let', int or float"
				)
			);
		}

		if (!(this.curToken instanceof RCurlyToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected '}'"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		const skippedEmptyLines = this.skipEmptyLines(res);

		if (this.curToken instanceof KeywordToken && this.curToken.value === "else") {
			res.registerAdvancement();
			this.advance();

			this.skipEmptyLines(res);

			res.resetAdvancementCount();
			const elseHasCurly = this.curToken instanceof LCurlyToken;
			if (elseHasCurly) {
				res.registerAdvancement();
				this.advance();
			}

			const onFalseStatement = res.registerChild(this.makeStatements());
			if (res.error) {
				return res.failure(
					new InvalidSyntaxSeclangError(
						this.curToken.posStart,
						this.curToken.posEnd,
						"Expected '{', 'if', '!', 'let', int or float"
					)
				);
			}

			if (elseHasCurly) {
				if (!((this.curToken as Token) instanceof RCurlyToken)) {
					return res.failure(
						new InvalidSyntaxSeclangError(
							this.curToken.posStart,
							this.curToken.posEnd,
							"Expected '}'"
						)
					);
				}
				res.registerAdvancement();
				this.advance();
			}

			return res.success(new IfNode(condition, onTrueStatement, onFalseStatement));
		} else {
			res.unregisterAdvancement(skippedEmptyLines);
			this.unadvance(skippedEmptyLines);
		}

		return res.success(new IfNode(condition, onTrueStatement));
	}

	private makeStatementWhile() {
		const res = new ParseNodeResult();

		if (!(this.curToken instanceof LParenToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected '('"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		const condition = res.registerChild(this.makeExpr());
		if (res.error) return res;

		if (!(this.curToken instanceof RParenToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected ')'"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		this.skipEmptyLines(res);

		res.resetAdvancementCount();
		if (!(this.curToken instanceof LCurlyToken)) {
			const whileBody = res.registerChild(this.makeInlineStatement());
			if (res.error) {
				return res.failure(
					new InvalidSyntaxSeclangError(
						this.curToken.posStart,
						this.curToken.posEnd,
						"Expected '{', '!', 'let', int or float"
					)
				);
			}

			return res.success(new WhileNode(condition, whileBody));
		}

		res.registerAdvancement();
		this.advance();

		const whileBody = res.registerChild(this.makeStatements());
		if (res.error) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected '{', 'while', 'if', '!', 'let', int or float"
				)
			);
		}

		if (!(this.curToken instanceof RCurlyToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected '}'"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		return res.success(new WhileNode(condition, whileBody));
	}

	private makeStatementFor() {
		const res = new ParseNodeResult();

		if (!(this.curToken instanceof LParenToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected '('"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		let initStatement = null;
		if (!(this.curToken instanceof SemicolonToken)) {
			initStatement = res.registerChild(this.makeExpr());
			if (res.error) return res;
		} else {
			initStatement = new EmptyNode(
				this.curToken.posStart.copy(),
				this.curToken.posEnd.copy()
			);
		}

		if (!(this.curToken instanceof SemicolonToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected ';'"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		let condition = null;
		if (!(this.curToken instanceof SemicolonToken)) {
			condition = res.registerChild(this.makeExpr());
			if (res.error) return res;
		} else {
			condition = new EmptyNode(this.curToken.posStart.copy(), this.curToken.posEnd.copy());
		}

		if (!((this.curToken as Token) instanceof SemicolonToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected ';'"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		let iterateStatement = null;
		if (!(this.curToken instanceof RParenToken)) {
			iterateStatement = res.registerChild(this.makeExpr());
			if (res.error) return res;
		} else {
			iterateStatement = new EmptyNode(
				this.curToken.posStart.copy(),
				this.curToken.posEnd.copy()
			);
		}

		if (!(this.curToken instanceof RParenToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected ')'"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		this.skipEmptyLines(res);

		res.resetAdvancementCount();
		if (!(this.curToken instanceof LCurlyToken)) {
			const forBody = res.registerChild(this.makeInlineStatement());
			if (res.error) {
				return res.failure(
					new InvalidSyntaxSeclangError(
						this.curToken.posStart,
						this.curToken.posEnd,
						"Expected '{', '!', 'let', int or float"
					)
				);
			}

			return res.success(new ForNode(initStatement, condition, iterateStatement, forBody));
		}

		res.registerAdvancement();
		this.advance();

		const forBody = res.registerChild(this.makeStatements());
		if (res.error) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected '{', 'for', 'while', 'if', '!', 'let', int or float"
				)
			);
		}

		if (!(this.curToken instanceof RCurlyToken)) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected '}'"
				)
			);
		}
		res.registerAdvancement();
		this.advance();

		return res.success(new ForNode(initStatement, condition, iterateStatement, forBody));
	}

	private makeStatement() {
		const res = new ParseNodeResult();

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

		const statement = res.registerChild(this.makeInlineStatement());
		if (res.error) {
			return res.failure(
				new InvalidSyntaxSeclangError(
					this.curToken.posStart,
					this.curToken.posEnd,
					"Expected 'for', 'while', 'if', '!', 'let', int or float"
				)
			);
		}
		return res.success(statement);
	}

	// read any number of newlines/semicolons
	private readAllNewlines() {
		const res = new ParseNodeResult();
		while (this.curToken instanceof NewlineToken || this.curToken instanceof SemicolonToken) {
			res.registerAdvancement();
			this.advance();
		}
		return res.success(null);
	}

	private makeStatements() {
		const res = new ParseNodeResult();

		const statementNodes: Node[] = [];
		const posStart = this.curToken.posStart.copy();

		if (this.curToken instanceof EOFToken) {
			return res.success(
				new EmptyNode(this.curToken.posStart.copy(), this.curToken.posEnd.copy())
			);
		}

		res.registerChild(this.readAllNewlines());

		while (this.curToken != null) {
			if (this.curToken instanceof EOFToken || this.curToken instanceof RCurlyToken) {
				break;
			}

			const curStatement = res.registerChild(this.makeStatement());
			statementNodes.push(curStatement);

			// no more newline separators - stop reading statements
			if (!(this.curToken instanceof NewlineToken || this.curToken instanceof SemicolonToken))
				break;

			// read all other newlines
			res.registerChild(this.readAllNewlines());
		}

		return res.success(
			new StatementsNode(statementNodes, posStart, this.curToken.posEnd.copy())
		);
	}
}

/* =================== */
// CONTEXT
/* =================== */

class Context {
	public displayName: string;
	public parentContext: Context;
	public parentEntryPos: Position;
	public symbolTable: SymbolTable;

	public constructor(
		displayName: string,
		parentContext: Context = null,
		parentEntryPos: Position = null
	) {
		this.displayName = displayName;
		this.parentContext = parentContext;
		this.parentEntryPos = parentEntryPos;
		this.symbolTable = null;
	}
}

/* =================== */
// SYMBOL TABLE
/* =================== */

export class SymbolTable {
	public symbols: Map<string, SeclangValue>;
	public parentTable: SymbolTable;

	public lenLimit: number | undefined;
	public realLen: number;

	public constructor(parentTable: SymbolTable = null) {
		this.symbols = new Map<string, SeclangValue>();
		this.parentTable = parentTable;
		this.lenLimit = undefined;
		this.realLen = 0;

		if (parentTable !== null) {
			let leftLenLimit = undefined;
			if (parentTable.lenLimit !== undefined) {
				leftLenLimit = parentTable.lenLimit - parentTable.realLen;
			}
			this.lenLimit = leftLenLimit;
		}
	}

	public get(name: string) {
		let curTable: SymbolTable = this;
		while (curTable !== null && !curTable.symbols.has(name)) {
			curTable = curTable.parentTable;
		}

		if (!curTable) return null;
		return curTable.symbols.get(name);
	}

	public isDefined(name: string) {
		return this.symbols.has(name);
	}

	public set(name: string, value: SeclangValue) {
		let curTable: SymbolTable = this;
		while (curTable !== null && !curTable.symbols.has(name)) {
			curTable = curTable.parentTable;
		}

		if (!curTable) {
			throw new Error(
				`Trying to set a value for a variable (${name} = ${value}) without first creating it (calling 'setNew')`
			);
		}
		curTable.symbols.set(name, value);
	}

	public setNew(name: string, value: SeclangValue) {
		this.realLen += 1;
		if (value instanceof SeclangList) {
			this.realLen += value.getRealLength();
		}

		if (this.lenLimit !== undefined && this.realLen > this.lenLimit)
			throw new VarsLimitReachedError();
		this.symbols.set(name, value);
	}

	public remove(name: string) {
		if (this.symbols.has(name)) {
			const toDelete = this.symbols.get(name);
			if (toDelete instanceof SeclangList) {
				this.realLen -= toDelete.getRealLength();
			}
			this.realLen -= 1;
			this.symbols.delete(name);
		}
	}
}

/* =================== */
// INTERPRETER
/* =================== */

class InterpreterResult extends StepResult<SeclangValue> {
	public toString() {
		return this.result.toString();
	}
}

export class SeclangValue {
	public context: Context;
	public posStart: Position;
	public posEnd: Position;

	public constructor() {
		this.context = null;
		this.posStart = null;
		this.posEnd = null;
	}

	public setContext(context: Context) {
		this.context = context;
		return this;
	}

	public setPos(posStart: Position = null, posEnd: Position = null) {
		this.posStart = posStart;
		this.posEnd = posEnd;
		return this;
	}

	public copy() {
		throw new Error("No copy method defined");
		return null;
	}

	public toString() {
		throw new Error("No toString method defined");
		return null;
	}

	public asString(): string {
		throw new Error("No asString method defined");
		return null;
	}

	protected illegalOperation(other: SeclangValue = null) {
		if (other === null) {
			other = this;
		}
		return new RuntimeSeclangError(
			this.posStart,
			other.posEnd,
			"Illegal operation",
			this.context
		);
	}

	public addTo(other: SeclangValue): [SeclangValue, SeclangError] {
		return [null, this.illegalOperation(other)];
	}

	public subBy(other: SeclangValue): [SeclangValue, SeclangError] {
		return [null, this.illegalOperation(other)];
	}

	public multBy(other: SeclangValue): [SeclangValue, SeclangError] {
		return [null, this.illegalOperation(other)];
	}

	public divBy(other: SeclangValue): [SeclangValue, SeclangError] {
		return [null, this.illegalOperation(other)];
	}

	public modOf(other: SeclangValue): [SeclangValue, SeclangError] {
		return [null, this.illegalOperation(other)];
	}

	public toPow(other: SeclangValue): [SeclangValue, SeclangError] {
		return [null, this.illegalOperation(other)];
	}

	public getCompEq(other: SeclangValue): [SeclangValue, SeclangError] {
		return [null, this.illegalOperation(other)];
	}

	public getCompNe(other: SeclangValue): [SeclangValue, SeclangError] {
		return [null, this.illegalOperation(other)];
	}

	public getCompLt(other: SeclangValue): [SeclangValue, SeclangError] {
		return [null, this.illegalOperation(other)];
	}

	public getCompGt(other: SeclangValue): [SeclangValue, SeclangError] {
		return [null, this.illegalOperation(other)];
	}

	public getCompLte(other: SeclangValue): [SeclangValue, SeclangError] {
		return [null, this.illegalOperation(other)];
	}

	public getCompGte(other: SeclangValue): [SeclangValue, SeclangError] {
		return [null, this.illegalOperation(other)];
	}

	public getAndWith(other: SeclangValue): [SeclangValue, SeclangError] {
		return [null, this.illegalOperation(other)];
	}

	public getOrWith(other: SeclangValue): [SeclangValue, SeclangError] {
		return [null, this.illegalOperation(other)];
	}

	public notted(): [SeclangValue, SeclangError] {
		return [null, this.illegalOperation()];
	}

	public toBool() {
		return false;
	}
}

export class SeclangNumber extends SeclangValue {
	public static false = new SeclangNumber(0);
	public static true = new SeclangNumber(1);

	public value: number;

	public constructor(value: number) {
		super();
		this.value = value;
	}

	public override copy() {
		let copy = new SeclangNumber(this.value);
		copy.context = this.context;
		copy.posStart = this.posStart;
		copy.posEnd = this.posEnd;
		return copy;
	}

	public override toString() {
		if (this.value === null) return "null";
		return this.value.toString();
	}

	public override asString() {
		return this.toString();
	}

	public override addTo(other: SeclangValue): [SeclangNumber | SeclangString, SeclangError] {
		if (other instanceof SeclangNumber)
			return [new SeclangNumber(this.value + other.value).setContext(this.context), null];
		if (other instanceof SeclangString)
			return [
				new SeclangString(this.value + other.value.toString()).setContext(this.context),
				null,
			];

		return [null, this.illegalOperation(other)];
	}

	public override subBy(other: SeclangValue): [SeclangNumber, SeclangError] {
		if (!(other instanceof SeclangNumber)) return [null, this.illegalOperation(other)];
		return [new SeclangNumber(this.value - other.value).setContext(this.context), null];
	}

	public override multBy(other: SeclangValue): [SeclangNumber, SeclangError] {
		if (!(other instanceof SeclangNumber)) return [null, this.illegalOperation(other)];
		return [new SeclangNumber(this.value * other.value).setContext(this.context), null];
	}

	public override divBy(other: SeclangValue): [SeclangNumber, SeclangError] {
		if (!(other instanceof SeclangNumber)) return [null, this.illegalOperation(other)];

		if (other.value === 0) {
			return [
				null,
				new RuntimeSeclangError(
					other.posStart,
					other.posEnd,
					"Division by zero",
					this.context
				),
			];
		}
		return [new SeclangNumber(this.value / other.value).setContext(this.context), null];
	}

	public override modOf(other: SeclangValue): [SeclangNumber, SeclangError] {
		if (!(other instanceof SeclangNumber)) return [null, this.illegalOperation(other)];

		if (other.value === 0) {
			return [
				null,
				new RuntimeSeclangError(
					other.posStart,
					other.posEnd,
					"Modulo of zero",
					this.context
				),
			];
		}
		return [new SeclangNumber(this.value % other.value).setContext(this.context), null];
	}

	public override toPow(other: SeclangValue): [SeclangNumber, SeclangError] {
		if (!(other instanceof SeclangNumber)) return [null, this.illegalOperation(other)];
		return [new SeclangNumber(this.value ** other.value).setContext(this.context), null];
	}

	public override getCompEq(other: SeclangValue): [SeclangNumber, SeclangError] {
		if (!(other instanceof SeclangNumber)) return [null, this.illegalOperation(other)];
		return [
			SeclangNumber.boolToSeclandNum(this.value === other.value).setContext(this.context),
			null,
		];
	}

	public override getCompNe(other: SeclangValue): [SeclangNumber, SeclangError] {
		if (!(other instanceof SeclangNumber)) return [null, this.illegalOperation(other)];
		return [
			SeclangNumber.boolToSeclandNum(this.value !== other.value).setContext(this.context),
			null,
		];
	}

	public override getCompLt(other: SeclangValue): [SeclangNumber, SeclangError] {
		if (!(other instanceof SeclangNumber)) return [null, this.illegalOperation(other)];
		return [
			SeclangNumber.boolToSeclandNum(this.value < other.value).setContext(this.context),
			null,
		];
	}

	public override getCompGt(other: SeclangValue): [SeclangNumber, SeclangError] {
		if (!(other instanceof SeclangNumber)) return [null, this.illegalOperation(other)];
		return [
			SeclangNumber.boolToSeclandNum(this.value > other.value).setContext(this.context),
			null,
		];
	}

	public override getCompLte(other: SeclangValue): [SeclangNumber, SeclangError] {
		if (!(other instanceof SeclangNumber)) return [null, this.illegalOperation(other)];
		return [
			SeclangNumber.boolToSeclandNum(this.value <= other.value).setContext(this.context),
			null,
		];
	}

	public override getCompGte(other: SeclangValue): [SeclangNumber, SeclangError] {
		if (!(other instanceof SeclangNumber)) return [null, this.illegalOperation(other)];
		return [
			SeclangNumber.boolToSeclandNum(this.value >= other.value).setContext(this.context),
			null,
		];
	}

	public override getAndWith(other: SeclangValue): [SeclangNumber, SeclangError] {
		if (!(other instanceof SeclangNumber)) return [null, this.illegalOperation(other)];
		return [
			SeclangNumber.boolToSeclandNum(this.toBool() && other.toBool()).setContext(
				this.context
			),
			null,
		];
	}

	public override getOrWith(other: SeclangValue): [SeclangNumber, SeclangError] {
		if (!(other instanceof SeclangNumber)) return [null, this.illegalOperation(other)];
		return [
			SeclangNumber.boolToSeclandNum(this.toBool() || other.toBool()).setContext(
				this.context
			),
			null,
		];
	}

	public override notted(): [SeclangNumber, SeclangError] {
		return [SeclangNumber.boolToSeclandNum(!this.toBool()).setContext(this.context), null];
	}

	public static boolToSeclandNum(value: boolean) {
		if (value) return new SeclangNumber(1);
		return new SeclangNumber(0);
	}

	public override toBool() {
		if (this.value === 0) return false;
		return true;
	}
}

export class SeclangBaseFunction extends SeclangValue {
	public name: string;

	protected constructor(name: string) {
		super();
		if (name === null) {
			this.name = "<anonymous>";
		} else {
			this.name = name;
		}
	}

	public override toString() {
		return `<function ${this.name}>`;
	}

	public override asString() {
		return this.toString();
	}

	protected generateNewContext() {
		const newContext = new Context(this.name, this.context, this.posStart);
		newContext.symbolTable = new SymbolTable(this.context.symbolTable);
		return newContext;
	}

	protected checkArgs(argNames: string[], args: SeclangValue[]) {
		const res = new RuntimeResult();

		if (args.length !== argNames.length) {
			return res.failure(
				new RuntimeSeclangError(
					this.posStart,
					this.posEnd,
					`${this.name} function expected ${argNames.length} arguments but ${args.length} were passed`,
					this.context
				)
			);
		}

		return res.success(null);
	}

	protected populateArgs(argNames: string[], args: SeclangValue[], newContext: Context) {
		args.forEach((argValue, idx) => {
			const argName = argNames[idx];
			argValue.setContext(newContext);
			newContext.symbolTable.setNew(argName, argValue);
		});
	}

	public execute(
		args: SeclangValue[],
		logOutput: boolean,
		stdout: SeclangStdout | undefined,
		instrConstraint: InstrConstraint
	) {
		throw new Error(`'execute' method is not implemented for function '${this.name}'`);
		return null;
	}
}

export class SeclangFunction extends SeclangBaseFunction {
	public bodyNode: Node;
	public argNames: string[];

	public constructor(name: string, bodyNode: Node, argNames: string[]) {
		super(name);
		this.bodyNode = bodyNode;
		this.argNames = argNames;
	}

	public override copy() {
		let copy = new SeclangFunction(this.name, this.bodyNode, this.argNames);
		copy.context = this.context;
		copy.posStart = this.posStart;
		copy.posEnd = this.posEnd;
		return copy;
	}

	public override execute(
		args: SeclangValue[],
		logOutput: boolean,
		stdout: SeclangStdout | undefined,
		instrConstraint: InstrConstraint
	) {
		const res = new RuntimeResult();

		const interpreter = new Interpreter(instrConstraint, logOutput, stdout);
		const newContext = this.generateNewContext();

		res.registerChild(this.checkArgs(this.argNames, args));
		if (res.shouldReturnUp()) return res;
		this.populateArgs(this.argNames, args, newContext);

		const value = res.registerChild(interpreter.visit(this.bodyNode, newContext));
		if (res.shouldReturnUp()) return res;

		return res.success(value);
	}
}

class SeclangPrintFunction extends SeclangBaseFunction {
	public argNames: string[];

	public constructor() {
		super("print");
		this.argNames = ["value"];
	}

	public override copy() {
		let copy = new SeclangPrintFunction();
		copy.context = this.context;
		copy.posStart = this.posStart;
		copy.posEnd = this.posEnd;
		return copy;
	}

	public override execute(
		args: SeclangValue[],
		logOutput: boolean,
		stdout: SeclangStdout | undefined
	) {
		const res = new RuntimeResult();
		const newContext = this.generateNewContext();
		res.registerChild(this.checkArgs(this.argNames, args));

		if (res.shouldReturnUp()) return res;
		this.populateArgs(this.argNames, args, newContext);

		const line = newContext.symbolTable.get("value").asString();

		if (logOutput) console.log(line);
		if (stdout) stdout.addLine(line);

		return res.success(new SeclangNumber(null));
	}
}

class SeclangSqrtFunction extends SeclangBaseFunction {
	public argNames: string[];

	public constructor() {
		super("sqrt");
		this.argNames = ["value"];
	}

	public override copy() {
		let copy = new SeclangSqrtFunction();
		copy.context = this.context;
		copy.posStart = this.posStart;
		copy.posEnd = this.posEnd;
		return copy;
	}

	public override execute(args: SeclangValue[]) {
		const res = new RuntimeResult();
		const newContext = this.generateNewContext();
		res.registerChild(this.checkArgs(this.argNames, args));
		if (res.shouldReturnUp()) return res;
		this.populateArgs(this.argNames, args, newContext);

		const val = newContext.symbolTable.get("value");
		if (!(val instanceof SeclangNumber)) {
			return res.failure(
				new RuntimeSeclangError(
					this.posStart,
					this.posEnd,
					`sqrt accept argument of type number`,
					this.context
				)
			);
		}
		const sqrtRes = Math.sqrt(val.value);
		return res.successReturn(new SeclangNumber(sqrtRes));
	}
}

class SeclangLenFunction extends SeclangBaseFunction {
	public argNames: string[];

	public constructor() {
		super("len");
		this.argNames = ["value"];
	}

	public override copy() {
		let copy = new SeclangLenFunction();
		copy.context = this.context;
		copy.posStart = this.posStart;
		copy.posEnd = this.posEnd;
		return copy;
	}

	public override execute(args: SeclangValue[]) {
		const res = new RuntimeResult();
		const newContext = this.generateNewContext();
		res.registerChild(this.checkArgs(this.argNames, args));
		if (res.shouldReturnUp()) return res;
		this.populateArgs(this.argNames, args, newContext);

		const val = newContext.symbolTable.get("value");
		if (!(val instanceof SeclangList || val instanceof SeclangString)) {
			return res.failure(
				new RuntimeSeclangError(
					this.posStart,
					this.posEnd,
					`len accept argument of only list and string types`,
					this.context
				)
			);
		}
		let length = 0;
		if (val instanceof SeclangList) length = val.elements.length;
		else if (val instanceof SeclangString) length = val.value.length;

		return res.successReturn(new SeclangNumber(length));
	}
}

class SeclangFloorFunction extends SeclangBaseFunction {
	public argNames: string[];

	public constructor() {
		super("floor");
		this.argNames = ["value"];
	}

	public override copy() {
		let copy = new SeclangFloorFunction();
		copy.context = this.context;
		copy.posStart = this.posStart;
		copy.posEnd = this.posEnd;
		return copy;
	}

	public override execute(args: SeclangValue[]) {
		const res = new RuntimeResult();
		const newContext = this.generateNewContext();
		res.registerChild(this.checkArgs(this.argNames, args));
		if (res.shouldReturnUp()) return res;
		this.populateArgs(this.argNames, args, newContext);

		const val = newContext.symbolTable.get("value");
		if (!(val instanceof SeclangNumber)) {
			return res.failure(
				new RuntimeSeclangError(
					this.posStart,
					this.posEnd,
					`Floor accept argument of type number`,
					this.context
				)
			);
		}
		const floorRes = Math.floor(val.value);
		return res.successReturn(new SeclangNumber(floorRes));
	}
}

class SeclangRandomFunction extends SeclangBaseFunction {
	public argNames: string[];

	public constructor() {
		super("random");
		this.argNames = [];
	}

	public override copy() {
		let copy = new SeclangRandomFunction();
		copy.context = this.context;
		copy.posStart = this.posStart;
		copy.posEnd = this.posEnd;
		return copy;
	}

	public override execute(args: SeclangValue[]) {
		const res = new RuntimeResult();
		const newContext = this.generateNewContext();
		res.registerChild(this.checkArgs(this.argNames, args));

		if (res.shouldReturnUp()) return res;
		this.populateArgs(this.argNames, args, newContext);

		const randNumber = Math.random();

		return res.successReturn(new SeclangNumber(randNumber));
	}
}

export class SeclangString extends SeclangValue {
	public value: string;

	public constructor(value: string) {
		super();
		this.value = value;
	}

	public override copy() {
		let copy = new SeclangString(this.value);
		copy.context = this.context;
		copy.posStart = this.posStart;
		copy.posEnd = this.posEnd;
		return copy;
	}

	public override toString() {
		return this.value;
	}

	public override asString() {
		return this.toString();
	}

	public override addTo(other: SeclangValue): [SeclangString, SeclangError] {
		if (other instanceof SeclangNumber)
			return [
				new SeclangString(this.value + other.value.toString()).setContext(this.context),
				null,
			];
		if (other instanceof SeclangString)
			return [new SeclangString(this.value + other.value).setContext(this.context), null];

		return [null, this.illegalOperation(other)];
	}

	public accessEl(index: SeclangValue): [SeclangValue, SeclangError] {
		if (index instanceof SeclangNumber) {
			if (!(0 <= index.value && index.value < this.value.length))
				return [null, this.outOfBounds(index)];

			return [new SeclangString(this.value[index.value]).setContext(this.context), null];
		}

		return [null, this.illegalOperation(index)];
	}

	public toBool() {
		return this.value.length > 0;
	}

	private outOfBounds(index: SeclangNumber) {
		return new RuntimeSeclangError(this.posStart, index.posEnd, "Out of bounds", this.context);
	}
}

export class SeclangList extends SeclangValue {
	public elements: SeclangValue[];

	public constructor(elements: SeclangValue[]) {
		super();
		this.elements = elements;
	}

	public getRealLength() {
		let curLen = 0;
		for (const el of this.elements) {
			if (el instanceof SeclangList) {
				curLen += el.getRealLength();
			}
			curLen += 1;
		}
		return curLen;
	}

	public override copy() {
		let copy = new SeclangList(this.elements);
		copy.context = this.context;
		copy.posStart = this.posStart;
		copy.posEnd = this.posEnd;
		return copy;
	}

	public override toString() {
		return `[${this.elements.join(", ")}]`;
	}

	public override asString() {
		return this.toString();
	}

	public accessEl(index: SeclangValue): [SeclangValue, SeclangError] {
		if (index instanceof SeclangNumber) {
			if (!(0 <= index.value && index.value < this.elements.length))
				return [null, this.outOfBounds(index)];

			return [this.elements[index.value].copy().setContext(this.context), null];
		}

		return [null, this.illegalOperation(index)];
	}

	public setEl(index: SeclangValue, newVal: SeclangValue): [SeclangValue, SeclangError] {
		if (index instanceof SeclangNumber) {
			if (!(0 <= index.value && index.value < this.elements.length))
				return [null, this.outOfBounds(index)];

			this.elements[index.value] = newVal;
			return [this.elements[index.value].copy().setContext(this.context), null];
		}

		return [null, this.illegalOperation(index)];
	}

	public toBool() {
		return this.elements.length > 0;
	}

	private outOfBounds(index: SeclangNumber) {
		return new RuntimeSeclangError(this.posStart, index.posEnd, "Out of bounds", this.context);
	}
}

class RuntimeResult {
	public value: SeclangValue;
	public error: SeclangError;
	public returningVal: SeclangValue;
	public breaking: boolean;
	public continuing: boolean;

	public constructor() {
		this.reset();
	}

	private reset() {
		this.value = null;
		this.error = null;
		this.returningVal = null;
		this.breaking = false;
		this.continuing = false;
	}

	public registerChild(res: RuntimeResult) {
		this.error = res.error;
		this.returningVal = res.returningVal;
		this.breaking = res.breaking;
		this.continuing = res.continuing;
		return res.value;
	}

	public success(value: SeclangValue) {
		this.reset();
		this.value = value;
		return this;
	}

	public successReturn(value: SeclangValue) {
		this.reset();
		this.returningVal = value;
		return this;
	}

	public successBreak() {
		this.reset();
		this.breaking = true;
		return this;
	}

	public successContinue() {
		this.reset();
		this.continuing = true;
		return this;
	}

	public failure(error: SeclangError) {
		this.reset();
		this.error = error;
		return this;
	}

	public shouldReturnUp() {
		return this.error || this.returningVal !== null || this.breaking || this.continuing;
	}
}

interface InstrConstraint {
	cur: number;
	limit: number | undefined;
}

class Interpreter {
	public instrConstraint: InstrConstraint;
	public logOutput: boolean;
	public stdout: SeclangStdout | undefined;

	public constructor(
		instrConstraint: InstrConstraint,
		logOutput: boolean,
		stdout?: SeclangStdout
	) {
		this.instrConstraint = instrConstraint;
		this.logOutput = logOutput;

		this.stdout = stdout;
	}

	public interpret(astRoot: Node, context: Context): InterpreterResult {
		const result = this.visit(astRoot, context);
		if (result.returningVal !== null) {
			result.failure(
				new RuntimeSeclangError(null, null, "'return' not inside a function", context)
			);
		}
		if (result.breaking !== false) {
			result.failure(
				new RuntimeSeclangError(null, null, "'break' not inside a loop", context)
			);
		}
		if (result.continuing !== false) {
			result.failure(
				new RuntimeSeclangError(null, null, "'continue' not inside a loop", context)
			);
		}
		return new InterpreterResult(result.value, result.error);
	}

	public visit(node: Node, context: Context): RuntimeResult {
		if (
			this.instrConstraint.limit !== undefined &&
			this.instrConstraint.cur > this.instrConstraint.limit
		) {
			throw new InstructionLimitReachedError(
				`Already executed ${this.instrConstraint.cur} out of possible ${this.instrConstraint.limit} instructions for this part of code`
			);
		}

		this.instrConstraint.cur += 1;

		if (node instanceof NumberNode) return this.visitNumberNode(node, context);
		if (node instanceof StringLNode) return this.visitStringLNode(node, context);
		if (node instanceof BinOpNode) return this.visitBinOpNode(node, context);
		if (node instanceof UnaryOpNode) return this.visitUnaryOpNode(node, context);
		if (node instanceof VarAccessNode) return this.visitVarAccessNode(node, context);
		if (node instanceof VarAssignNode) return this.visitVarAssignNode(node, context);
		if (node instanceof CreateVarNode) return this.visitCreateVarNode(node, context);
		if (node instanceof ListInitNode) return this.visitListInitNode(node, context);
		if (node instanceof IfNode) return this.visitIfNode(node, context);
		if (node instanceof WhileNode) return this.visitWhileNode(node, context);
		if (node instanceof ForNode) return this.visitForNode(node, context);
		if (node instanceof EmptyNode) return this.visitEmptyNode(node, context);
		if (node instanceof FunDefNode) return this.visitFunDefNode(node, context);
		if (node instanceof FunCallNode) return this.visitFunCallNode(node, context);
		if (node instanceof ListNode) return this.visitListNode(node, context);
		if (node instanceof ListAccessNode) return this.visitListAccessNode(node, context);
		if (node instanceof ListSetNode) return this.visitListSetNode(node, context);
		if (node instanceof StatementsNode) return this.visitStatementsNode(node, context);
		if (node instanceof ReturnNode) return this.visitReturnNode(node, context);
		if (node instanceof BreakNode) return this.visitBreakNode(node, context);
		if (node instanceof ContinueNode) return this.visitContinueNode(node, context);

		return this.noVisitMethod(node, context);
	}

	private visitNumberNode(node: NumberNode, context: Context) {
		const num = new SeclangNumber(node.token.value);
		num.setContext(context);
		num.setPos(node.posStart, node.posEnd);
		return new RuntimeResult().success(num);
	}

	private visitStringLNode(node: StringLNode, context: Context) {
		const str = new SeclangString(node.token.value);
		str.setContext(context);
		str.setPos(node.posStart, node.posEnd);
		return new RuntimeResult().success(str);
	}

	private visitBinOpNode(node: BinOpNode, context: Context) {
		const res = new RuntimeResult();

		const leftVal = res.registerChild(this.visit(node.leftNode, context));
		if (res.shouldReturnUp()) return res;
		const rightVal = res.registerChild(this.visit(node.rightNode, context));
		if (res.shouldReturnUp()) return res;

		let result: SeclangValue = null;
		let error: SeclangError = null;
		if (node.operationToken instanceof PlusToken) [result, error] = leftVal.addTo(rightVal);
		else if (node.operationToken instanceof MinusToken)
			[result, error] = leftVal.subBy(rightVal);
		else if (node.operationToken instanceof MulToken)
			[result, error] = leftVal.multBy(rightVal);
		else if (node.operationToken instanceof DivToken) [result, error] = leftVal.divBy(rightVal);
		else if (node.operationToken instanceof ModToken) [result, error] = leftVal.modOf(rightVal);
		else if (node.operationToken instanceof PowToken) [result, error] = leftVal.toPow(rightVal);
		else if (node.operationToken instanceof EEToken)
			[result, error] = leftVal.getCompEq(rightVal);
		else if (node.operationToken instanceof NEToken)
			[result, error] = leftVal.getCompNe(rightVal);
		else if (node.operationToken instanceof LTToken)
			[result, error] = leftVal.getCompLt(rightVal);
		else if (node.operationToken instanceof GTToken)
			[result, error] = leftVal.getCompGt(rightVal);
		else if (node.operationToken instanceof LTEToken)
			[result, error] = leftVal.getCompLte(rightVal);
		else if (node.operationToken instanceof GTEToken)
			[result, error] = leftVal.getCompGte(rightVal);
		else if (node.operationToken instanceof DAndToken)
			[result, error] = leftVal.getAndWith(rightVal);
		else if (node.operationToken instanceof DOrToken)
			[result, error] = leftVal.getOrWith(rightVal);
		else {
			throw new Error("Not implemented operator " + node.operationToken);
		}

		if (error) {
			return res.failure(error);
		}

		result.setPos(node.posStart, node.posEnd);
		return res.success(result);
	}

	private visitUnaryOpNode(node: UnaryOpNode, context: Context) {
		const res = new RuntimeResult();
		const num = res.registerChild(this.visit(node.node, context));
		if (res.shouldReturnUp()) return res;

		let result: SeclangValue = null;
		let error: SeclangError = null;
		if (node.operationToken instanceof MinusToken) {
			[result, error] = num.multBy(new SeclangNumber(-1));
		} else if (node.operationToken instanceof NotToken) {
			[result, error] = num.notted();
		}
		// TODO: handle unknown operator (throw error)

		if (error) return res.failure(error);
		result.setPos(node.posStart, node.posEnd);
		return res.success(result);
	}

	private visitVarAccessNode(node: VarAccessNode, context: Context) {
		const res = new RuntimeResult();

		const varName = node.varNameToken.value;
		const varValue = context.symbolTable.get(varName);

		if (varValue === null) {
			return res.failure(
				new RuntimeSeclangError(
					node.posStart,
					node.posEnd,
					`${varName} is not defined`,
					context
				)
			);
		}

		return res.success(varValue.copy().setPos(node.posStart, node.posEnd).setContext(context));
	}

	private visitVarAssignNode(node: VarAssignNode, context: Context) {
		const res = new RuntimeResult();

		const varName = node.varNameToken.value;
		const assignValue = res.registerChild(this.visit(node.valueNode, context));
		if (res.shouldReturnUp()) return res;

		if (context.symbolTable.get(varName) === null) {
			return res.failure(
				new RuntimeSeclangError(
					node.posStart,
					node.posEnd,
					`${varName} is not defined`,
					context
				)
			);
		}

		context.symbolTable.set(varName, assignValue);
		return res.success(assignValue);
	}

	private visitCreateVarNode(node: CreateVarNode, context: Context) {
		const res = new RuntimeResult();

		const varName = node.varNameToken.value;
		let assignValue: SeclangValue = new SeclangNumber(null);
		if (node.initValNode !== null) {
			assignValue = res.registerChild(this.visit(node.initValNode, context));
			if (res.shouldReturnUp()) return res;
		}

		if (context.symbolTable.isDefined(varName)) {
			return res.failure(
				new RuntimeSeclangError(
					node.posStart,
					node.posEnd,
					`${varName} is already defined`,
					context
				)
			);
		}

		context.symbolTable.setNew(varName, assignValue);
		return res.success(assignValue);
	}

	private visitListInitNode(node: ListInitNode, context: Context) {
		const res = new RuntimeResult();

		const listName = node.listNameToken.value;

		if (context.symbolTable.isDefined(listName)) {
			return res.failure(
				new RuntimeSeclangError(
					node.posStart,
					node.posEnd,
					`${listName} is already defined`,
					context
				)
			);
		}

		const listLen = res.registerChild(this.visit(node.length, context));
		if (res.shouldReturnUp()) return res;

		if (!(listLen instanceof SeclangNumber)) {
			return res.failure(
				new RuntimeSeclangError(
					node.posStart,
					node.posEnd,
					`index should be a number`,
					context
				)
			);
		}

		const nullElements = [];
		for (let i = 0; i < listLen.value; i++) nullElements.push(new SeclangNumber(0));
		const list = new SeclangList(nullElements);

		context.symbolTable.setNew(listName, list);
		return res.success(list);
	}

	private visitIfNode(node: IfNode, context: Context) {
		const res = new RuntimeResult();

		const newContext = new Context(null, context, node.posStart);
		newContext.symbolTable = new SymbolTable(context.symbolTable);

		const conditionEval = res.registerChild(this.visit(node.condition, newContext));
		if (res.shouldReturnUp()) return res;
		if (conditionEval.toBool()) {
			return this.visit(node.onTrue, newContext);
		}
		if (node.onFalse) {
			return this.visit(node.onFalse, newContext);
		}

		return res.success(new SeclangNumber(null));
	}

	private visitWhileNode(node: WhileNode, context: Context) {
		const res = new RuntimeResult();

		const newContext = new Context(null, context, node.posStart);
		newContext.symbolTable = new SymbolTable(context.symbolTable);

		while (true) {
			const conditionEval = res.registerChild(this.visit(node.condition, newContext));
			if (res.shouldReturnUp()) return res;
			if (conditionEval.toBool() === false) {
				break;
			}

			const innerContext = new Context(null, newContext, node.posStart);
			innerContext.symbolTable = new SymbolTable(newContext.symbolTable);

			res.registerChild(this.visit(node.body, innerContext));

			if (res.breaking) {
				break;
			}
			if (res.shouldReturnUp() && !res.continuing) return res;
		}

		return res.success(new SeclangNumber(null));
	}

	private visitForNode(node: ForNode, context: Context) {
		const res = new RuntimeResult();

		const newContext = new Context(null, context, node.posStart);
		newContext.symbolTable = new SymbolTable(context.symbolTable);

		res.registerChild(this.visit(node.initStatement, newContext));
		if (res.shouldReturnUp()) return res;

		while (true) {
			const conditionEval = res.registerChild(this.visit(node.condition, newContext));
			if (res.shouldReturnUp()) return res;
			if (conditionEval.toBool() === false) {
				break;
			}

			const innerContext = new Context(null, newContext, node.posStart);
			innerContext.symbolTable = new SymbolTable(newContext.symbolTable);

			res.registerChild(this.visit(node.body, innerContext));

			if (res.breaking) {
				break;
			}
			if (res.shouldReturnUp() && !res.continuing) return res;

			res.registerChild(this.visit(node.iterateStatement, newContext));
			if (res.shouldReturnUp()) return res;
		}

		return res.success(new SeclangNumber(null));
	}

	private visitEmptyNode(node: EmptyNode, context: Context) {
		const res = new RuntimeResult();
		return res.success(new SeclangNumber(null));
	}

	private visitFunDefNode(node: FunDefNode, context: Context) {
		const res = new RuntimeResult();

		const argNamesStr = node.argNames.map((argName) => argName.value);
		let funName = null;
		if (node.funName !== null) {
			funName = node.funName.value;
		}
		const fun = new SeclangFunction(funName, node.body, argNamesStr);

		fun.setContext(context);
		fun.setPos(node.posStart, node.posEnd);

		if (funName !== null) {
			context.symbolTable.setNew(funName, fun);
		}

		return res.success(fun);
	}

	private visitFunCallNode(node: FunCallNode, context: Context) {
		const res = new RuntimeResult();

		let funNameToCall = res.registerChild(this.visit(node.funNameToCallNode, context));
		if (res.shouldReturnUp()) return res;

		funNameToCall = funNameToCall.copy().setPos(node.posStart, node.posEnd);

		if (!(funNameToCall instanceof SeclangBaseFunction)) {
			return res.failure(
				new RuntimeSeclangError(
					node.posStart,
					node.posEnd,
					`${funNameToCall} is not a function`,
					context
				)
			);
		}

		const args: SeclangValue[] = [];

		for (const argNode of node.argNodes) {
			const argVal = res.registerChild(this.visit(argNode, context));
			if (res.shouldReturnUp()) return res;
			args.push(argVal);
		}

		let returnVal: SeclangValue = new SeclangNumber(null);
		res.registerChild(
			funNameToCall.execute(args, this.logOutput, this.stdout, this.instrConstraint)
		);
		if (res.shouldReturnUp()) {
			if (res.returningVal !== null) {
				returnVal = res.returningVal;
			} else {
				if (res.breaking !== false) {
					return res.failure(
						new RuntimeSeclangError(null, null, "'break' not inside a loop", context)
					);
				}
				if (res.continuing !== false) {
					return res.failure(
						new RuntimeSeclangError(null, null, "'continue' not inside a loop", context)
					);
				}
				return res;
			}
		}

		return res.success(returnVal.copy().setPos(node.posStart, node.posEnd).setContext(context));
	}

	private visitListNode(node: ListNode, context: Context) {
		const res = new RuntimeResult();

		const elements: SeclangValue[] = [];
		for (const elementNode of node.elementNodes) {
			const element = res.registerChild(this.visit(elementNode, context));
			if (res.shouldReturnUp()) return res;
			elements.push(element);
		}

		const list = new SeclangList(elements);
		list.setContext(context);
		list.setPos(node.posStart, node.posEnd);

		return res.success(list);
	}

	private visitListAccessNode(node: ListAccessNode, context: Context) {
		const res = new RuntimeResult();

		let list = res.registerChild(this.visit(node.listNameNode, context));
		if (res.shouldReturnUp()) return res;

		list = list.copy().setPos(node.posStart, node.posEnd);

		if (!(list instanceof SeclangList || list instanceof SeclangString)) {
			return res.failure(
				new RuntimeSeclangError(
					node.posStart,
					node.posEnd,
					`${list} is not a list or a string`,
					context
				)
			);
		}

		const index = res.registerChild(this.visit(node.indexNode, context));
		if (res.shouldReturnUp()) return res;

		const [element, error] = list.accessEl(index);
		if (error) {
			return res.failure(error);
		}

		return res.success(element);
	}

	private visitListSetNode(node: ListSetNode, context: Context) {
		const res = new RuntimeResult();

		let list = res.registerChild(this.visit(node.listNameNode, context));
		if (res.shouldReturnUp()) return res;

		list = list.copy().setPos(node.posStart, node.posEnd);

		if (!(list instanceof SeclangList)) {
			return res.failure(
				new RuntimeSeclangError(
					node.posStart,
					node.posEnd,
					`${list} is not a list`,
					context
				)
			);
		}

		const index = res.registerChild(this.visit(node.indexNode, context));
		if (res.shouldReturnUp()) return res;

		const newVal = res.registerChild(this.visit(node.valNode, context));
		if (res.shouldReturnUp()) return res;

		const [element, error] = list.setEl(index, newVal);
		if (error) {
			return res.failure(error);
		}

		return res.success(element);
	}

	private visitStatementsNode(node: StatementsNode, context: Context) {
		const res = new RuntimeResult();

		let lastVal: SeclangValue = new SeclangNumber(null);
		for (const elementNode of node.statementNodes) {
			lastVal = res.registerChild(this.visit(elementNode, context));
			if (res.shouldReturnUp()) return res;
		}

		return res.success(lastVal);
	}

	private visitReturnNode(node: ReturnNode, context: Context) {
		const res = new RuntimeResult();
		let returnVal: SeclangValue = new SeclangNumber(null);
		if (node.returnValue !== null) {
			returnVal = res.registerChild(this.visit(node.returnValue, context));
			if (res.shouldReturnUp()) return res;
		}
		return res.successReturn(returnVal);
	}

	private visitBreakNode(node: BreakNode, context: Context) {
		const res = new RuntimeResult();
		return res.successBreak();
	}

	private visitContinueNode(node: ContinueNode, context: Context) {
		const res = new RuntimeResult();
		return res.successContinue();
	}

	private noVisitMethod(node: Node, context: Context) {
		throw new Error(
			`No visit method defined for node ${node} of type ${node.constructor.name}`
		);
		return null;
	}
}

/* =================== */
// RUN
/* =================== */

const globalSymbolTable = new SymbolTable();
globalSymbolTable.setNew("true", SeclangNumber.true);
globalSymbolTable.setNew("false", SeclangNumber.false);
globalSymbolTable.setNew("print", new SeclangPrintFunction());
globalSymbolTable.setNew("sqrt", new SeclangSqrtFunction());
globalSymbolTable.setNew("len", new SeclangLenFunction());
globalSymbolTable.setNew("floor", new SeclangFloorFunction());
globalSymbolTable.setNew("random", new SeclangRandomFunction());

class RunResult extends StepResult<SeclangValue> {
	public toString() {
		return this.result.toString();
	}
}

export interface Limits {
	maxInstructions: number | undefined;
	maxVariables: number | undefined;
}

export class SeclangStdout {
	private buffer: string[];
	private curEnd: number;
	private looped: boolean;

	public constructor(stdoutLimit: number = 30) {
		this.buffer = new Array(stdoutLimit);
		this.curEnd = 0;
		this.looped = false;
	}

	public addLine(line: string) {
		if (this.curEnd >= this.buffer.length) {
			this.curEnd = 0;
			this.looped = true;
		}
		this.buffer[this.curEnd] = line;
		this.curEnd++;
	}

	public getValues() {
		const values = [];
		if (!this.looped) {
			for (let i = 0; i < this.curEnd; i++) values.push(this.buffer[i]);
		} else {
			const startPos = this.curEnd;
			for (let i = 0; i < this.buffer.length; i++) {
				values.push(this.buffer[(i + startPos) % this.buffer.length]);
			}
		}

		return values;
	}
}

export const run = (
	text: string,
	filename: string = "<program>",
	limits: Limits = { maxInstructions: undefined, maxVariables: undefined },
	logOutput: boolean = true,
	stdout: SeclangStdout = undefined,
	innerGlobalSymbolTable?: SymbolTable
): RunResult => {
	const lexer = new Lexer(filename, text);
	const lexerRes = lexer.makeTokens();
	if (lexerRes.error) {
		return new RunResult(null, lexerRes.error);
	}

	const parser = new Parser(lexerRes.result);
	const parseRes = parser.parse();
	if (parseRes.error) {
		return new RunResult(null, parseRes.error);
	}

	const interpreter = new Interpreter(
		{ cur: 0, limit: limits.maxInstructions },
		logOutput,
		stdout
	);

	globalSymbolTable.lenLimit = limits.maxVariables;
	if (innerGlobalSymbolTable !== undefined) {
		innerGlobalSymbolTable.parentTable = globalSymbolTable;
		innerGlobalSymbolTable.lenLimit = globalSymbolTable.lenLimit - globalSymbolTable.realLen;
	}

	const context = new Context("<program>");
	context.symbolTable = innerGlobalSymbolTable ?? globalSymbolTable;

	const interpreterRes = interpreter.interpret(parseRes.result, context);
	if (interpreterRes.error) {
		return new RunResult(null, interpreterRes.error);
	}
	return new RunResult(interpreterRes.result, null);
};
