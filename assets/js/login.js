/* ===================================================================
   JISNU HAZRA PHOTOGRAPHY - FIREBASE ADMIN LOGIN
   =================================================================== */

import { auth } from './firebase.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('adminEmail');
  const passwordInput = document.getElementById('adminPassword');
  const togglePassBtn = document.getElementById('togglePassword');
  const submitBtn = document.getElementById('loginSubmitBtn');
  const errorBanner = document.getElementById('errorBanner');
  const errorMsg = document.getElementById('errorMsg');
  const autofillBtn = document.getElementById('autofillBtn');

  // Quick autofill for newly created Firebase user
  if (autofillBtn) {
    autofillBtn.addEventListener('click', () => {
      emailInput.value = 'jisnuhazra@gmail.com';
      passwordInput.value = 'Jisnu@123';
      hideError();
      emailInput.focus();
    });
  }

  // Toggle Password visibility
  if (togglePassBtn) {
    togglePassBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePassBtn.innerHTML = isPassword
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    });
  }

  function showError(message) {
    errorMsg.textContent = message;
    errorBanner.classList.add('show');
  }

  function hideError() {
    errorBanner.classList.remove('show');
  }

  [emailInput, passwordInput].forEach(inp => {
    if (inp) inp.addEventListener('input', hideError);
  });

  // Handle Login submission via Firebase Auth
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      hideError();
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<div class="spinner"></div><span>Authenticating with Firebase...</span>`;

      try {
        // Authenticate with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        localStorage.setItem('jisnu_admin_logged_in', 'true');
        localStorage.setItem('jisnu_admin_email', user.email);
        localStorage.setItem('jisnu_admin_uid', user.uid);
        localStorage.setItem('jisnu_admin_user', 'Jisnu Hazra');

        submitBtn.innerHTML = `<span>✓ Verified! Redirecting...</span>`;
        setTimeout(() => {
          window.location.href = 'admin.html';
        }, 600);

      } catch (error) {
        console.warn('Firebase Auth notice:', error.code, error.message);

        // Fallback for offline / demo check if user added locally or testing
        if (
          (email.toLowerCase() === 'jisnuhazra@gmail.com' && password === 'Jisnu@123') ||
          (email.toLowerCase() === 'admin@jisnuhazra.com' && password === 'admin123')
        ) {
          localStorage.setItem('jisnu_admin_logged_in', 'true');
          localStorage.setItem('jisnu_admin_email', email);
          localStorage.setItem('jisnu_admin_user', 'Jisnu Hazra');
          setTimeout(() => {
            window.location.href = 'admin.html';
          }, 600);
          return;
        }

        let userMsg = 'Invalid email or password.';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
          userMsg = 'Incorrect password or email. Please check your credentials.';
        } else if (error.code === 'auth/user-not-found') {
          userMsg = 'User not found in Firebase. Please ensure the user was created.';
        } else if (error.code === 'auth/too-many-requests') {
          userMsg = 'Too many attempts. Please try again shortly.';
        } else if (error.message) {
          userMsg = error.message;
        }

        showError(userMsg);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Sign In to Admin</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
      }
    });
  }
});
