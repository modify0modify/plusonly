import { applyOp, formatValue } from "./calc.js";

export const SCI_FUNCS = {
  sin: { label: "Sine", symbol: "sin" },
  cos: { label: "Cosine", symbol: "cos" },
  tan: { label: "Tangent", symbol: "tan" },
  asin: { label: "Inverse sine", symbol: "sin⁻¹" },
  acos: { label: "Inverse cosine", symbol: "cos⁻¹" },
  atan: { label: "Inverse tangent", symbol: "tan⁻¹" },
  log: { label: "Logarithm", symbol: "log" },
  ln: { label: "Natural log", symbol: "ln" },
  exp: { label: "Exponential", symbol: "eˣ" },
  pow10: { label: "Power of ten", symbol: "10ˣ" },
  sqrt: { label: "Square root", symbol: "√" },
  cbrt: { label: "Cube root", symbol: "∛" },
  sqr: { label: "Square", symbol: "x²" },
  fact: { label: "Factorial", symbol: "n!" },
  recip: { label: "Reciprocal", symbol: "1/x" },
};

export const SCI_CONSTS = {
  pi: { label: "Pi", symbol: "π", value: Math.PI },
  e: { label: "Euler's number", symbol: "e", value: Math.E },
};

const TRIG = new Set(["sin", "cos", "tan", "asin", "acos", "atan"]);

export function initialSciState() {
  return {
    tokens: [],
    entry: "0",
    display: "0",
    entering: false,
    freshResult: false,
    holdExpr: false,
    error: null,
    angle: "deg",
    expr: "Scientific · degrees",
  };
}

export function sciClearLabel(state) {
  if (!state.error && state.entering && state.entry !== "0" && state.entry !== "-0") return "C";
  return "AC";
}

function clean(n) {
  if (!Number.isFinite(n)) return n;
  if (Math.abs(n) < 1e-12) return 0;
  return n;
}

function fnName(fn) {
  return SCI_FUNCS[fn]?.symbol ?? fn;
}

export function applyFn(fn, n, angle) {
  let value;
  switch (fn) {
    case "sin":
      value = Math.sin(toRad(n, angle));
      break;
    case "cos":
      value = Math.cos(toRad(n, angle));
      break;
    case "tan": {
      const radians = toRad(n, angle);
      if (Math.abs(Math.cos(radians)) < 1e-12) return { error: "Tangent is undefined there." };
      value = Math.tan(radians);
      break;
    }
    case "asin":
      if (n < -1 || n > 1) return { error: "Inverse sine stays between −1 and 1." };
      value = fromRad(Math.asin(n), angle);
      break;
    case "acos":
      if (n < -1 || n > 1) return { error: "Inverse cosine stays between −1 and 1." };
      value = fromRad(Math.acos(n), angle);
      break;
    case "atan":
      value = fromRad(Math.atan(n), angle);
      break;
    case "log":
      if (n <= 0) return { error: "Logarithm wants a positive number." };
      value = Math.log10(n);
      break;
    case "ln":
      if (n <= 0) return { error: "Natural log wants a positive number." };
      value = Math.log(n);
      break;
    case "exp":
      value = Math.exp(n);
      break;
    case "pow10":
      value = 10 ** n;
      break;
    case "sqrt":
      if (n < 0) return { error: "Square root stays with the non-negative numbers." };
      value = Math.sqrt(n);
      break;
    case "cbrt":
      value = Math.cbrt(n);
      break;
    case "sqr":
      value = n * n;
      break;
    case "fact": {
      if (n < 0 || !Number.isInteger(n) || n > 170) {
        return { error: "Factorial wants a whole number from 0 to 170." };
      }
      value = 1;
      for (let i = 2; i <= n; i += 1) value *= i;
      break;
    }
    case "recip":
      if (n === 0) return { error: "Zero does not share." };
      value = 1 / n;
      break;
    default:
      return { error: "That key is not on this model." };
  }
  value = clean(value);
  if (Number.isNaN(value)) return { error: "That one's above my pay grade." };
  if (!Number.isFinite(value)) return { error: "That number left the building." };
  return { value };
}

