# BIET Jhansi — Virtual Electronics Laboratory

This package has two parts:

```
backend/       Node.js API (auth, labs/experiments data, Experiment 7 simulation, results)
virtual-lab/   The React/Vite frontend you gave me, wired up to call the backend
```

## 1. Run the backend

```
cd backend
node server.js
```

No `npm install` needed — it's written with zero external dependencies
(only Node's built-in `http`, `crypto`, `fs`). Requires Node 18+.

It listens on `http://localhost:4000`. You should see:
`BIET Virtual Lab backend listening on http://localhost:4000`

Demo login: **username** `student` / **password** `1234` (same as the
original hardcoded login, now checked against a real hashed record in
`backend/data/students.json`).

## 2. Run the frontend

```
cd virtual-lab
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The dev
server proxies any `/api/...` request to `http://localhost:4000`
(configured in `vite.config.js`), so the backend must be running first.

## What's real here vs. what's a placeholder

- **Login, labs list, Integrated Circuit Lab's 12 experiments** — all
  served from the backend (`backend/data/labs.json`,
  `backend/data/students.json`), not hardcoded in the React components
  anymore.
- **Experiment 7 (Function generator using op-amp)** — the backend
  (`backend/lib/simulate.js`) actually computes frequency and amplitude
  from the resistor/capacitor values you enter, using the standard
  comparator+integrator relaxation-oscillator equations:
  - `f = Rf / (4 · R1 · R2 · C)`
  - `Vtriangle = Vsat · (R1 / Rf)`
  It also generates the waveform sample points the oscilloscope draws,
  and lets a student log a "measured" frequency to compare against the
  theoretical one (saved to `backend/data/results.json`).
- **Every other experiment in every other lab** (Basic Electronics,
  Digital Electronics, Network Theory, Electronic Devices,
  Communication, Signal & System, Analog Circuit, Digital Signal
  Processing, and the other 11 IC Lab experiments) — the data model and
  API are already there and lab-agnostic, but there's no real circuit
  simulation behind them. They currently show "No experiments published
  yet" / "Coming soon", same as the original frontend did. Building a
  correct, physically-grounded simulation for each of those is a
  substantial separate effort per experiment — tell me which ones matter
  most and I'll build those next the same way I built Experiment 7.

## A note on where this was built

I couldn't actually launch/preview the frontend from the sandbox I built
this in, because the `node_modules` you originally uploaded were
installed on Windows (only the Windows-specific Rolldown/Vite native
binding was present) and that sandbox has no internet access to fetch
the Linux one. That's a sandbox limitation, not a bug in this code — it
doesn't affect you running `npm install && npm run dev` normally on your
own machine. I did verify the code itself: every backend endpoint was
exercised live (login, labs, experiments, simulate, save/list results),
the simulation math was checked by hand, and every frontend file was
syntax-checked with Babel's parser plus a standalone unit test of the
trickiest logic (the oscilloscope phase-mapping function).
