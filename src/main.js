import "./style.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/ibm-plex-mono/500.css";
import { clearLabel, idleExpr, initialState, OPS, reduce } from "./calc.js";
import { initialSciState, SCI_CONSTS, SCI_FUNCS, sciClearLabel, sciReduce } from "./scientific.js";

const OWNED_KEY = "plusonly-owned";
const PRICE = "$999.99";

const KEY_LABELS = {
  "−": "Subtraction",
  "×": "Multiplication",
  "÷": "Division",
  "^": "Exponent",
  "%": "Percent",
  "±": "Negative numbers",
  sin: "Sine",
  cos: "Cosine",
  tan: "Tangent",
  ln: "Natural log",
  log: "Logarithm",
  sqrt: "Square root",
  sqr: "Square",
  fact: "Factorial",
  recip: "Reciprocal",
  pi: "Pi",
  e: "Euler's number",
  "(": "Open parenthesis",
  ")": "Close parenthesis",
};

const SHIFT_NOTE = {
  sin: "sin⁻¹",
  cos: "cos⁻¹",
  tan: "tan⁻¹",
  ln: "eˣ",
  log: "10ˣ",
  sqrt: "∛",
};

const PITCHES = {
  "−": {
    title: "Subtraction is a paid feeling",
    copy: `The free plan only goes up. Stepping backward is Pro Math, ${PRICE}.`,
  },
  "×": {
    title: "Multiplication is networking",
    copy: "Free numbers may add one companion at a time. Multiplying them is the Pro Math social tier.",
  },
  "÷": {
    title: "Division is emotionally advanced",
    copy: "Splitting a number gets personal. Pro Math holds the velvet rope in front of the divide key.",
  },
  "%": {
    title: "Percents wear a little hat",
    copy: "A percent is a decimal in costume. Costumes, tips, and other drama live in Pro Math.",
  },
  "^": {
    title: "Exponents need their own chair",
    copy: "These numbers grow so fast the free tier filed a noise complaint. Powers sit with Pro Math.",
  },
  "±": {
    title: "Negativity is premium",
    copy: "Positive numbers are included. Crossing below zero takes Pro Math and a brief attitude adjustment.",
  },
  sin: {
    title: "Sine is a members-only wave",
    copy: "The free tier draws straight lines. A curve is this key, and cosine is not invited.",
  },
  cos: {
    title: "Cosine requires a co-signer",
    copy: "Sine will not introduce you. This neighbor keeps its own handshake.",
  },
  tan: {
    title: "Tangent bills by the slope",
    copy: "It climbs until it refuses. That drama is not included with sine or cosine.",
  },
  ln: {
    title: "Natural log is small-batch",
    copy: "Base e, priced like it. The 2nd shift eˣ comes with this key and nothing else.",
  },
  log: {
    title: "The logbook is under lock",
    copy: "Base ten, premium binding. 10ˣ is printed in the same volume.",
  },
  sqrt: {
    title: "Roots cost extra to excavate",
    copy: "Something is under that number. This key digs it out, cube root included.",
  },
  sqr: {
    title: "Squaring needs a permit",
    copy: "Multiplying a number by itself is a renovation, not a discount on the times key.",
  },
  fact: {
    title: "Factorial sends an itemized bill",
    copy: "One, then two, then everything before it, then one very long receipt.",
  },
  pi: {
    title: "Pi runs long. So does the bill.",
    copy: "Endless digits, one key. Euler's number is still waiting outside.",
  },
  e: {
    title: "e is on a private guest list",
    copy: "The growth constant has a door policy. Pi cannot get you in.",
  },
  recip: {
    title: "Flipping a number is a courtesy fee",
    copy: "Turn it upside down. Division remains a different purchase.",
  },
  "(": {
    title: "The open parenthesis holds the door",
    copy: "Groups need a doorman. The closing parenthesis sells its own ticket.",
  },
  ")": {
    title: "The close parenthesis keeps the cover",
    copy: "Every group still needs its own exit. This key shuts only what you bought.",
  },
  general: {
    title: "The rest of the buttons",
    copy: `Each locked key is its own ${PRICE} purchase. Press the one you want. Addition stays free.`,
    symbol: "∞",
  },
};

