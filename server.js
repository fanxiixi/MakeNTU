// 載入環境變數和必需的模組
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs'); // 使用 bcryptjs 來避免跨平台編譯問題
const jwt = require('jsonwebtoken');

const app = express();

// 中介軟體設定：CORS 與 JSON 解析
app.use(cors());
app.use(express.json());

// 靜態檔案設定：若你有放前端資源在 public 資料夾，可啟用下面這行
// app.use(express.static(path.join(__dirname, 'public')));

// 預設首頁路由，當使用者存取 "/" 時，回傳 index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 建立 MySQL 連線池
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 註冊 API
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "缺少必要欄位" });
    }
    // 檢查是否已有相同使用者或電子郵件
    const [existing] = await pool.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "使用者或電子郵件已存在" });
    }

    // 加密密碼，並寫入資料庫（balance 預設為 0，created_at 使用資料庫預設 CURRENT_TIMESTAMP）
    const hashedPassword = await bcrypt.hash(password, 10);
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

// 登入 API
app.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier 可為 username 或 email
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
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ message: "密碼錯誤" });
    }
    // 生成 JWT，設定有效期限 1 小時
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.status(200).json({ message: "登入成功", token });
  } catch (error) {
    console.error("Login API Error:", error);
    return res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 驗證中介軟體：檢查使用者提供的 JWT 是否有效
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

// 會員資料 API：僅允許已登入使用者存取
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

// 啟動伺服器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`伺服器運行中，Port：${PORT}`);
});