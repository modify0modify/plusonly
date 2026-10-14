/** Pure calculator state. Premium ops are gated by the `pro` flag. */

export const OPS = {
  "+": { pro: false, label: "Addition" },
  "−": { pro: true, label: "Subtraction" },
  "×": { pro: true, label: "Multiplication" },
  "÷": { pro: true, label: "Division" },
  "^": { pro: true, label: "Exponent" },
};

export const PREMIUM = {
  "%": { kind: "percent", op: "%", label: "Percent" },
  "±": { kind: "sign", op: "±", label: "Negative numbers" },
};

const MAX_DIGITS = 12;

export function initialState() {
  return {
    display: "0",
    accumulator: null,
    pendingOp: null,
    overwrite: true,
    error: null,
    expr: "Addition is free",
    showResultExpr: false,
  };
}

export function formatValue(n) {
  if (!Number.isFinite(n)) return "Nope";
  let tidy = Number(n.toPrecision(12));
  if (Object.is(tidy, -0)) tidy = 0;
  const abs = Math.abs(tidy);
  if (tidy !== 0 && (abs >= 1e12 || abs < 1e-9)) {
    return tidy
      .toExponential(6)
      .replace(/\.?0+e/, "e")
      .replace(/e\+/, "e+");
  }
  return String(tidy);
}

export function applyOp(a, op, b) {
  let value;
  switch (op) {
    case "+":
      value = a + b;
      break;
    case "−":
      value = a - b;
      break;
    case "×":
      value = a * b;
      break;
    case "÷":
      if (b === 0) return { error: "Zero does not share." };
      value = a / b;
      break;
    case "^":
      value = a ** b;
      break;
    default:
      return { error: "That key is not on this model." };
  }
  if (Number.isNaN(value)) return { error: "That one's above my pay grade." };
  if (!Number.isFinite(value)) return { error: "That number left the building." };
  return { value };
}

export function clearLabel(state) {
  if (!state.error && !state.overwrite && state.display !== "0") return "C";
  return "AC";
}

export function allows(access, id) {
  if (access === true) return true;
  if (typeof access === "function") return Boolean(access(id));
  if (access && typeof access.has === "function") return access.has(id);
  return false;
}

export function idleExpr(access) {
  return access === true ? "Pro Math · this tab only" : "Addition is free";
}

function withExpr(state, pro) {
  if (state.error) {
    state.expr = state.error;
    return state;
  }
  if (state.showResultExpr) return state;
  if (state.pendingOp != null && state.accumulator != null) {
    state.expr = `${formatValue(state.accumulator)} ${state.pendingOp}`;
    return state;
  }
  state.expr = idleExpr(pro);
  return state;
}

function finish(state, pro) {
  return { state: withExpr(state, pro), paywall: null };
}

function gate(state, info) {
  return { state, paywall: info };
}

function fresh() {
  return initialState();
}

function fail(state, message) {
  state.display = "Nope";
  state.error = message;
  state.expr = message;
  state.pendingOp = null;
  state.accumulator = null;
  state.overwrite = true;
  state.showResultExpr = false;
  return state;
}

