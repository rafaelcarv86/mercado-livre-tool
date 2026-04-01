import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import pageRoutes from "./routes/pageRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import mlRoutes from "./routes/mlRoutes.js";
import { createTables } from "./db/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static("src/views"));

app.use(
  session({
    secret: "segredo_super_secreto",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(pageRoutes);
app.use(authRoutes);
app.use(mlRoutes);

createTables().then(() => {
  app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
  });
});