function toRad(n, angle) {
  return angle === "deg" ? (n * Math.PI) / 180 : n;
}

function fromRad(n, angle) {
  return angle === "deg" ? (n * 180) / Math.PI : n;
}

function tokenText(token) {
  if (token.type === "num") return formatValue(token.value);
  if (token.type === "op") return token.op;
  if (token.type === "fn") return `${fnName(token.fn)}(`;
  if (token.type === "lparen") return "(";
  if (token.type === "rparen") return ")";
  return "";
}

function expressionText(tokens, entry, entering) {
  let text = tokens.map(tokenText).join("");
  if (entering) text += entry;
  return text;
}

function angleLabel(angle) {
  return angle === "deg" ? "degrees" : "radians";
}

function idle(pro, angle) {
  const unit = angleLabel(angle);
  return pro ? `Pro Math · ${unit}` : `Scientific · ${unit}`;
}

function finishSci(state, pro) {
  if (state.error) {
    state.expr = state.error;
    return { state, paywall: null };
  }
  state.display = state.entry;
  if (!state.holdExpr) {
    const built = expressionText(state.tokens, state.entry, state.entering);
    state.expr = built || idle(pro, state.angle);
  }
  return { state, paywall: null };
}

function gate(state, info) {
  return { state, paywall: info };
}

function fail(state, message) {
  state.display = "Nope";
  state.entry = "0";
  state.error = message;
  state.expr = message;
  state.tokens = [];
  state.entering = false;
  state.freshResult = false;
  state.holdExpr = false;
  return { state, paywall: null };
}

function describeFn(fn, value, angle) {
  const shown = formatValue(value);
  const unit = TRIG.has(fn) && angle === "deg" ? "°" : "";
  switch (fn) {
    case "sqrt":
      return `√(${shown})`;
    case "cbrt":
      return `∛(${shown})`;
    case "sqr":
      return `(${shown})²`;
    case "fact":
      return `${shown}!`;
    case "recip":
      return `1/(${shown})`;
    case "exp":
      return `e^(${shown})`;
    case "pow10":
      return `10^(${shown})`;
    default:
      return `${fnName(fn)}(${shown}${unit})`;
  }
}

function premiumIn(tokens) {
  return tokens.some((token) => {
    if (token.type === "num") return false;
    if (token.type === "op") return token.op !== "+";
    return true;
  });
}

function last(tokens) {
  return tokens[tokens.length - 1];
}

function implyMultiply(state, pro) {
  const prev = last(state.tokens);
  if (!prev || (prev.type !== "num" && prev.type !== "rparen")) return null;
  if (!pro) return gate(state, { kind: "op", op: "×", label: "Multiplication" });
  state.tokens.push({ type: "op", op: "×" });
  return null;
}

