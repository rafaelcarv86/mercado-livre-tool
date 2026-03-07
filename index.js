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
      account_name TEXT,
      access_token TEXT,
      refresh_token TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE ml_accounts
    ADD COLUMN IF NOT EXISTS account_name TEXT;
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
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>AllResult - Painel</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: Arial, sans-serif;
        }

        body {
          display: flex;
          background: #f5f7fb;
          color: #1f2937;
        }

        .sidebar {
          width: 240px;
          min-height: 100vh;
          background: #111827;
          color: white;
          padding: 24px 16px;
        }

        .logo {
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 32px;
        }

        .menu a {
          display: block;
          color: #d1d5db;
          text-decoration: none;
          padding: 12px 14px;
          border-radius: 10px;
          margin-bottom: 8px;
          transition: 0.2s;
        }

        .menu a:hover,
        .menu a.active {
          background: #1f2937;
          color: white;
        }

        .main {
          flex: 1;
          padding: 24px;
        }

        .topbar {
          background: white;
          border-radius: 14px;
          padding: 18px 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.06);
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 24px;
          font-weight: bold;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .card {
          background: white;
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.06);
        }

        .card h3 {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .card p {
          font-size: 28px;
          font-weight: bold;
        }

        .panel {
          background: white;
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.06);
        }

        .panel h2 {
          margin-bottom: 12px;
        }

        .panel p {
          color: #6b7280;
          margin-bottom: 18px;
        }

        .btn {
          display: inline-block;
          background: #2563eb;
          color: white;
          text-decoration: none;
          padding: 12px 18px;
          border-radius: 10px;
          font-weight: bold;
          transition: 0.2s;
        }

        .btn:hover {
          background: #1d4ed8;
        }
      </style>
    </head>
    <body>
      <aside class="sidebar">
        <div class="logo">AllResult</div>

        <nav class="menu">
          <a href="/" class="active">Dashboard</a>
          <a href="/accounts">Contas conectadas</a>
          <a href="#">Produtos</a>
          <a href="#">Calculadora</a>
          <a href="#">Configurações</a>
        </nav>
      </aside>

      <main class="main">
        <div class="topbar">
          <div class="page-title">Painel Mercado Livre</div>
          <a href="/auth/mercadolivre" class="btn">Conectar nova conta</a>
        </div>

        <section class="cards">
          <div class="card">
            <h3>Contas conectadas</h3>
            <p>1</p>
          </div>

          <div class="card">
            <h3>Status da integração</h3>
            <p>OK</p>
          </div>

          <div class="card">
            <h3>Banco de dados</h3>
            <p>ON</p>
          </div>
        </section>

        <section class="panel">
          <h2>Bem-vindo ao painel</h2>
          <p>
            Aqui você vai conectar contas do Mercado Livre, importar produtos
            e usar sua calculadora de preço.
          </p>

          <a href="/auth/mercadolivre" class="btn">Conectar conta do Mercado Livre</a>
        </section>
      </main>
    </body>
    </html>
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
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nomear conta</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f5f7fb;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
      }
      .box {
        background: white;
        padding: 32px;
        border-radius: 16px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.08);
        width: 100%;
        max-width: 420px;
      }
      h1 {
        margin-bottom: 10px;
        font-size: 24px;
      }
      p {
        color: #6b7280;
        margin-bottom: 20px;
      }
      input {
        width: 100%;
        padding: 12px;
        border: 1px solid #d1d5db;
        border-radius: 10px;
        margin-bottom: 16px;
        font-size: 16px;
      }
      button {
        width: 100%;
        background: #2563eb;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
      }
      button:hover {
        background: #1d4ed8;
      }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>Conta conectada com sucesso</h1>
      <p>Agora dê um nome para identificar essa conta no sistema.</p>

      <form method="GET" action="/salvar-nome-conta">
        <input type="hidden" name="user_id" value="${user_id}" />
        <input
          type="text"
          name="account_name"
          placeholder="Ex: Loja Principal"
          required
        />
        <button type="submit">Salvar nome da conta</button>
      </form>
    </div>
  </body>
  </html>
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

app.get("/salvar-nome-conta", async (req, res) => {
  const { user_id, account_name } = req.query;

  if (!user_id || !account_name) {
    return res.status(400).send("Dados inválidos");
  }

  try {
    await pool.query(
      `
      UPDATE ml_accounts
      SET account_name = $1
      WHERE user_id = $2
      `,
      [account_name, user_id]
    );

    res.redirect("/accounts");

  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});