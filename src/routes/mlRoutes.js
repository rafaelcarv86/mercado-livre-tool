import { Router } from "express";

import {
  mercadoLivreCallback,
  redirectToMercadoLivre,
  getMLAccounts,
  updateAccountName // 👈 NOVO
} from "../controllers/mlController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { deleteAccount } from "../controllers/mlController.js";

const router = Router();

router.get("/auth/mercadolivre", authMiddleware, redirectToMercadoLivre);
router.get("/auth/mercadolivre/callback", mercadoLivreCallback);
router.get("/api/ml-accounts", authMiddleware, getMLAccounts);
router.post("/api/delete-account", authMiddleware, deleteAccount);

// 👇 NOVA ROTA
router.post("/api/update-account-name", authMiddleware, updateAccountName);

export default router;