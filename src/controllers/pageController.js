import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db/index.js";

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

export function showAuthPage(req, res) {
  res.send(readView("autenticacoes.html"));
}

export function showSalesPage(req, res) {
  res.send(readView("vendas.html"));
}

export async function updateAccountName(req, res) {
  const { id, name } = req.body;

  await pool.query(
    "UPDATE ml_accounts SET name = $1 WHERE id = $2",
    [name, id]
  );

  res.sendStatus(200);
}