const displayEl = document.querySelector("#display");
const exprEl = document.querySelector("#expr");
const clearBtn = document.querySelector("#clear");
const pad = document.querySelector("#pad");
const device = document.querySelector(".device");
const pill = document.querySelector("#plan-pill");
const signBtn = document.querySelector("#sign");
const dialog = document.querySelector("#paywall");
const titleEl = document.querySelector("#paywall-title");
const copyEl = document.querySelector("#paywall-copy");
const symbolEl = document.querySelector("#paywall-symbol");
const featureEl = document.querySelector("#locked-feature");
const viewPitch = document.querySelector("#view-pitch");
const viewReceipt = document.querySelector("#view-receipt");
const viewManage = document.querySelector("#view-manage");
const subscribeBtn = document.querySelector("#subscribe");
const dismissBtn = document.querySelector("#dismiss");
const statusEl = document.querySelector("#pay-status");
const receiptBody = document.querySelector("#receipt-body");
const receiptClose = document.querySelector("#receipt-close");
const keepBtn = document.querySelector("#keep-pro");
const downgradeBtn = document.querySelector("#downgrade");
const sheet = document.querySelector(".sheet");
const sciPad = document.querySelector("#sci-pad");
const modelEl = document.querySelector("#model");
const angleBtn = document.querySelector("#angle");
const shiftBtn = document.querySelector("#shift");
const keysHint = document.querySelector(".keys-hint");

let mode = "basic";
let second = false;
let basicState = initialState();
let sciState = initialSciState();
let state = basicState;
let pendingGate = null;
let offer = null;
let paying = false;
let payToken = 0;

