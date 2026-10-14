import {
  applyOp,
  clearLabel,
  formatValue,
  initialState,
  reduce,
} from "../src/calc.js";

let failed = 0;

function assert(cond, message) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL  ${message}`);
  }
}

function eq(actual, expected, message) {
  assert(Object.is(actual, expected), `${message} (got ${JSON.stringify(actual)})`);
}

function press(state, events, pro = false) {
  let paywall = null;
  for (const event of events) {
    const result = reduce(state, event, pro);
    state = result.state;
    paywall = result.paywall;
  }
  return { state, paywall };
}

function digits(text) {
  return [...text].map((digit) => ({ type: "digit", digit }));
}

const added = press(initialState(), [...digits("12"), { type: "op", op: "+" }, ...digits("34"), { type: "equals" }]);
eq(added.state.display, "46", "12 + 34 = 46");
eq(added.state.expr, "12 + 34 =", "addition writes an equation");
eq(added.paywall, null, "addition does not paywall");

const chained = press(initialState(), [
  { type: "digit", digit: "1" },
  { type: "op", op: "+" },
  { type: "digit", digit: "2" },
  { type: "op", op: "+" },
  { type: "digit", digit: "4" },
  { type: "equals" },
]);
eq(chained.state.display, "7", "1 + 2 + 4 chains to 7");

const floaty = press(initialState(), [
  ...digits("0"),
  { type: "dot" },
  { type: "digit", digit: "1" },
  { type: "op", op: "+" },
  ...digits("0"),
  { type: "dot" },
  { type: "digit", digit: "2" },
  { type: "equals" },
]);
eq(floaty.state.display, "0.3", "0.1 + 0.2 = 0.3");

const locked = press(initialState(), [...digits("8"), { type: "op", op: "−" }]);
eq(locked.state.display, "8", "subtraction leaves the number alone");
eq(locked.paywall?.op, "−", "subtraction opens the paywall");

for (const op of ["×", "÷", "^"]) {
  const result = press(initialState(), [...digits("9"), { type: "op", op }]);
  eq(result.paywall?.op, op, `${op} is locked`);
  eq(result.state.pendingOp, null, `${op} does not become pending`);
}

const percent = press(initialState(), [...digits("50"), { type: "percent" }]);
eq(percent.paywall?.op, "%", "percent is locked");
eq(percent.state.display, "50", "percent does not change the display");

const sign = press(initialState(), [...digits("12"), { type: "sign" }]);
eq(sign.paywall?.op, "±", "sign is locked");
eq(sign.state.display, "12", "sign does not flip for free");

const times = press(
  initialState(),
  [...digits("8"), { type: "op", op: "×" }, { type: "digit", digit: "7" }, { type: "equals" }],
  true,
);
eq(times.state.display, "56", "8 × 7 = 56 once unlocked");
eq(times.paywall, null, "unlocked multiply does not paywall");

const minus = press(
  initialState(),
  [...digits("9"), { type: "op", op: "−" }, { type: "digit", digit: "4" }, { type: "equals" }],
  true,
);
eq(minus.state.display, "5", "9 − 4 = 5");

const div = press(
  initialState(),
  [...digits("20"), { type: "op", op: "÷" }, { type: "digit", digit: "4" }, { type: "equals" }],
  true,
);
eq(div.state.display, "5", "20 ÷ 4 = 5");

const power = press(
  initialState(),
  [{ type: "digit", digit: "2" }, { type: "op", op: "^" }, ...digits("10"), { type: "equals" }],
  true,
);
eq(power.state.display, "1024", "2 ^ 10 = 1024");

const zero = press(
  initialState(),
  [{ type: "digit", digit: "5" }, { type: "op", op: "÷" }, { type: "digit", digit: "0" }, { type: "equals" }],
  true,
);
eq(zero.state.display, "Nope", "division by zero is refused");
eq(zero.state.error, "Zero does not share.", "division by zero explains itself");

const half = press(initialState(), [...digits("50"), { type: "percent" }], true);
eq(half.state.display, "0.5", "50% becomes 0.5");

const tip = press(
  initialState(),
  [...digits("200"), { type: "op", op: "+" }, ...digits("10"), { type: "percent" }, { type: "equals" }],
  true,
);
eq(tip.state.display, "220", "200 + 10% = 220");

const negative = press(initialState(), [...digits("12"), { type: "sign" }], true);
eq(negative.state.display, "-12", "sign flip works when unlocked");

const edited = press(initialState(), [...digits("123"), { type: "backspace" }]);
eq(edited.state.display, "12", "backspace drops a digit");

const cleared = press(edited.state, [{ type: "clear" }, { type: "clear" }]);
eq(cleared.state.display, "0", "clear resets the entry, then the calculator");
eq(cleared.state.pendingOp, null, "all-clear drops the pending op");

const afterLock = press(initialState(), [...digits("8"), { type: "op", op: "−" }]);
const stillFree = press(afterLock.state, [
  { type: "op", op: "+" },
  { type: "digit", digit: "2" },
  { type: "equals" },
]);
eq(stillFree.state.display, "10", "addition still works after a locked key");
eq(stillFree.paywall, null, "the plus key stays free");

const downgraded = press(
  initialState(),
  [...digits("6"), { type: "op", op: "×" }, { type: "downgrade" }],
  true,
);
eq(downgraded.state.pendingOp, null, "downgrade clears a premium operator");
eq(downgraded.state.display, "6", "downgrade keeps the number on screen");

const original = initialState();
reduce(original, { type: "digit", digit: "4" }, false);
eq(original.display, "0", "reduce does not mutate the previous state");

eq(formatValue(0.1 + 0.2), "0.3", "formatValue tidies binary fractions");
eq(applyOp(3, "×", 4).value, 12, "applyOp multiplies");
eq(clearLabel({ ...initialState(), overwrite: false, display: "12", error: null }), "C", "mid-entry clear label is C");

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}

console.log("calculator checks passed");
