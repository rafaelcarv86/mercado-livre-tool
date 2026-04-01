import bcrypt from "bcryptjs";
import { pool } from "../db/index.js";

export async function register(req, res) {
  try {
    const { email, password } = req.body;

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2)",
      [email, hash]
    );

    res.redirect("/login");
  } catch (error) {
    res.status(400).send("Email já cadastrado");
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).send("Usuário não encontrado");
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).send("Senha incorreta");
    }

    req.session.userId = user.id;
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Erro ao fazer login");
  }
}

export function logout(req, res) {
  req.session.destroy(() => {
    res.redirect("/login");
  });
}