function loadOwned() {
  try {
    const raw = sessionStorage.getItem(OWNED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

let owned = loadOwned();

function access(id) {
  return owned.has(id);
}

function rememberOwned() {
  try {
    sessionStorage.setItem(OWNED_KEY, JSON.stringify([...owned]));
  } catch {
    /* The in-memory set still tracks purchases if storage is blocked. */
  }
  document.documentElement.classList.toggle("has-purchases", owned.size > 0);
}

function syncActive() {
  if (mode === "sci") sciState = state;
  else basicState = state;
}

function applyAccess() {
  syncActive();
  basicState = reduce(basicState, { type: "downgrade" }, access).state;
  sciState = sciReduce(sciState, { type: "downgrade" }, access).state;
  state = mode === "sci" ? sciState : basicState;
  render();
}

function grant(id) {
  if (id) owned.add(id);
  rememberOwned();
  render();
}

function revoke(id) {
  owned.delete(id);
  rememberOwned();
  applyAccess();
}

function revokeAll() {
  owned.clear();
  rememberOwned();
  applyAccess();
}

function render() {
  displayEl.textContent = state.display;
  exprEl.textContent = state.expr;
  clearBtn.textContent = mode === "sci" ? sciClearLabel(state) : clearLabel(state);
  pill.textContent = owned.size === 0 ? "Free tier" : owned.size === 1 ? "1 key" : `${owned.size} keys`;
  device.classList.toggle("is-sci", mode === "sci");
  modelEl.textContent = mode === "sci" ? "SM-99" : "FM-00";
  document.querySelector("#mode-basic").setAttribute("aria-selected", mode === "basic" ? "true" : "false");
  document.querySelector("#mode-sci").setAttribute("aria-selected", mode === "sci" ? "true" : "false");
  keysHint.textContent = mode === "sci"
    ? "Scientific keys are on the panel. Keyboard adds ( ) ! e p. Addition stays free."
    : "Keys too: 0–9, + − * / % ^, Enter, Backspace, Esc.";
  shiftBtn.setAttribute("aria-pressed", second ? "true" : "false");
  if (mode === "sci") {
    angleBtn.textContent = state.angle === "rad" ? "Rad" : "Deg";
    angleBtn.setAttribute("aria-pressed", state.angle === "rad" ? "true" : "false");
  }
  for (const button of sciPad.querySelectorAll("[data-label]")) {
    const label = second && button.dataset.label2 ? button.dataset.label2 : button.dataset.label;
    const textNodes = [...button.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);
    textNodes.forEach((node, index) => {
      node.nodeValue = index === textNodes.length - 1 ? label : "";
    });
    const fn = second && button.dataset.fn2 ? button.dataset.fn2 : button.dataset.fn;
    const meta = SCI_FUNCS[fn] || SCI_CONSTS[button.dataset.const] || { label: KEY_LABELS[button.dataset.purchase] || label };
    const locked = !owned.has(button.dataset.purchase);
    button.classList.toggle("is-owned", !locked);
    const upgrade = PITCHES[button.dataset.purchase];
    button.setAttribute("aria-label", locked ? `${upgrade?.title || meta.label}, ${PRICE}` : meta.label);
    button.title = locked ? upgrade?.title || `${PRICE} for this key` : "";
  }
  document.querySelector("#due-price").textContent = PRICE;
  if (!paying) subscribeBtn.textContent = `Pay ${PRICE}`;
  for (const button of device.querySelectorAll("[data-purchase]")) {
    const id = button.dataset.purchase;
    const unlocked = owned.has(id);
    button.classList.toggle("is-owned", unlocked);
    if (button.closest("#sci-pad")) continue;
    const label = OPS[id]?.label || KEY_LABELS[id] || id;
    button.setAttribute("aria-label", unlocked ? label : `${label}, ${PRICE}`);
    button.title = unlocked ? "" : `${PRICE} for this key`;
  }
  fitDisplay();
}

function fitDisplay() {
  const max = displayEl.clientWidth;
  let size = window.innerWidth < 380 ? 42 : 52;
  displayEl.style.fontSize = `${size}px`;
  while (displayEl.scrollWidth > max && size > 22) {
    size -= 2;
    displayEl.style.fontSize = `${size}px`;
  }
}

function dispatch(event) {
  const result = mode === "sci" ? sciReduce(state, event, access) : reduce(state, event, access);
  state = result.state;
  if (mode === "sci") sciState = state;
  else basicState = state;
  render();
  if (result.paywall) {
    pendingGate = event;
    openPaywall(result.paywall);
    shake();
  }
}

function switchMode(next) {
  if (next === mode) return;
  const shown = state.display;
  const carry = shown !== "Nope" && Number.isFinite(Number(shown)) ? shown : "0";
  if (mode === "sci") sciState = state;
  else basicState = state;
  mode = next;
  second = false;
  if (mode === "sci") {
    const angle = sciState.angle || "deg";
    sciState = {
      ...initialSciState(),
      angle,
      entry: carry,
      display: carry,
      freshResult: carry !== "0",
      tokens: carry !== "0" ? [{ type: "num", value: Number(carry) }] : [],
      expr: `Scientific · ${angle === "deg" ? "degrees" : "radians"}`,
    };
    state = sciState;
  } else {
    basicState = {
      ...initialState(),
      display: carry,
      overwrite: true,
      expr: idleExpr(false),
    };
    state = basicState;
  }
  render();
}

function shake() {
  device.classList.remove("shake");
  void device.offsetWidth;
  device.classList.add("shake");
}

function eventFromButton(button) {
  const kind = button.dataset.event;
  if (kind === "digit") return { type: "digit", digit: button.dataset.digit };
  if (kind === "op") return { type: "op", op: button.dataset.op };
  if (kind === "dot") return { type: "dot" };
  if (kind === "clear") return { type: "clear" };
  if (kind === "equals") return { type: "equals" };
  if (kind === "percent") return { type: "percent" };
  if (kind === "sign") return { type: "sign" };
  if (kind === "backspace") return { type: "backspace" };
  if (kind === "fn") {
    const fn = second && button.dataset.fn2 ? button.dataset.fn2 : button.dataset.fn;
    return { type: "fn", fn };
  }
  if (kind === "const") return { type: "const", name: button.dataset.const };
  if (kind === "paren") return { type: "paren", paren: button.dataset.paren };
  if (kind === "angle") return { type: "angle" };
  return null;
}

function flash(button) {
  if (!button) return;
  button.classList.add("is-down");
  window.setTimeout(() => button.classList.remove("is-down"), 90);
}

function buttonFor(event) {
  if (event.type === "digit") return pad.querySelector(`[data-digit="${event.digit}"]`);
  if (event.type === "op") return pad.querySelector(`[data-op="${CSS.escape(event.op)}"]`);
  if (event.type === "sign") return signBtn;
  if (event.type === "backspace") return document.querySelector("#backspace");
  if (event.type === "fn") return sciPad.querySelector(`[data-fn="${event.fn}"]`) || sciPad.querySelector(`[data-fn2="${event.fn}"]`);
  if (event.type === "const") return sciPad.querySelector(`[data-const="${event.name}"]`);
  if (event.type === "paren") return sciPad.querySelector(`[data-paren="${event.paren}"]`);
  if (event.type === "angle") return angleBtn;
  return document.querySelector(`[data-event="${event.type}"]`);
}

device.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.id === "plan-pill") return;
  if (button.id === "mode-basic") {
    switchMode("basic");
    return;
  }
  if (button.id === "mode-sci") {
    switchMode("sci");
    return;
  }
  if (button.dataset.event === "shift") {
    second = !second;
    render();
    return;
  }
  const next = eventFromButton(button);
  if (!next) return;
  if (second && button.dataset.fn2) second = false;
  button.blur();
  dispatch(next);
});

