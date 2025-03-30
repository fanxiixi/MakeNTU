// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// 啟用 CORS、JSON 與 URL-encoded 解析
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 根路由：回傳 index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 專門的路由：回傳 profile.html
app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

// 建立 MySQL 連線池（使用 .env 設定）
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: 10,
});

// 註冊 API
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "缺少必要欄位" });
    }
    // 檢查是否已存在
    const [existing] = await pool.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "使用者或電子郵件已存在" });
    }
    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, email, password, balance) VALUES (?, ?, ?, 0)",
      [username, email, hashedPassword]
    );
    res.status(200).json({ message: "註冊成功" });
  } catch (error) {
    console.error("Register API Error:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 登入 API
app.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: "缺少必要欄位" });
    }
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [identifier, identifier]
    );
    if (rows.length === 0) {
      return res.status(400).json({ message: "使用者不存在" });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: "密碼錯誤" });
    }
    // 生成 JWT，有效期 1 小時
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: "登入成功", token });
  } catch (error) {
    console.error("Login API Error:", error);
    res.status(500).json({ message: "伺服器錯誤" });
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

// 會員資料 API：返回 JSON 格式的會員資訊 (username、balance、created_at)
app.get('/profile', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT username, balance, created_at FROM users WHERE id = ?",
      [req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "使用者不存在" });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Profile API Error:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`伺服器運行中，Port：${PORT}`);
});