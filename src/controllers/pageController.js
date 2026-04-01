import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readView(fileName) {
  const filePath = path.join(__dirname, "..", "views", fileName);
  return fs.readFileSync(filePath, "utf-8");
}

export function showLoginPage(req, res) {
  res.send(readView("login.html"));
}

export function showRegisterPage(req, res) {
  res.send(readView("register.html"));
}

export function showDashboard(req, res) {
  res.send(readView("dashboard.html"));
}