window.addEventListener("keydown", (event) => {
  if (dialog.open) return;
  const onButton = event.target instanceof Element && event.target.closest("button");
  if (onButton && (event.key === "Enter" || event.key === " ")) return;

  const key = event.key;
  let next = null;
  if (/^[0-9]$/.test(key)) next = { type: "digit", digit: key };
  else if (key === "+") next = { type: "op", op: "+" };
  else if (key === "-") next = { type: "op", op: "−" };
  else if (key === "*" || key === "x" || key === "X") next = { type: "op", op: "×" };
  else if (key === "/") next = { type: "op", op: "÷" };
  else if (key === "^") next = { type: "op", op: "^" };
  else if (key === "%") next = { type: "percent" };
  else if (key === ".") next = { type: "dot" };
  else if (key === "Enter" || key === "=") next = { type: "equals" };
  else if (key === "Backspace" || key === "Delete") next = { type: "backspace" };
  else if (key === "Escape" || key === "c" || key === "C") next = { type: "clear" };
  else if (mode === "sci" && (key === "(" || key === ")")) next = { type: "paren", paren: key };
  else if (mode === "sci" && key === "!") next = { type: "fn", fn: "fact" };
  else if (mode === "sci" && (key === "e" || key === "E")) next = { type: "const", name: "e" };
  else if (mode === "sci" && (key === "p" || key === "P")) next = { type: "const", name: "pi" };
  else return;

  if (event.repeat && next.type !== "digit" && next.type !== "backspace") return;
  event.preventDefault();
  flash(buttonFor(next));
  dispatch(next);
});

function showView(name) {
  viewPitch.hidden = name !== "pitch";
  viewReceipt.hidden = name !== "receipt";
  viewManage.hidden = name !== "manage";
}

function openPaywall(info) {
  if (dialog.open) return;
  paying = false;
  payToken += 1;
  subscribeBtn.disabled = false;
  statusEl.textContent = "";
  showView("pitch");
  offer = { id: info.id, label: info.label || KEY_LABELS[info.id] || info.op, symbol: info.op };
  const pitch = PITCHES[info.id] || PITCHES[info.op] || (info.label
    ? {
      title: `${offer.label} is ${PRICE}`,
      copy: `${offer.label} is sold on its own. The other locked keys stay locked.`,
      symbol: info.op,
    }
    : PITCHES.general);
  titleEl.textContent = pitch.title;
  copyEl.textContent = pitch.copy;
  const shift = SHIFT_NOTE[info.id];
  document.querySelector("#fine").textContent = shift
    ? `This ${PRICE} purchase unlocks only this key, including its 2nd function ${shift}. Every other key is a separate purchase.`
    : `This ${PRICE} purchase unlocks only this key. Every other locked key is a separate purchase.`;
  symbolEl.textContent = info.op || pitch.symbol || "∞";
  featureEl.textContent = offer.label || "This key";
  dialog.showModal();
  subscribeBtn.focus();
}

function fillOwnedList() {
  const list = document.querySelector("#owned-list");
  list.replaceChildren();
  for (const id of owned) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = KEY_LABELS[id] || id;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.return = id;
    button.textContent = "Return key";
    item.append(name, button);
    list.append(item);
  }
  downgradeBtn.hidden = owned.size === 0;
}

