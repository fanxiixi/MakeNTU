-- 建立資料庫（如果不存在的話）
CREATE DATABASE IF NOT EXISTS user_system;

-- 選擇該資料庫
USE user_system;

-- 建立 users 資料表，並同時定義 balance 欄位
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    balance DECIMAL(10,2) DEFAULT 0.00
);
INSERT INTO users (username, email, password, balance) VALUES (?, ?, ?, 0)