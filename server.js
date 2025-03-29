// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');  // 避免跨平台原生模組編譯問題
const jwt = require('jsonwebtoken');

const app = express();

// 啟用中介軟體：CORS、JSON 與 URL-encoded 解析
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 根路由：回傳首頁 (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 建立 PostgreSQL 連線池（請確認環境變數已設定）
const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: process.env.PG_PORT || 5432
});

// 註冊 API
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "缺少必要欄位" });
    }

    // 檢查是否已有相同使用者或電子郵件
    const existing = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "使用者或電子郵件已存在" });
    }

    // 加密密碼並寫入資料庫（balance 預設為 0）
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, email, password, balance) VALUES ($1, $2, $3, 0)",
      [username, email, hashedPassword]
    );
    return res.status(200).json({ message: "註冊成功" });
  } catch (error) {
    console.error("Register API Error:", error);
    return res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 登入 API
app.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;  // identifier 為 username 或 email
    if (!identifier || !password) {
      return res.status(400).json({ message: "缺少必要欄位" });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR email = $2",
      [identifier, identifier]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "使用者不存在" });
    }
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ message: "密碼錯誤" });
    }

    // 生成 JWT，效期 1 小時
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.status(200).json({ message: "登入成功", token });
  } catch (error) {
    console.error("Login API Error:", error);
    return res.status(500).json({ message: "伺服器錯誤" });
  }
});

// JWT 驗證中介軟體
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "缺少授權資訊" });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Token 未提供" });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Token 無效或已過期" });
    req.userId = decoded.id;
    next();
  });
};

// 會員資料 API
app.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT username, balance, created_at FROM users WHERE id = $1",
      [req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "使用者不存在" });
    }
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Profile API Error:", error);
    return res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 啟動伺服器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`伺服器運行中，Port：${PORT}`);
});