function openManage() {
  if (dialog.open) return;
  pendingGate = null;
  offer = null;
  showView("manage");
  titleEl.textContent = owned.size ? "Keys you bought" : "One key, one purchase";
  copyEl.textContent = owned.size
    ? "Each key was its own purchase. Return one, or return all of them."
    : `Every locked button is ${PRICE} by itself. Press a key to buy that key. Addition stays free.`;
  symbolEl.textContent = owned.size ? "★" : "∞";
  fillOwnedList();
  dialog.showModal();
  keepBtn.focus();
}

pill.addEventListener("click", openManage);

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function burst() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.createElement("div");
  layer.className = "burst";
  const colors = ["#ff8a1e", "#1e6b45", "#f2c14e", "#1c1915", "#fff8ee"];
  for (let i = 0; i < 18; i += 1) {
    const bit = document.createElement("i");
    bit.style.setProperty("--x", `${(Math.random() * 180 - 90).toFixed(0)}px`);
    bit.style.setProperty("--y", `${(-30 - Math.random() * 110).toFixed(0)}px`);
    bit.style.setProperty("--r", `${(Math.random() * 180).toFixed(0)}deg`);
    bit.style.background = colors[i % colors.length];
    layer.appendChild(bit);
  }
  sheet.appendChild(layer);
  window.setTimeout(() => layer.remove(), 900);
}

subscribeBtn.addEventListener("click", async () => {
  const token = ++payToken;
  paying = true;
  subscribeBtn.disabled = true;
  statusEl.textContent = `Charging ${PRICE}…`;
  await wait(700);
  if (token !== payToken || !dialog.open) return;
  statusEl.textContent = "Authorizing payment…";
  await wait(550);
  if (token !== payToken || !dialog.open) return;
  const bought = offer;
  grant(bought?.id);
  paying = false;
  burst();
  showView("receipt");
  titleEl.textContent = "Payment approved";
  copyEl.textContent = `${bought?.label || "That key"} is unlocked in this tab. The other locked keys are still for sale.`;
  symbolEl.textContent = "✓";
  const when = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  receiptBody.textContent = [
    "PLUSONLY REGISTER",
    "------------------------",
    `ITEM      ${bought?.label || "Key"}`,
    `KEY       ${bought?.symbol || bought?.id || ""}`,
    `TOTAL     ${PRICE}`,
    "STATUS    APPROVED",
    `TIME      ${when}`,
    "------------------------",
    "One key. One purchase.",
  ].join("\n");
  receiptClose.focus();
});

function releaseGate() {
  if (!pendingGate) return;
  const event = pendingGate;
  pendingGate = null;
  dispatch(event);
}

// Defer the close so this click cannot land on the calculator once the dialog is gone.
function closeDialog() {
  window.setTimeout(() => {
    if (dialog.open) dialog.close();
  }, 0);
}

receiptClose.addEventListener("click", closeDialog);
dismissBtn.addEventListener("click", () => {
  pendingGate = null;
  closeDialog();
});
keepBtn.addEventListener("click", closeDialog);
downgradeBtn.addEventListener("click", () => {
  pendingGate = null;
  offer = null;
  revokeAll();
  closeDialog();
});

document.querySelector("#owned-list").addEventListener("click", (event) => {
  const id = event.target.closest("[data-return]")?.dataset.return;
  if (!id) return;
  revoke(id);
  titleEl.textContent = owned.size ? "Keys you bought" : "One key, one purchase";
  copyEl.textContent = owned.size
    ? "Each key was its own purchase. Return one, or return all of them."
    : `Every locked button is ${PRICE} by itself. Press a key to buy that key. Addition stays free.`;
  fillOwnedList();
});

dialog.addEventListener("cancel", (event) => {
  if (paying) {
    event.preventDefault();
    return;
  }
  pendingGate = null;
});

dialog.addEventListener("close", () => {
  paying = false;
  payToken += 1;
  releaseGate();
});

dialog.addEventListener("click", (event) => {
  if (event.target === dialog && !paying) {
    pendingGate = null;
    closeDialog();
  }
});

window.addEventListener("resize", fitDisplay);
rememberOwned();
render();
