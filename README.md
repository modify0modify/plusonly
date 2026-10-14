# PlusOnly

A calculator where **addition is free** and every other key is its own **$999.99** purchase. Buying one key leaves the rest locked. Purchases last for this browser tab.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints. Locally that is [http://127.0.0.1:47321](http://127.0.0.1:47321).

This is a Vite app, so the dev server is the way to run it. Opening `index.html` as a file will not load the modules.

## What to try

1. Type `12 + 7` and press `=`. That works immediately.
2. Press `−`, `×`, `÷`, `%`, `^`, or `±`. Each one asks for its own $999.99 purchase.
3. Press **Scientific** for sine, cosine, tangent, log, roots, factorial, π, e, and parentheses. Each of those keys is a separate purchase too. **2nd** flips sin to sin⁻¹, log to 10ˣ, and √ to ∛, and that shifted function comes with the same key.
4. Press **Pay $999.99**, then **Do the other math**. Only the key you bought unlocks. The pill lists the keys you own, and you can return them one at a time.

Keyboard: `0–9`, `+ − * / % ^`, `Enter`, `Backspace`, `Esc`. In scientific mode, `( ) ! e p` also work.

## Checks

```bash
npm test
```

That runs the calculator rules without a browser: free addition, a locked key, and a purchase that unlocks only that key.