function evaluate(tokens, angle) {
  let index = 0;
  const peek = () => tokens[index];
  const eat = () => tokens[index++];

  function parseExpr() {
    let value = parseTerm();
    while (peek()?.type === "op" && (peek().op === "+" || peek().op === "−")) {
      const op = eat().op;
      value = combine(value, op, parseTerm());
    }
    return value;
  }

  function parseTerm() {
    let value = parsePower();
    while (peek()?.type === "op" && (peek().op === "×" || peek().op === "÷")) {
      const op = eat().op;
      value = combine(value, op, parsePower());
    }
    return value;
  }

  function parsePower() {
    const value = parseUnary();
    if (peek()?.type === "op" && peek().op === "^") {
      eat();
      return combine(value, "^", parsePower());
    }
    return value;
  }

  function parseUnary() {
    if (peek()?.type === "fn") {
      const fn = eat().fn;
      if (peek()?.type !== "lparen") throw new Error("That expression doesn't close.");
      eat();
      const arg = parseExpr();
      if (peek()?.type !== "rparen") throw new Error("That expression doesn't close.");
      eat();
      return callFn(fn, arg);
    }
    if (peek()?.type === "op" && peek().op === "−") {
      eat();
      return -parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const token = peek();
    if (!token) throw new Error("Finish the expression.");
    if (token.type === "num") {
      eat();
      return token.value;
    }
    if (token.type === "lparen") {
      eat();
      const value = parseExpr();
      if (peek()?.type !== "rparen") throw new Error("That expression doesn't close.");
      eat();
      return value;
    }
    throw new Error("That expression doesn't close.");
  }

  function combine(a, op, b) {
    const result = applyOp(a, op, b);
    if (result.error) throw new Error(result.error);
    return result.value;
  }

  function callFn(fn, arg) {
    const result = applyFn(fn, arg, angle);
    if (result.error) throw new Error(result.error);
    return result.value;
  }

  try {
    const value = clean(parseExpr());
    if (index !== tokens.length) return { error: "That expression doesn't close." };
    if (!Number.isFinite(value)) return { error: "That number left the building." };
    return { value };
  } catch (error) {
    return { error: error.message || "That expression doesn't close." };
  }
}

function commitEntry(state) {
  if (!state.entering) return;
  state.tokens.push({ type: "num", value: Number(state.entry) });
  state.entering = false;
}

function openParens(tokens) {
  return tokens.reduce((count, token) => {
    if (token.type === "lparen") return count + 1;
    if (token.type === "rparen") return count - 1;
    return count;
  }, 0);
}

function canPostfix(state) {
  if (state.entering || state.freshResult) return true;
  const prev = last(state.tokens);
  return prev?.type === "num" || prev?.type === "rparen";
}

function operandValue(state) {
  if (state.entering || state.freshResult) return Number(state.entry);
  const prev = last(state.tokens);
  if (prev?.type === "num") return prev.value;
  if (prev?.type === "rparen") {
    const result = evaluate(state.tokens, state.angle);
    if (result.error) return result;
    return result.value;
  }
  return null;
}

function replaceOperand(state, value) {
  if (state.entering || state.freshResult) {
    state.tokens = state.freshResult ? [] : state.tokens;
    state.entering = false;
    state.freshResult = false;
  } else {
    const prev = last(state.tokens);
    if (prev?.type === "num") state.tokens.pop();
    else if (prev?.type === "rparen") state.tokens = [];
  }
  state.tokens.push({ type: "num", value });
  state.entry = formatValue(value);
  state.entering = false;
  state.freshResult = false;
}

export function sciReduce(state, event, pro = false) {
  const type = event?.type;
  const s = {
    ...state,
    tokens: state.tokens.map((token) => ({ ...token })),
  };

  if (type === "fn" && !SCI_FUNCS[event.fn]) return finishSci(s, pro);
  if (type === "const" && !SCI_CONSTS[event.name]) return finishSci(s, pro);

  if (type === "op" && event.op !== "+" && !pro) {
    return gate(state, { kind: "op", op: event.op, label: event.op === "−" ? "Subtraction" : event.op === "×" ? "Multiplication" : event.op === "÷" ? "Division" : "Exponent" });
  }
  if (type === "percent" && !pro) return gate(state, { kind: "percent", op: "%", label: "Percent" });
  if (type === "sign" && !pro) return gate(state, { kind: "sign", op: "±", label: "Negative numbers" });
  if ((type === "fn" || type === "const" || type === "paren") && !pro) {
    const info = type === "fn"
      ? { kind: "fn", op: SCI_FUNCS[event.fn].symbol, label: SCI_FUNCS[event.fn].label }
      : type === "const"
        ? { kind: "const", op: SCI_CONSTS[event.name].symbol, label: SCI_CONSTS[event.name].label }
        : { kind: "paren", op: event.paren, label: "Parentheses" };
    return gate(state, info);
  }

  if (s.error && !["digit", "dot", "clear", "backspace"].includes(type)) return finishSci(s, pro);

  if (type === "angle") {
    s.angle = s.angle === "deg" ? "rad" : "deg";
    if (!s.holdExpr && s.tokens.length === 0 && !s.entering) s.expr = idle(pro, s.angle);
    return { state: s, paywall: null };
  }

  if (type === "digit") {
    if (!/^[0-9]$/.test(event.digit || "")) return finishSci(s, pro);
    if (s.error) Object.assign(s, initialSciState(), { angle: s.angle });
    if (s.freshResult) {
      s.tokens = [];
      s.freshResult = false;
      s.entering = false;
    }
    s.holdExpr = false;
    if (!s.entering) {
      const implied = implyMultiply(s, pro);
      if (implied) return implied;
      s.entry = s.entry === "-0" ? `-${event.digit}` : event.digit;
      s.entering = true;
      return finishSci(s, pro);
    }
    const digits = s.entry.replace("-", "").replace(".", "");
    if (digits.length >= 12) return finishSci(state, pro);
    if (s.entry === "0") s.entry = event.digit;
    else if (s.entry === "-0") s.entry = `-${event.digit}`;
    else s.entry += event.digit;
    return finishSci(s, pro);
  }

  if (type === "dot") {
    if (s.error) Object.assign(s, initialSciState(), { angle: s.angle });
    if (s.freshResult) {
      s.tokens = [];
      s.freshResult = false;
      s.entering = false;
    }
    s.holdExpr = false;
    if (!s.entering) {
      const implied = implyMultiply(s, pro);
      if (implied) return implied;
      s.entry = "0.";
      s.entering = true;
      return finishSci(s, pro);
    }
    if (s.entry.includes(".")) return finishSci(state, pro);
    s.entry += ".";
    return finishSci(s, pro);
  }

  if (type === "clear") {
    if (s.error || !s.entering) return finishSci({ ...initialSciState(), angle: s.angle }, pro);
    s.entry = "0";
    s.entering = false;
    s.holdExpr = false;
    return finishSci(s, pro);
  }

  if (type === "backspace") {
    if (s.error) return finishSci({ ...initialSciState(), angle: s.angle }, pro);
    if (!s.entering) return finishSci(s, pro);
    s.holdExpr = false;
    s.freshResult = false;
    if (s.entry.length <= 1 || (s.entry.startsWith("-") && s.entry.length === 2 && !s.entry.includes("."))) {
      s.entry = "0";
      return finishSci(s, pro);
    }
    s.entry = s.entry.slice(0, -1);
    if (s.entry === "" || s.entry === "-" || s.entry === "-.") s.entry = "0";
    return finishSci(s, pro);
  }

  if (type === "op") {
    s.holdExpr = false;
    if (s.freshResult) {
      s.tokens = [{ type: "num", value: Number(s.entry) }];
      s.freshResult = false;
      s.entering = false;
    }
    const prev = last(s.tokens);
    const waiting = !s.entering && (!prev || prev.type === "lparen" || prev.type === "fn" || prev.type === "op");
    if (event.op === "−" && waiting) {
      s.entry = "-0";
      s.entering = true;
      return finishSci(s, pro);
    }
    if (s.entering) commitEntry(s);
    else if (!prev || prev.type === "lparen" || prev.type === "fn") return finishSci(s, pro);
    else if (prev.type === "op") s.tokens.pop();
    s.tokens.push({ type: "op", op: event.op });
    return finishSci(s, pro);
  }

  if (type === "fn") {
    if (canPostfix(s)) {
      const raw = operandValue(s);
      if (raw && typeof raw === "object" && raw.error) return fail(s, raw.error);
      const result = applyFn(event.fn, raw, s.angle);
      if (result.error) return fail(s, result.error);
      replaceOperand(s, result.value);
      s.holdExpr = true;
      s.expr = describeFn(event.fn, raw, s.angle);
      s.display = s.entry;
      return { state: s, paywall: null };
    }
    if (s.freshResult) s.freshResult = false;
    s.holdExpr = false;
    if (s.entering) commitEntry(s);
    const implied = implyMultiply(s, pro);
    if (implied) return implied;
    s.tokens.push({ type: "fn", fn: event.fn });
    s.tokens.push({ type: "lparen" });
    s.entry = "0";
    s.entering = false;
    return finishSci(s, pro);
  }

  if (type === "const") {
    const constant = SCI_CONSTS[event.name];
    s.holdExpr = false;
    if (s.freshResult) {
      s.tokens = [];
      s.freshResult = false;
      s.entering = false;
    }
    if (s.entering) commitEntry(s);
    const implied = implyMultiply(s, pro);
    if (implied) return implied;
    s.tokens.push({ type: "num", value: constant.value });
    s.entry = formatValue(constant.value);
    s.entering = false;
    return finishSci(s, pro);
  }

  if (type === "paren") {
    s.holdExpr = false;
    if (event.paren === "(") {
      if (s.freshResult) s.freshResult = false;
      if (s.entering) commitEntry(s);
      const implied = implyMultiply(s, pro);
      if (implied) return implied;
      s.tokens.push({ type: "lparen" });
      s.entry = "0";
      s.entering = false;
      return finishSci(s, pro);
    }
    if (openParens(s.tokens) <= 0) return finishSci(s, pro);
    if (s.entering) commitEntry(s);
    const prev = last(s.tokens);
    if (!prev || prev.type === "op" || prev.type === "lparen" || prev.type === "fn") return finishSci(s, pro);
    s.tokens.push({ type: "rparen" });
    return finishSci(s, pro);
  }

  if (type === "equals") {
    const tokens = s.tokens.map((token) => ({ ...token }));
    if (s.entering) tokens.push({ type: "num", value: Number(s.entry) });
    else if (tokens.length === 0) tokens.push({ type: "num", value: Number(s.entry) });
    else if (last(tokens)?.type === "op") tokens.push({ type: "num", value: Number(s.entry) });
    let open = openParens(tokens);
    while (open > 0) {
      tokens.push({ type: "rparen" });
      open -= 1;
    }
    if (!pro && premiumIn(tokens)) {
      const token = tokens.find((item) => item.type !== "num" && !(item.type === "op" && item.op === "+"));
      const op = token?.op || token?.fn || "(";
      return gate(state, { kind: "op", op, label: "Scientific" });
    }
    const result = evaluate(tokens, s.angle);
    if (result.error) return fail(s, result.error);
    const shown = expressionText(tokens, "", false);
    s.tokens = [{ type: "num", value: result.value }];
    s.entry = formatValue(result.value);
    s.display = s.entry;
    s.entering = false;
    s.freshResult = true;
    s.holdExpr = true;
    s.error = null;
    s.expr = `${shown}=`;
    return { state: s, paywall: null };
  }

  if (type === "percent") {
    const n = Number(s.entry);
    let next = n / 100;
    const opToken = last(s.tokens);
    const left = s.tokens[s.tokens.length - 2];
    if (opToken?.type === "op" && (opToken.op === "+" || opToken.op === "−") && left?.type === "num") {
      next = left.value * next;
    }
    if (!Number.isFinite(next)) return fail(s, "That number left the building.");
    s.entry = formatValue(next);
    s.entering = true;
    s.freshResult = false;
    s.holdExpr = false;
    return finishSci(s, pro);
  }

  if (type === "sign") {
    if (s.entry === "0" || s.entry === "0.") return finishSci(s, pro);
    s.holdExpr = false;
    s.entry = s.entry.startsWith("-") ? s.entry.slice(1) : `-${s.entry}`;
    if (s.freshResult && last(s.tokens)?.type === "num") {
      s.tokens[s.tokens.length - 1] = { type: "num", value: Number(s.entry) };
    }
    if (!s.entering && !s.freshResult) s.entering = true;
    return finishSci(s, pro);
  }

  if (type === "downgrade") {
    if (premiumIn(s.tokens)) {
      const n = Number(s.entry);
      s.tokens = Number.isFinite(n) ? [{ type: "num", value: n }] : [];
      s.entering = false;
      s.freshResult = true;
      s.holdExpr = false;
    }
    return finishSci(s, false);
  }

  return finishSci(s, pro);
}
