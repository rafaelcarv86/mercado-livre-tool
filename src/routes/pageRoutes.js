import express from "express";
import {
  showDashboard,
  showLoginPage,
  showRegisterPage,
  updateAccountName,
  showAuthPage
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

export default router;