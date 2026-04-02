import { Router } from "express";

import {
  mercadoLivreCallback,
  redirectToMercadoLivre,
  getMLAccounts
} from "../controllers/mlController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/auth/mercadolivre", authMiddleware, redirectToMercadoLivre);
router.get("/auth/mercadolivre/callback", mercadoLivreCallback);
router.get("/api/ml-accounts", authMiddleware, getMLAccounts);

export default router;