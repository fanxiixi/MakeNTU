document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    // 沒有 token，則轉到登入頁
    window.location.href = "index.html";
    return;
  }

  try {
    const response = await fetch("http://localhost:3001/profile", {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + token
      }
    });
    const data = await response.json();
    if (response.ok) {
      document.getElementById("username").textContent = data.username;
      document.getElementById("balance").textContent = data.balance;
      // 使用 toLocaleString() 來格式化日期
      document.getElementById("createdAt").textContent = new Date(data.created_at).toLocaleString();
    } else {
      alert(data.message || "取得會員資料失敗");
      window.location.href = "index.html";
    }
  } catch (error) {
    console.error("取得會員資料時發生錯誤:", error);
    alert("伺服器錯誤，請稍後再試");
    window.location.href = "index.html";
  }

  // 設定登出按鈕監聽事件
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "index.html";
  });
});