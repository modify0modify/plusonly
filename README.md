# PlusOnly

A calculator where **addition is free** and every other operation is locked behind Pro Math at **$999**. Paying unlocks the rest of the keys for this browser tab.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints. Locally that is [http://127.0.0.1:47321](http://127.0.0.1:47321).

This is a Vite app, so the dev server is the way to run it. Opening `index.html` as a file will not load the modules.

## What to try

1. Type `12 + 7` and press `=`. That works immediately.
2. Press `−`, `×`, `÷`, `%`, `^`, or `±`. A paywall explains Pro Math.
3. Press **Pay $999**, then **Do the other math**. The operation you asked for runs, and the locks stay off until you close the tab.
4. The **Pro Math** pill can downgrade you back to addition.

Keyboard: `0–9`, `+ − * / % ^`, `Enter`, `Backspace`, `Esc`.

## Checks

```bash
npm test
```

That runs the calculator rules (free addition, locked operations, and the unlocked arithmetic) without a browser.
