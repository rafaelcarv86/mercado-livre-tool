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
    res.send(
      `<h2>Erro ML</h2><pre>${JSON.stringify(
        error.response?.data || error.message,
        null,
        2
      )}</pre>`
    );
  }
}

export async function getMLAccounts(req, res) {
  try {
    const result = await pool.query(
      "SELECT * FROM ml_accounts WHERE app_user_id = $1",
      [req.session.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("ERRO AO BUSCAR CONTAS:", error);
    res.status(500).send("Erro ao buscar contas");
  }
}

export async function updateAccountName(req, res) {
  try {
    const { id, name, zipcode, tax } = req.body;

    if (!id) {
      return res.status(400).json({ error: "ID obrigatório" });
    }

  await pool.query(`
  UPDATE ml_accounts
  SET
    name = COALESCE($1, ml_accounts.name),
    company_zipcode = COALESCE($2, ml_accounts.company_zipcode),
    tax_rate = COALESCE($3, ml_accounts.tax_rate)
  WHERE id = $4
`, [name, zipcode, tax, id]);

    res.json({ success: true });

  } catch (error) {
    console.error("ERRO AO ATUALIZAR:", error);
    res.status(500).json({ error: "Erro ao atualizar dados" });
  }
}

export async function deleteAccount(req, res) {
  try {
    const { id } = req.body;

    await pool.query(
      "DELETE FROM ml_accounts WHERE id = $1 AND app_user_id = $2",
      [id, req.session.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("ERRO AO DELETAR:", error);
    res.status(500).json({ error: "Erro ao deletar" });
  }
}

export async function syncProducts(req, res) {
  try {
    const { accountId } = req.body;

    const result = await pool.query(
      "SELECT * FROM ml_accounts WHERE id = $1 AND app_user_id = $2",
      [accountId, req.session.userId]
    );

    const account = result.rows[0];

    if (!account) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }

    const accessToken = account.access_token;
    const userId = account.ml_user_id;

    let allItems = [];
    let offset = 0;
    const limit = 50;

    while (true) {
      const response = await axios.get(
        `https://api.mercadolibre.com/users/${userId}/items/search?status=active&limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const ids = response.data.results;

      if (ids.length === 0) break;

      for (let i = 0; i < ids.length; i += 20) {
        const chunk = ids.slice(i, i + 20);

        const itemsResponseFull = await axios.get(
          `https://api.mercadolibre.com/items?ids=${chunk.join(",")}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        allItems = allItems.concat(itemsResponseFull.data);
      }

      offset += limit;
    }

    for (const itemWrapper of allItems) {
      const item = itemWrapper.body;

      if (!item) continue;

      const feeResponse = await axios.get(
        `https://api.mercadolibre.com/sites/MLB/listing_prices?price=${item.price}&listing_type_id=gold_special`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const fee = feeResponse.data[0]?.sale_fee_amount || 0;


      await pool.query(
        `
        INSERT INTO products (
          id,
          title,
          price,
          original_price,
          available_quantity,
          status,
          thumbnail,
          permalink,
          account_id,
          commission_fee
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (id)
        DO UPDATE SET
          title = EXCLUDED.title,
          price = EXCLUDED.price,
          original_price = EXCLUDED.original_price,
          available_quantity = EXCLUDED.available_quantity,
          status = EXCLUDED.status,
          thumbnail = EXCLUDED.thumbnail,
          permalink = EXCLUDED.permalink,
          account_id = EXCLUDED.account_id,
          commission_fee = EXCLUDED.commission_fee
        `,
        [
          item.id,
          item.title,
          item.price,
          item.original_price,
          item.available_quantity,
          item.status,
          item.thumbnail,
          item.permalink,
          accountId,
          fee,
        ]
      );
    }

    res.json({ success: true, total: allItems.length });

  } catch (error) {
    console.error("ERRO SYNC:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro ao sincronizar" });
  }
}


  export async function getProducts(req, res) {
  try {
    const result = await pool.query(`
      SELECT *
      FROM products
      WHERE account_id IN (
        SELECT id FROM ml_accounts WHERE app_user_id = $1
      )
      ORDER BY created_at DESC
    `, [req.session.userId]);

    res.json(result.rows);

  } catch (error) {
    console.error("ERRO AO BUSCAR PRODUTOS:", error);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
}

export async function getSellerInfo(req, res) {
  try {
    const result = await pool.query(
      "SELECT * FROM ml_accounts WHERE app_user_id = $1 LIMIT 1",
      [req.session.userId]
    );

    const account = result.rows[0];

    if (!account) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }

    const response = await axios.get(
      "https://api.mercadolibre.com/users/me",
      {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
        },
      }
    );

    const user = response.data;

    res.json({
      nickname: user.nickname,
      level: user.seller_reputation?.level_id,
      transactions: user.seller_reputation?.transactions,
    });

  } catch (error) {
    console.error("ERRO SELLER INFO:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro ao buscar dados do vendedor" });
  }
}