// Financial Dashboard — zero-dependency Node server.
// Run: node server.js   (or: npm start)
// Serves the app from ./public and persists edits to ./db.json.

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DB_PATH = path.join(ROOT, "db.json");

function loadDB() {
  if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
  const db = {
    data,
    edits: { cats: {}, shares: {}, ignored: [], owed: (data.owedSeed || []).map(o => ({ ...o })) }
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  return db;
}

let db = loadDB();
const saveDB = () => fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];

  if (url === "/api/bootstrap" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(db));
  }

  if (url === "/api/edits" && req.method === "POST") {
    let body = "";
    req.on("data", c => (body += c));
    req.on("end", () => {
      try {
        const edits = JSON.parse(body);
        if (typeof edits !== "object" || edits === null) throw new Error("bad edits");
        db.edits = edits;
        saveDB();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"ok":true}');
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end('{"ok":false}');
      }
    });
    return;
  }

  const rel = url === "/" ? "index.html" : url.replace(/^\/+/, "");
  const file = path.join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end("not found");
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "text/plain" });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => console.log(`Financial Dashboard running at http://localhost:${PORT}`));
