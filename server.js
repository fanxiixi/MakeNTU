// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const MYSQL_HOST = process.env.MYSQL_HOST;
const MYSQL_USER = process.env.MYSQL_USER;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;
const MYSQL_DATABASE = process.env.MYSQL_DATABASE;
const JWT_SECRET = process.env.JWT_SECRET;

// 建立 MySQL 連線池
const pool = mysql.createPool({
  host: MYSQL_HOST,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 註冊 API (POST /register)
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "缺少必要欄位" });
    }

    // 檢查是否已存在該使用者或電子郵件
    const [existing] = await pool.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "使用者或電子郵件已存在" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 假設 users 表已包含 balance 欄位，並且 created_at 欄位預設使用 CURRENT_TIMESTAMP
    await pool.query(
      "INSERT INTO users (username, email, password, balance) VALUES (?, ?, ?, 0)",
      [username, email, hashedPassword]
    );

    return res.status(200).json({ message: "註冊成功" });
  } catch (error) {
    console.error("Register API Error:", error);
    return res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 登入 API (POST /login)
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

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    return res.status(200).json({ message: "登入成功", token });
  } catch (error) {
    console.error("Login API Error:", error);
    return res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 驗證中介軟體，保護 API
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "缺少授權資訊" });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Token 未提供" });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Token 無效或已過期" });
    req.userId = decoded.id;
    next();
  });
};

// 會員資料 API (GET /profile)
app.get('/profile', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT username, balance, created_at FROM users WHERE id = ?",
      [req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "使用者不存在" });
    }
    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Profile API Error:", error);
    return res.status(500).json({ message: "伺服器錯誤" });
  }
});

app.listen(PORT, () => {
  console.log(`伺服器運行中，Port：${PORT}`);
});