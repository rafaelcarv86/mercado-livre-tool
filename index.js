import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import pkg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "segredo_super_secreto",
    resave: false,
    saveUninitialized: false,
  })
);

// ===== CRIAR TABELAS =====
async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

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
createTables();

// ===== MIDDLEWARE AUTH =====
function auth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

// ===== HOME (PROTEGIDA) =====
app.get("/", auth, (req, res) => {
  res.send(`
    <h1>AllResult</h1>
    <p>Logado com sucesso</p>
    <a href="/auth/mercadolivre">Conectar Mercado Livre</a><br><br>
    <a href="/logout">Sair</a>
  `);
});

// ===== LOGIN =====
app.get("/login", (req, res) => {
  res.send(`
    <style>
      body { font-family: Arial; background:#f5f7fb; display:flex; justify-content:center; align-items:center; height:100vh; }
      .box { background:white; padding:30px; border-radius:10px; width:300px; box-shadow:0 5px 20px rgba(0,0,0,0.1);}
      input { width:100%; padding:10px; margin-bottom:10px; }
      button { width:100%; padding:10px; background:#2563eb; color:white; border:none; }
      a { display:block; margin-top:10px; text-align:center; }
    </style>

    <div class="box">
      <h2>Login</h2>
      <form method="POST" action="/login">
        <input name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Senha" required />
        <button>Entrar</button>
      </form>
      <a href="/register">Criar conta</a>
    </div>
  `);
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);

  if (result.rows.length === 0) {
    return res.send("Usuário não encontrado");
  }

  const user = result.rows[0];

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.send("Senha incorreta");
  }

  req.session.userId = user.id;

  res.redirect("/");
});

// ===== REGISTER =====
app.get("/register", (req, res) => {
  res.send(`
    <style>
      body { font-family: Arial; background:#f5f7fb; display:flex; justify-content:center; align-items:center; height:100vh; }
      .box { background:white; padding:30px; border-radius:10px; width:300px; box-shadow:0 5px 20px rgba(0,0,0,0.1);}
      input { width:100%; padding:10px; margin-bottom:10px; }
      button { width:100%; padding:10px; background:#16a34a; color:white; border:none; }
    </style>

    <div class="box">
      <h2>Criar conta</h2>
      <form method="POST" action="/register">
        <input name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Senha" required />
        <button>Cadastrar</button>
      </form>
    </div>
  `);
});

app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2)",
      [email, hash]
    );

    res.redirect("/login");
  } catch {
    res.send("Email já existe");
  }
});

// ===== LOGOUT =====
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// ===== MERCADO LIVRE =====
const CLIENT_ID = process.env.ML_CLIENT_ID;
const CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
const REDIRECT_URI = process.env.ML_REDIRECT_URI;

app.get("/auth/mercadolivre", auth, (req, res) => {
  const url = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
  res.redirect(url);
});

app.get("/auth/mercadolivre/callback", async (req, res) => {
  const { code } = req.query;

  const response = await axios.post("https://api.mercadolibre.com/oauth/token", {
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI,
  });

  const { access_token, refresh_token } = response.data;

  const me = await axios.get("https://api.mercadolibre.com/users/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const user_id = String(me.data.id);

  await pool.query(
    `
    INSERT INTO ml_accounts (user_id, access_token, refresh_token)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id)
    DO UPDATE SET
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token
    `,
    [user_id, access_token, refresh_token]
  );

  res.send("Conta Mercado Livre conectada");
});

app.listen(PORT, () => {
  console.log("Rodando na porta " + PORT);
});