document.addEventListener('DOMContentLoaded', () => {
  const signUpButton = document.getElementById('signUp');
  const signInButton = document.getElementById('signIn');
  const container = document.getElementById('container');
  const notification = document.getElementById('notification');

  // 顯示通知訊息的函數
  function showNotification(msg, type = 'success') {
    notification.textContent = msg;
    if (type === 'success') {
      notification.style.backgroundColor = '#4caf50'; // 綠色
    } else if (type === 'error') {
      notification.style.backgroundColor = '#f44336'; // 紅色
    } else {
      notification.style.backgroundColor = '#2196F3'; // 藍色（資訊）
    }
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000); // 3秒後隱藏
  }

  // 切換註冊與登入面板
  signUpButton.addEventListener('click', () => {
    container.classList.add("right-panel-active");
  });
  signInButton.addEventListener('click', () => {
    container.classList.remove("right-panel-active");
  });

  // 註冊表單
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = registerForm.querySelector('input[name="username"]').value;
      const email = registerForm.querySelector('input[name="email"]').value;
      const password = registerForm.querySelector('input[name="password"]').value;
      try {
        const response = await fetch('http://localhost:3001/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (response.ok) {
          showNotification(data.message || '註冊成功！', 'success');
          // 註冊成功後自動切換到登入面板
          setTimeout(() => {
            container.classList.remove("right-panel-active");
          }, 1500);
        } else {
          showNotification(data.message || '註冊失敗！', 'error');
        }
      } catch (error) {
        console.error('註冊時發生錯誤:', error);
        showNotification('註冊時發生錯誤！', 'error');
      }
    });
  }

  // 登入表單
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const identifier = loginForm.querySelector('input[name="identifier"]').value;
      const password = loginForm.querySelector('input[name="password"]').value;
      try {
        const response = await fetch('http://localhost:3001/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });
        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('token', data.token);
          showNotification('登入成功！', 'success');
          // 登入成功後自動跳轉到會員資料頁面
          setTimeout(() => {
            window.location.href = "profile.html";
          }, 1500);
        } else {
          showNotification(data.message || '登入失敗！', 'error');
        }
      } catch (error) {
        console.error('登入時發生錯誤:', error);
        showNotification('登入時發生錯誤！', 'error');
      }
    });
  }
});