export function reduce(state, event, pro = false) {
  const type = event?.type;

  if (type === "op") {
    const meta = OPS[event.op];
    if (!meta) return finish({ ...state }, pro);
    if (meta.pro && !allows(pro, event.op)) {
      return gate(state, { kind: "op", id: event.op, op: event.op, label: meta.label });
    }
  }

  if (type === "percent" && !allows(pro, "%")) {
    return gate(state, { ...PREMIUM["%"], id: "%" });
  }

  if (type === "sign" && !allows(pro, "±")) {
    return gate(state, { ...PREMIUM["±"], id: "±" });
  }

  const s = { ...state };

  if (s.error && !["digit", "dot", "clear", "backspace"].includes(type)) {
    return finish(s, pro);
  }

  if (type === "digit") {
    if (!/^[0-9]$/.test(event.digit || "")) return finish(s, pro);
    if (s.error) Object.assign(s, fresh());
    s.showResultExpr = false;
    if (s.overwrite) {
      s.display = event.digit;
      s.overwrite = false;
      return finish(s, pro);
    }
    const digits = s.display.replace("-", "").replace(".", "");
    if (digits.length >= MAX_DIGITS) return finish(state, pro);
    if (s.display === "0") s.display = event.digit;
    else if (s.display === "-0") s.display = `-${event.digit}`;
    else s.display += event.digit;
    return finish(s, pro);
  }

  if (type === "dot") {
    if (s.error) Object.assign(s, fresh());
    s.showResultExpr = false;
    if (s.overwrite) {
      s.display = "0.";
      s.overwrite = false;
      return finish(s, pro);
    }
    if (s.display.includes(".")) return finish(state, pro);
    s.display += ".";
    return finish(s, pro);
  }

  if (type === "clear") {
    if (s.error || s.overwrite || s.display === "0") return finish(fresh(), pro);
    s.display = "0";
    s.overwrite = true;
    s.showResultExpr = false;
    return finish(s, pro);
  }

  if (type === "backspace") {
    if (s.error) return finish(fresh(), pro);
    if (s.overwrite) return finish(s, pro);
    s.showResultExpr = false;
    if (
      s.display.length <= 1 ||
      (s.display.startsWith("-") && s.display.length === 2 && !s.display.includes("."))
    ) {
      s.display = "0";
      return finish(s, pro);
    }
    s.display = s.display.slice(0, -1);
    if (s.display === "" || s.display === "-" || s.display === "-.") s.display = "0";
    return finish(s, pro);
  }

  if (type === "op") {
    const current = Number(s.display);
    if (s.pendingOp && !s.overwrite) {
      const result = applyOp(s.accumulator, s.pendingOp, current);
      if (result.error) return { state: fail(s, result.error), paywall: null };
      s.accumulator = result.value;
      s.display = formatValue(result.value);
    } else {
      s.accumulator = current;
    }
    s.pendingOp = event.op;
    s.overwrite = true;
    s.showResultExpr = false;
    s.error = null;
    return finish(s, pro);
  }

  if (type === "equals") {
    if (!s.pendingOp) return finish(s, pro);
    const meta = OPS[s.pendingOp];
    if (meta?.pro && !allows(pro, s.pendingOp)) {
      return gate(state, { kind: "op", id: s.pendingOp, op: s.pendingOp, label: meta.label });
    }
    const current = Number(s.display);
    const left = s.accumulator;
    const op = s.pendingOp;
    const result = applyOp(left, op, current);
    if (result.error) return { state: fail(s, result.error), paywall: null };
    s.expr = `${formatValue(left)} ${op} ${formatValue(current)} =`;
    s.display = formatValue(result.value);
    s.accumulator = result.value;
    s.pendingOp = null;
    s.overwrite = true;
    s.showResultExpr = true;
    s.error = null;
    return { state: s, paywall: null };
  }

  if (type === "percent") {
    const n = Number(s.display);
    let next = n / 100;
    if ((s.pendingOp === "+" || s.pendingOp === "−") && s.accumulator != null) {
      next = s.accumulator * next;
    }
    if (!Number.isFinite(next)) return { state: fail(s, "That number left the building."), paywall: null };
    s.display = formatValue(next);
    s.overwrite = true;
    s.showResultExpr = false;
    s.error = null;
    return finish(s, pro);
  }

  if (type === "sign") {
    if (s.display === "0" || s.display === "0.") return finish(s, pro);
    s.showResultExpr = false;
    s.display = s.display.startsWith("-") ? s.display.slice(1) : `-${s.display}`;
    return finish(s, pro);
  }

  if (type === "downgrade") {
    if (s.pendingOp && OPS[s.pendingOp]?.pro && !allows(pro, s.pendingOp)) {
      s.pendingOp = null;
      s.showResultExpr = false;
    }
    return finish(s, pro);
  }

  return finish(s, pro);
}
