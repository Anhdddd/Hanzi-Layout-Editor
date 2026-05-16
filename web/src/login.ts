/**
 * Login page logic
 */
import { login, isAuthenticated } from './auth/auth.ts';

// If already authenticated, redirect to dashboard
if (isAuthenticated()) {
  window.location.href = '/dashboard.html';
}

const form = document.getElementById('login-form') as HTMLFormElement;
const emailInput = document.getElementById('login-email') as HTMLInputElement;
const passwordInput = document.getElementById('login-password') as HTMLInputElement;
const submitBtn = document.getElementById('login-submit') as HTMLButtonElement;
const errorDiv = document.getElementById('login-error') as HTMLDivElement;

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Vui lòng nhập email và mật khẩu');
    return;
  }

  // Show loading
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="btn-loading"></span>Đang đăng nhập...';
  hideError();

  const result = await login(email, password);

  if (result.success) {
    window.location.href = '/dashboard.html';
  } else {
    showError(result.error || 'Đăng nhập thất bại');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Đăng nhập';
  }
});

function showError(msg: string): void {
  errorDiv.textContent = msg;
  errorDiv.classList.add('visible');
}

function hideError(): void {
  errorDiv.classList.remove('visible');
}

// Auto-focus email input
emailInput.focus();
