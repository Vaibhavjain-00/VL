// Tiny JSON-file "database" helper.
//
// We deliberately avoid a real database engine / npm package here because
// this project has to run with zero external dependencies (see README).
// For a student-facing virtual lab with a few hundred users this is a
// perfectly reasonable persistence layer; swap it for Postgres/Mongo later
// by re-implementing readData/writeData with the same signatures.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

// Extremely small in-process write queue so two concurrent requests
// writing the same file can't interleave and corrupt it.
const locks = new Map();

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readData(name) {
  const file = filePath(name);
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, "utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

async function writeData(name, data) {
  const previous = locks.get(name) || Promise.resolve();

  const next = previous.then(
    () =>
      new Promise((resolve, reject) => {
        const file = filePath(name);
        const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
        fs.writeFile(tmp, JSON.stringify(data, null, 2), (err) => {
          if (err) return reject(err);
          fs.rename(tmp, file, (err2) => {
            if (err2) return reject(err2);
            resolve();
          });
        });
      })
  );

  locks.set(name, next.catch(() => {}));
  return next;
}

module.exports = { readData, writeData, DATA_DIR };
