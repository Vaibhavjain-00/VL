const crypto = require("crypto");

// In production set this via an environment variable. A fixed fallback is
// fine for local/dev use but must be overridden before this is deployed
// anywhere real students' data would matter.
const SECRET = process.env.VLAB_JWT_SECRET || "biet-jhansi-dev-secret-change-me";

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hour session

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
}

function verifyPassword(password, salt, expectedHash) {
  const actual = hashPassword(password, salt);
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function signToken(payload) {
  const body = { ...payload, exp: Date.now() + TOKEN_TTL_MS };
  const encoded = base64url(JSON.stringify(body));
  const signature = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");

  const sigBuf = Buffer.from(signature || "");
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Reads "Authorization: Bearer <token>" and returns the decoded payload or null.
function getAuthPayload(req) {
  const header = req.headers["authorization"] || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return verifyToken(match[1]);
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, getAuthPayload };
