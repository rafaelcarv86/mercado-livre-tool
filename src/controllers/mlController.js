import axios from "axios";
import { pool } from "../db/index.js";

const CLIENT_ID = process.env.ML_CLIENT_ID;
const CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
const REDIRECT_URI = process.env.ML_REDIRECT_URI;

export function redirectToMercadoLivre(req, res) {
  const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
  res.redirect(authUrl);
}

export async function mercadoLivreCallback(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send("Faltou o parâmetro code");
    }

    const tokenResponse = await axios.post(
      "https://api.mercadolibre.com/oauth/token",
      {
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    const meResponse = await axios.get("https://api.mercadolibre.com/users/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const mlUserId = String(meResponse.data.id);

    await pool.query(
      `
      INSERT INTO ml_accounts (ml_user_id, access_token, refresh_token, app_user_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (ml_user_id)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        app_user_id = EXCLUDED.app_user_id
      `,
      [mlUserId, access_token, refresh_token, req.session.userId]
    );

   res.redirect("/autenticacoes");
   
  } catch (error) {
  console.error("ERRO ML:", error.response?.data || error.message);

  res.send(`
    <h2>Erro ao conectar com Mercado Livre</h2>
    <pre>${JSON.stringify(error.response?.data || error.message, null, 2)}</pre>
  `);
}
}