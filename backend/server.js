// BIET Jhansi Virtual Lab - backend API server.
//
// Deliberately built with ONLY Node's built-in modules (http, crypto, fs)
// so it runs anywhere `node` is installed with no `npm install` step and
// no dependency on internet access. See README.md for how to run it and
// for the reasoning behind the JSON-file "database".

const http = require("http");
const crypto = require("crypto");
const { URL } = require("url");

const { readData, writeData } = require("./lib/store");
const { verifyPassword, signToken, getAuthPayload } = require("./lib/auth");
const { computeFunctionGenerator, ValidationError } = require("./lib/simulate");

const PORT = process.env.PORT || 4000;
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB safety limit on request bodies

function send(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    ...extraHeaders,
  });
  res.end(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let received = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        reject(new ValidationError("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new ValidationError("Request body must be valid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function requireAuth(req) {
  const payload = getAuthPayload(req);
  if (!payload) {
    const err = new Error("Missing or invalid Authorization token");
    err.statusCode = 401;
    throw err;
  }
  return payload; // { username, name, ... , exp }
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleLogin(req, res) {
  const body = await readJsonBody(req);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    return send(res, 400, { error: "Username and password are required" });
  }

  const db = readData("students");
  const student = (db.students || []).find((s) => s.username === username);

  if (!student || !verifyPassword(password, student.salt, student.hash)) {
    return send(res, 401, { error: "Invalid username or password" });
  }

  const token = signToken({ username: student.username, name: student.name });
  return send(res, 200, {
    token,
    username: student.username,
    name: student.name,
    roll: student.roll,
  });
}

async function handleListLabs(req, res) {
  requireAuth(req);
  const db = readData("labs");
  const labs = (db.labs || []).map(({ id, name, icon, description, experiments }) => ({
    id,
    name,
    icon,
    description,
    experimentCount: experiments.length,
  }));
  return send(res, 200, { labs });
}

async function handleLabExperiments(req, res, labId) {
  requireAuth(req);
  const db = readData("labs");
  const lab = (db.labs || []).find((l) => l.id === labId);
  if (!lab) return send(res, 404, { error: "Lab not found" });
  return send(res, 200, {
    labId: lab.id,
    labName: lab.name,
    experiments: lab.experiments,
  });
}

async function handleSimulateFunctionGenerator(req, res) {
  requireAuth(req);
  const body = await readJsonBody(req);
  try {
    const result = computeFunctionGenerator(body);
    return send(res, 200, result);
  } catch (err) {
    if (err instanceof ValidationError) {
      return send(res, 400, { error: err.message });
    }
    throw err;
  }
}

async function handleSaveResult(req, res) {
  const auth = requireAuth(req);
  const body = await readJsonBody(req);

  const { Rf, R1, R2, C, Vsat, measuredFrequencyHz } = body;

  let computed;
  try {
    computed = computeFunctionGenerator({ Rf, R1, R2, C, Vsat });
  } catch (err) {
    if (err instanceof ValidationError) {
      return send(res, 400, { error: err.message });
    }
    throw err;
  }

  const measured = Number(measuredFrequencyHz);
  if (!Number.isFinite(measured) || measured <= 0) {
    return send(res, 400, { error: "measuredFrequencyHz must be a positive number" });
  }

  const percentError =
    (Math.abs(measured - computed.frequencyHz) / computed.frequencyHz) * 100;

  const record = {
    id: crypto.randomUUID(),
    username: auth.username,
    submittedAt: new Date().toISOString(),
    inputs: computed.inputs,
    theoreticalFrequencyHz: computed.frequencyHz,
    measuredFrequencyHz: measured,
    percentError,
  };

  const db = readData("results");
  const results = db.results || [];
  results.push(record);
  await writeData("results", { results });

  return send(res, 201, record);
}

async function handleListResults(req, res) {
  const auth = requireAuth(req);
  const db = readData("results");
  const mine = (db.results || [])
    .filter((r) => r.username === auth.username)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  return send(res, 200, { results: mine });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return send(res, 204, {});
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;

  try {
    if (path === "/api/health" && req.method === "GET") {
      return send(res, 200, { status: "ok", time: new Date().toISOString() });
    }

    if (path === "/api/auth/login" && req.method === "POST") {
      return await handleLogin(req, res);
    }

    if (path === "/api/labs" && req.method === "GET") {
      return await handleListLabs(req, res);
    }

    const labExpMatch = path.match(/^\/api\/labs\/(\d+)\/experiments$/);
    if (labExpMatch && req.method === "GET") {
      return await handleLabExperiments(req, res, Number(labExpMatch[1]));
    }

    if (path === "/api/experiments/function-generator/simulate" && req.method === "POST") {
      return await handleSimulateFunctionGenerator(req, res);
    }

    if (path === "/api/experiments/function-generator/results" && req.method === "POST") {
      return await handleSaveResult(req, res);
    }

    if (path === "/api/experiments/function-generator/results" && req.method === "GET") {
      return await handleListResults(req, res);
    }

    return send(res, 404, { error: "Not found" });
  } catch (err) {
    const status = err.statusCode || 500;
    if (status === 500) {
      // eslint-disable-next-line no-console
      console.error("Unhandled server error:", err);
    }
    return send(res, status, { error: err.message || "Internal server error" });
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`BIET Virtual Lab backend listening on http://localhost:${PORT}`);
});

module.exports = server;
