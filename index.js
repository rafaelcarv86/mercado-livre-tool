import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

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

app.get(
  ["/auth/mercadolivre/callback", "/auth/mercadolivre/callback/"],
  async (req, res) => {
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

      const { access_token, refresh_token } = response.data;

      // 1) Descobrir qual conta autenticou (user_id)
      const me = await axios.get("https://api.mercadolibre.com/users/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const user_id = String(me.data.id);

      // 2) Salvar no banco (se já existir, atualiza)
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
        <h1>Autenticado com sucesso!</h1>
        <p>Conta vinculada (user_id: ${user_id})</p>
        <p>Tokens salvos no banco ✅</p>
      `);
    } catch (error) {
      res.status(500).send(`
        <h2>Erro ao trocar code por token</h2>
        <pre>${JSON.stringify(error.response?.data || error.message, null, 2)}</pre>
      `);
    }
  }
);

app.get("/accounts", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM ml_accounts");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});