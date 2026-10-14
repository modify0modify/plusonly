import "./style.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/ibm-plex-mono/500.css";
import { clearLabel, idleExpr, initialState, OPS, reduce } from "./calc.js";

const PRO_KEY = "plusonly-pro";
const PRICE = "$999";

const PITCHES = {
  "−": {
    title: "Subtraction is a paid feeling",
    copy: "The free plan only goes up. Stepping backward is Pro Math, $999.",
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
  general: {
    title: "The rest of the buttons",
    copy: "Plus is included. Minus, times, divide, percent, powers, and negative numbers are Pro Math, for $999.",
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

let state = initialState();
if (isPro()) state = { ...state, expr: idleExpr(true) };
let pendingGate = null;
let paying = false;
let payToken = 0;

function isPro() {
  try {
    return sessionStorage.getItem(PRO_KEY) === "1";
  } catch {
    return document.documentElement.classList.contains("is-pro");
  }
}

function setPro(on) {
  try {
    if (on) sessionStorage.setItem(PRO_KEY, "1");
    else sessionStorage.removeItem(PRO_KEY);
  } catch {
    /* The in-memory class still unlocks the tab if storage is blocked. */
  }
  document.documentElement.classList.toggle("is-pro", on);
  if (!on) {
    const result = reduce(state, { type: "downgrade" }, false);
    state = result.state;
  }
  render();
}

function render() {
  const pro = isPro();
  displayEl.textContent = state.display;
  exprEl.textContent = state.expr;
  clearBtn.textContent = clearLabel(state);
  pill.textContent = pro ? "Pro Math" : "Free tier";
  document.querySelector("#due-price").textContent = PRICE;
  if (!paying) subscribeBtn.textContent = `Pay ${PRICE}`;
  signBtn.setAttribute("aria-label", pro ? "Toggle sign" : "Toggle sign, locked");
  signBtn.title = pro ? "" : "Included with Pro Math";

  for (const button of pad.querySelectorAll("[data-op]")) {
    const op = button.dataset.op;
    const label = OPS[op]?.label ?? op;
    const locked = Boolean(OPS[op]?.pro) && !pro;
    button.setAttribute("aria-label", locked ? `${label}, locked` : label);
    button.title = locked ? "Included with Pro Math" : "";
  }

  const percent = pad.querySelector('[data-event="percent"]');
  percent.setAttribute("aria-label", pro ? "Percent" : "Percent, locked");
  percent.title = pro ? "" : "Included with Pro Math";
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
  const result = reduce(state, event, isPro());
  state = result.state;
  render();
  if (result.paywall) {
    pendingGate = event;
    openPaywall(result.paywall);
    shake();
  }
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
  return document.querySelector(`[data-event="${event.type}"]`);
}

pad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const next = eventFromButton(button);
  if (!next) return;
  button.blur();
  dispatch(next);
});

signBtn.addEventListener("click", () => {
  signBtn.blur();
  dispatch({ type: "sign" });
});

document.querySelector("#backspace").addEventListener("click", () => {
  dispatch({ type: "backspace" });
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
  const pitch = PITCHES[info.op] || PITCHES.general;
  titleEl.textContent = pitch.title;
  copyEl.textContent = pitch.copy;
  symbolEl.textContent = info.op || pitch.symbol || "∞";
  featureEl.textContent = info.label || "This button";
  dialog.showModal();
  subscribeBtn.focus();
}

function openManage() {
  if (dialog.open) return;
  pendingGate = null;
  showView("manage");
  titleEl.textContent = "Pro Math is active";
  copyEl.textContent =
    "This tab can subtract, multiply, divide, take percents, and raise powers. Downgrade anytime and the free tier returns.";
  symbolEl.textContent = "★";
  dialog.showModal();
  keepBtn.focus();
}

pill.addEventListener("click", () => {
  if (isPro()) openManage();
  else {
    pendingGate = null;
    openPaywall({ kind: "general", op: "", label: "Every other operation" });
    symbolEl.textContent = "∞";
  }
});

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
  setPro(true);
  paying = false;
  burst();
  showView("receipt");
  titleEl.textContent = "Payment approved";
  copyEl.textContent = "Pro Math is unlocked in this tab.";
  symbolEl.textContent = "✓";
  const when = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  receiptBody.textContent = [
    "PLUSONLY REGISTER",
    "------------------------",
    "ITEM      Pro Math",
    "OPS       − × ÷ % ^ ±",
    `TOTAL     ${PRICE}`,
    "STATUS    APPROVED",
    `TIME      ${when}`,
    "------------------------",
    "Thank you for subscribing.",
  ].join("\n");
  receiptClose.focus();
});

function releaseGate() {
  if (pendingGate && isPro()) {
    const event = pendingGate;
    pendingGate = null;
    dispatch(event);
  } else {
    pendingGate = null;
  }
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
  setPro(false);
  closeDialog();
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
render();
