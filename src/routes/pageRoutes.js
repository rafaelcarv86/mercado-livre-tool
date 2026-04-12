import express from "express";
import {
  showDashboard,
  showLoginPage,
  showRegisterPage,
  updateAccountName,
  showAuthPage,
  showSalesPage
} from "../controllers/pageController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, (req, res) => {
  res.redirect("/dashboard");
});

router.get("/anuncios", (req, res) => {
  res.sendFile("anuncios.html", { root: "./src/views" });
});

router.get("/dashboard", authMiddleware, showDashboard);
router.get("/login", showLoginPage);
router.get("/register", showRegisterPage);
router.get("/autenticacoes", authMiddleware, showAuthPage);
router.get("/vendas", authMiddleware, showSalesPage);
router.get("/empresa", (req, res) => {
  res.sendFile("empresa.html", { root: "./src/views" });
});

export default router;