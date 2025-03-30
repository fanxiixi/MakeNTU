document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  try {
    const response = await fetch("/profile", {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + token
      }
    });
    const data = await response.json();
    if (response.ok) {
      document.getElementById("username").textContent = data.username;
      document.getElementById("balance").textContent = data.balance;
      document.getElementById("createdAt").textContent =
        new Date(data.created_at).toLocaleString();
    } else {
      alert(data.message || "取得會員資料失敗");
      window.location.href = "index.html";
    }
  } catch (error) {
    console.error("取得會員資料時發生錯誤:", error);
    alert("伺服器錯誤，請稍後再試");
    window.location.href = "index.html";
  }

  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "index.html";
  });
});