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
  'auth/too-many-requests':   'auth_err_too_many',
};

function authErrorMessage(code) {
  const key = AUTH_ERRORS[code];
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

function updateAuthUI(user) {
  currentUser = user;
  const signInBtn  = document.getElementById('navSignIn');
  const userInfo   = document.getElementById('navUserInfo');
  const authGate   = document.getElementById('authGate');
  const donorForm  = document.getElementById('donorFormCard');

  if (user) {
    if (signInBtn) signInBtn.style.display = 'none';
    if (userInfo) {
      userInfo.style.display = 'flex';
      const name = user.displayName || user.email.split('@')[0];
      document.getElementById('navUserName').textContent = name;
      if (user.photoURL) {
        document.getElementById('navUserAvatar').src = user.photoURL;
        document.getElementById('navUserAvatar').style.display = 'block';
      } else {
        document.getElementById('navUserAvatar').style.display = 'none';
      }
    }
    if (authGate) authGate.style.display = 'none';
    if (donorForm) donorForm.style.display = 'block';
    prefillDonorForm(user);
  } else {
    if (signInBtn) signInBtn.style.display = 'inline-flex';
    if (userInfo) userInfo.style.display = 'none';
    if (authGate) authGate.style.display = 'flex';
    if (donorForm) donorForm.style.display = 'none';
  }
}

function prefillDonorForm(user) {
  const nameEl  = document.getElementById('dName');
  const emailEl = document.getElementById('dEmail');
  const existing = loadData(DONORS_KEY).find(d => d.uid === user.uid);

  if (emailEl && user.email) {
    emailEl.value = user.email;
    emailEl.readOnly = true;
  }

  if (existing) {
    if (nameEl) nameEl.value = existing.name || user.displayName || '';
    const ageEl = document.getElementById('dAge');
    const bloodEl = document.getElementById('dBlood');
    const phoneEl = document.getElementById('dPhone');
    const locEl = document.getElementById('dLocation');
    if (ageEl && existing.age) ageEl.value = existing.age;
    if (bloodEl && existing.blood) bloodEl.value = existing.blood;
    if (phoneEl && existing.phone) phoneEl.value = existing.phone;
    if (locEl && existing.location) locEl.value = existing.location;
  } else if (nameEl && user.displayName && !nameEl.value) {
    nameEl.value = user.displayName;
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
    document.getElementById('register').scrollIntoView({ behavior: 'smooth' });
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
    document.getElementById('register').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showAuthError(authErrorMessage(err.code));
  } finally {
    btn.disabled = false;
    btn.textContent = t('auth_signin_btn');
  }
}

async function signInWithGoogle() {
  clearAuthErrors();
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    closeAuthModal();
    showToast(t('auth_toast_google'), 'success');
    document.getElementById('register').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      showAuthError(authErrorMessage(err.code));
    }
  }
}

async function signOut() {
  try {
    await auth.signOut();
    showToast(t('auth_toast_signout'), 'info');
    const emailEl = document.getElementById('dEmail');
    if (emailEl) emailEl.readOnly = false;
  } catch (err) {
    showToast(authErrorMessage(err.code), 'error');
  }
}

auth.onAuthStateChanged(user => {
  updateAuthUI(user);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAuthModal();
});
