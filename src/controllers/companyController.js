import { pool } from "../db/index.js";

// 🔍 BUSCAR EMPRESA
export async function getCompany(req, res) {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const result = await pool.query(
      "SELECT * FROM companies WHERE user_id = $1 LIMIT 1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Erro ao buscar empresa:", err);
    res.status(500).json({ error: "Erro ao buscar empresa" });
  }
}

// 💾 SALVAR EMPRESA
export async function saveCompany(req, res) {
  try {
    const userId = req.session.userId;

    console.log("USER ID:", userId); // 🔥 DEBUG

    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const {
      name,
      cnpj,
      zipcode,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      tax_rate,
      email,
      phone
    } = req.body;

    // verifica se já existe empresa
    const existing = await pool.query(
      "SELECT id FROM companies WHERE user_id = $1 LIMIT 1",
      [userId]
    );

    if (existing.rows.length > 0) {
      // UPDATE
      await pool.query(
        `UPDATE companies SET
          name = $1,
          cnpj = $2,
          zipcode = $3,
          street = $4,
          number = $5,
          complement = $6,
          neighborhood = $7,
          city = $8,
          state = $9,
          tax_rate = $10,
          email = $11,
          phone = $12
        WHERE user_id = $13`,
        [
          name,
          cnpj,
          zipcode,
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          tax_rate,
          email,
          phone,
          userId
        ]
      );

      console.log("UPDATE executado");

    } else {
      // INSERT
      await pool.query(
        `INSERT INTO companies (
          user_id,
          name,
          cnpj,
          zipcode,
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          tax_rate,
          email,
          phone
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
        )`,
        [
          userId,
          name,
          cnpj,
          zipcode,
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          tax_rate,
          email,
          phone
        ]
      );

      console.log("INSERT executado");
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Erro ao salvar empresa:", err);
    res.status(500).json({ error: "Erro ao salvar empresa" });
  }
}