import { Router } from "express";
import {
  showDashboard,
  showLoginPage,
  showRegisterPage,
} from "../controllers/pageController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", authMiddleware, showDashboard);
router.get("/login", showLoginPage);
router.get("/register", showRegisterPage);

export default router;