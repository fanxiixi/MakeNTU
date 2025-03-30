// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mysql = require('mysql2/promise'); // 使用 mysql2/promise 模組連線 MySQL
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// 啟用 CORS、JSON 與 URL-encoded 處理
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 根路由：回傳首頁 index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 新增路由：當請求 /index.html 時回傳 index.html（避免404）
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 專用路由：回傳 profile.html
app.get('/profile.html', (req, res) => {
  console.log('GET /profile.html 路由觸發');
  res.sendFile(path.join(__dirname, 'profile.html'));
});

// 若有使用 profile.js 但不在同一資料夾可加入此路由 (選用)
// app.get('/profile.js', (req, res) => {
//   res.sendFile(path.join(__dirname, 'profile.js'));
// });

// 建立 MySQL 連線池
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
      return res.status(400).json({ message: "請填寫所有必要欄位" });
    }
    // 檢查是否已有相同使用者或電子郵件
    const [existing] = await pool.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "使用者或電子郵件已存在" });
    }
    // 加密密碼並新增使用者，balance 預設為 0
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
    const { identifier, password } = req.body; // identifier 可為 username 或 email
    if (!identifier || !password) {
      return res.status(400).json({ message: "請填寫所有必要欄位" });
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
    // 生成 JWT，效期 1 小時（JWT_SECRET 請在 .env 中正確設定）
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: "登入成功", token });
  } catch (error) {
    console.error("Login API Error:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// JWT 驗證中介
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "請提供授權資訊" });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: "請提供 Token" });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Token 無效或已過期" });
    req.userId = decoded.id;
    next();
  });
};

// 會員資料 API：返回會員 username、balance 與 created_at
app.get('/profile', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT username, balance, created_at FROM users WHERE id = ?",
      [req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "找不到使用者" });
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