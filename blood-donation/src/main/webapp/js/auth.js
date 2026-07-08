// ===== FIREBASE AUTH =====
let currentUser = null;

const AUTH_ERRORS = {
  'auth/email-already-in-use': 'auth_err_email_in_use',
  'auth/invalid-email':       'auth_err_invalid_email',
  'auth/weak-password':       'auth_err_weak_password',
  'auth/user-not-found':      'auth_err_user_not_found',
  'auth/wrong-password':      'auth_err_wrong_password',
  'auth/invalid-credential':  'auth_err_invalid_credential',
  'auth/popup-closed-by-user':'auth_err_popup_closed',
  'auth/popup-blocked':       'auth_err_popup_blocked',
  'auth/unauthorized-domain': 'auth_err_unauthorized_domain',
  'auth/cancelled-popup-request': 'auth_err_popup_closed',
  'auth/too-many-requests':   'auth_err_too_many',
};

function authErrorMessage(code) {
  const key = AUTH_ERRORS[code];
  if (key === 'auth_err_unauthorized_domain') {
    return t(key).replace('{domain}', location.hostname);
  }
  return key ? t(key) : t('auth_err_generic');
}

function openAuthModal(mode = 'signup') {
  document.getElementById('authModal').classList.add('open');
  switchAuthTab(mode);
  clearAuthErrors();
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('open');
  clearAuthErrors();
}

function clearAuthErrors() {
  const el = document.getElementById('authError');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function switchAuthTab(mode) {
  document.getElementById('authTabSignup').classList.toggle('active', mode === 'signup');
  document.getElementById('authTabSignin').classList.toggle('active', mode === 'signin');
  document.getElementById('authSignupForm').style.display = mode === 'signup' ? 'block' : 'none';
  document.getElementById('authSigninForm').style.display = mode === 'signin' ? 'block' : 'none';
  clearAuthErrors();
}

function handleRegisterClick(e) {
  if (!currentUser) {
    e.preventDefault();
    openAuthModal('signup');
  }
}

function renderDonorWelcome(user) {
  if (!user) return;
  const fullName = user.displayName || user.email.split('@')[0];
  const firstName = fullName.split(' ')[0];
  const nameEl = document.getElementById('welcomeName');
  const avatar = document.getElementById('welcomeAvatar');
  if (nameEl) nameEl.textContent = firstName;
  if (avatar && user.photoURL) {
    avatar.src = user.photoURL;
    avatar.style.display = 'block';
  } else if (avatar) {
    avatar.style.display = 'none';
  }
}

function updateAuthUI(user) {
  currentUser = user;
  const signInBtn       = document.getElementById('navSignIn');
  const userInfo        = document.getElementById('navUserInfo');
  const registerSection = document.getElementById('register');
  const welcomeSection  = document.getElementById('donorWelcome');
  const navRegister     = document.getElementById('navRegisterItem');
  const heroRegister    = document.getElementById('heroRegisterBtn');

  if (user) {
    if (signInBtn) signInBtn.style.display = 'none';
    if (userInfo) {
      userInfo.style.display = 'flex';
      const name = user.displayName || user.email.split('@')[0];
      document.getElementById('navUserName').textContent = name.split(' ')[0];
      if (user.photoURL) {
        document.getElementById('navUserAvatar').src = user.photoURL;
        document.getElementById('navUserAvatar').style.display = 'block';
      } else {
        document.getElementById('navUserAvatar').style.display = 'none';
      }
    }
    if (registerSection) registerSection.style.display = 'none';
    if (welcomeSection) welcomeSection.style.display = '';
    if (navRegister) navRegister.style.display = 'none';
    if (heroRegister) heroRegister.style.display = 'none';
    renderDonorWelcome(user);
  } else {
    if (signInBtn) signInBtn.style.display = 'inline-flex';
    if (userInfo) userInfo.style.display = 'none';
    if (registerSection) registerSection.style.display = '';
    if (welcomeSection) welcomeSection.style.display = 'none';
    if (navRegister) navRegister.style.display = '';
    if (heroRegister) heroRegister.style.display = '';
    const authGate = document.getElementById('authGate');
    if (authGate) authGate.style.display = 'flex';
  }
}

async function signUpWithEmail(e) {
  e.preventDefault();
  clearAuthErrors();
  const email    = document.getElementById('authSignupEmail').value.trim();
  const password = document.getElementById('authSignupPassword').value;
  const btn      = document.getElementById('authSignupBtn');
  btn.disabled = true;
  btn.textContent = t('auth_loading');

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.sendEmailVerification();
    closeAuthModal();
    showToast(t('auth_toast_verify'), 'info');
    document.getElementById('donorWelcome').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showAuthError(authErrorMessage(err.code));
  } finally {
    btn.disabled = false;
    btn.textContent = t('auth_signup_btn');
  }
}

async function signInWithEmail(e) {
  e.preventDefault();
  clearAuthErrors();
  const email    = document.getElementById('authSigninEmail').value.trim();
  const password = document.getElementById('authSigninPassword').value;
  const btn      = document.getElementById('authSigninBtn');
  btn.disabled = true;
  btn.textContent = t('auth_loading');

  try {
    await auth.signInWithEmailAndPassword(email, password);
    closeAuthModal();
    showToast(t('auth_toast_signin'), 'success');
    document.getElementById('donorWelcome').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showAuthError(authErrorMessage(err.code));
  } finally {
    btn.disabled = false;
    btn.textContent = t('auth_signin_btn');
  }
}

function setGoogleLoading(loading) {
  document.querySelectorAll('.btn-google').forEach(btn => {
    btn.disabled = loading;
    const label = btn.querySelector('span[data-i18n="auth_google"]') || btn.querySelector('span:last-child');
    if (label) {
      if (!btn.dataset.defaultLabel) btn.dataset.defaultLabel = label.textContent;
      label.textContent = loading ? t('auth_loading') : btn.dataset.defaultLabel;
    }
  });
}

function onGoogleSignInSuccess() {
  closeAuthModal();
  showToast(t('auth_toast_google'), 'success');
  document.getElementById('donorWelcome').scrollIntoView({ behavior: 'smooth' });
}

async function signInWithGoogle() {
  clearAuthErrors();
  setGoogleLoading(true);

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await auth.signInWithPopup(provider);
    if (result.user) onGoogleSignInSuccess();
  } catch (err) {
    console.error('Google sign-in:', err.code, err.message);

    // Fallback to full-page redirect if popup is blocked or closed
    if (['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(err.code)) {
      try {
        await auth.signInWithRedirect(provider);
        return;
      } catch (redirectErr) {
        showAuthError(authErrorMessage(redirectErr.code) || redirectErr.message);
        openAuthModal('signin');
      }
    } else {
      showAuthError(authErrorMessage(err.code) || err.message);
      openAuthModal('signin');
    }
  } finally {
    setGoogleLoading(false);
  }
}

function handleGoogleRedirectResult() {
  setGoogleLoading(false);
  auth.getRedirectResult()
    .then((result) => {
      if (result && result.user) onGoogleSignInSuccess();
    })
    .catch((err) => {
      if (err && err.code) {
        console.error('Google redirect:', err.code, err.message);
        showAuthError(authErrorMessage(err.code) || err.message);
        openAuthModal('signin');
      }
    });
}

async function signOut() {
  try {
    await auth.signOut();
    showToast(t('auth_toast_signout'), 'info');
  } catch (err) {
    showToast(authErrorMessage(err.code), 'error');
  }
}

auth.onAuthStateChanged(user => {
  updateAuthUI(user);
});

handleGoogleRedirectResult();

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAuthModal();
});
