import express from "express";
import axios from "axios";
import dotenv from "dotenv";

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ml_accounts (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      access_token TEXT,
      refresh_token TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

createTable();

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.ML_CLIENT_ID;
const CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
const REDIRECT_URI = process.env.ML_REDIRECT_URI;

app.get("/", (req, res) => {
  res.send(`
    <h1>Integração Mercado Livre</h1>
    <a href="/auth/mercadolivre">
      <button>Conectar conta do Mercado Livre</button>
    </a>
  `);
});

app.get("/auth/mercadolivre", (req, res) => {
  const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
  res.redirect(authUrl);
});

app.get(["/auth/mercadolivre/callback", "/auth/mercadolivre/callback/"], async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Faltou o parâmetro ?code na URL.");
  }

  try {
    const response = await axios.post("https://api.mercadolibre.com/oauth/token", {
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    });

    res.send(`
      <h2>Autenticado com sucesso!</h2>
      <p>Não vou mostrar tokens aqui por segurança.</p>
      <p>Próximo passo: salvar access_token e refresh_token no banco.</p>
    `);
  } catch (error) {
    res.status(500).send(`
      <h2>Erro ao trocar code por token</h2>
      <pre>${JSON.stringify(error.response?.data || error.message, null, 2)}</pre>
    `);
  }
});

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});