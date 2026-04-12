import { Router } from "express";

import {
  mercadoLivreCallback,
  redirectToMercadoLivre,
  getMLAccounts,
  updateAccountName,
  deleteAccount,
  syncProducts,
  syncOrders // 👈 NOVO
} from "../controllers/mlController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { getProducts } from "../controllers/mlController.js";
import { getSellerInfo } from "../controllers/mlController.js";
import { getOrders } from "../controllers/mlController.js";
import { getCompany, saveCompany } from "../controllers/companyController.js";

const router = Router();

router.get("/auth/mercadolivre", authMiddleware, redirectToMercadoLivre);
router.get("/auth/mercadolivre/callback", mercadoLivreCallback);
router.get("/api/ml-accounts", authMiddleware, getMLAccounts);
router.post("/api/update-account-name", authMiddleware, updateAccountName);
router.post("/api/delete-account", authMiddleware, deleteAccount);
router.post("/api/sync-products", authMiddleware, syncProducts);
router.post("/api/sync-orders", authMiddleware, syncOrders); // 👈 NOVO
router.get("/api/products", authMiddleware, getProducts);
router.get("/api/seller-info", authMiddleware, getSellerInfo);
router.get("/api/orders", authMiddleware, getOrders);
router.get("/api/company", authMiddleware, getCompany);
router.post("/api/company", authMiddleware, saveCompany);

router.get("/reputacao", (req, res) => {
  res.sendFile("reputacao.html", { root: "./src/views" });
});

export default router;