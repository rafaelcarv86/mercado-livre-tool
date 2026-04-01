import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import pkg from "pg";

// ✅ CARREGA ENV PRIMEIRO (ESSENCIAL)
dotenv.config();

const { Pool } = pkg;

// ✅ CONEXÃO COM BANCO (NEON)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// ✅ CRIAR TABELA
async function createTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ml_accounts (
      id SERIAL PRIMARY KEY,
      user_id TEXT UNIQUE,
      access_token TEXT,
      refresh_token TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

createTable();

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.ML_CLIENT_ID;
const CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
const REDIRECT_URI = process.env.ML_REDIRECT_URI;

// ✅ HOME
app.get("/", (req, res) => {
  res.send(`
    <h1>AllResult</h1>
    <a href="/auth/mercadolivre">Conectar conta do Mercado Livre</a>
  `);
});

// ✅ REDIRECIONA PARA LOGIN ML
app.get("/auth/mercadolivre", (req, res) => {
  const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
  res.redirect(authUrl);
});

// ✅ CALLBACK
app.get("/auth/mercadolivre/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Faltou o ?code");
  }

  try {
    // 🔁 troca code por token
    const response = await axios.post("https://api.mercadolibre.com/oauth/token", {
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    });

    const { access_token, refresh_token } = response.data;

    // 👤 pega dados do usuário
    const me = await axios.get("https://api.mercadolibre.com/users/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const user_id = String(me.data.id);

    // 💾 salva no banco
    await pool.query(
      `
      INSERT INTO ml_accounts (user_id, access_token, refresh_token)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        created_at = CURRENT_TIMESTAMP
      `,
      [user_id, access_token, refresh_token]
    );

    res.send(`
      <h2>Conta conectada com sucesso</h2>
      <p>User ID: ${user_id}</p>
      <p>Salvo no banco ✅</p>
    `);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("Erro na autenticação");
  }
});

// ✅ START SERVER
app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});