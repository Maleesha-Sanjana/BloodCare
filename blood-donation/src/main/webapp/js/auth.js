// ===== FIREBASE AUTH =====
const auth = window.auth;
let currentUser = null;
let authIntent = 'donor';
let pendingPostAfterAuth = false;
let userRole = 'donor';

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

function updateAuthModalCopy(intent) {
  const titleEl = document.getElementById('authModalTitle');
  const subEl = document.getElementById('authModalSub');
  if (!titleEl || !subEl) return;

  const copy = {
    donor: ['auth_modal_title', 'auth_modal_sub'],
    recipient: ['auth_modal_recipient_title', 'auth_modal_recipient_sub'],
    postRequest: ['auth_modal_request_title', 'auth_modal_request_sub'],
  };
  const keys = copy[intent] || copy.donor;
  titleEl.textContent = t(keys[0]);
  subEl.textContent = t(keys[1]);
}

function openAuthModal(mode = 'signup', intent = 'donor') {
  authIntent = intent;
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.classList.add('open');
  switchAuthTab(mode);
  updateAuthModalCopy(intent);
  clearAuthErrors();
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('open');
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

function scrollToRequests() {
  const section = document.getElementById('requests');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => document.getElementById('rHospital')?.focus(), 500);
  }
}

function scrollToDonorWelcome() {
  const section = document.getElementById('donorWelcome');
  if (section) section.scrollIntoView({ behavior: 'smooth' });
}

function isRecipientIntent() {
  return authIntent === 'recipient' || authIntent === 'postRequest';
}

function handleAuthSuccessRedirect() {
  if (isRecipientIntent()) {
    scrollToRequests();
    if (pendingPostAfterAuth) {
      pendingPostAfterAuth = false;
      setTimeout(() => {
        if (typeof window.postRequest === 'function') window.postRequest();
      }, 500);
    }
    return;
  }
  scrollToDonorWelcome();
}

function requireAuthForAction(intent) {
  if (currentUser) return true;
  authIntent = intent;
  pendingPostAfterAuth = intent === 'postRequest';
  openAuthModal('signup', intent);
  showToast(t(intent === 'postRequest' ? 'req_auth_required' : 'auth_signin_required'), 'info');
  return false;
}

function handleRegisterRecipientClick(e) {
  if (e) e.preventDefault();
  document.querySelector('.nav-links')?.classList.remove('open');

  const onHome = location.pathname.endsWith('index.html')
    || location.pathname === '/'
    || location.pathname.endsWith('/');

  if (!onHome) {
    sessionStorage.setItem('bloodcare_auth_intent', 'recipient');
    location.href = 'index.html#requests';
    return;
  }

  if (!currentUser) {
    openAuthModal('signup', 'recipient');
    return;
  }

  scrollToRequests();
}

function handleRegisterClick(e) {
  if (!currentUser) {
    e.preventDefault();
    openAuthModal('signup', 'donor');
  }
}

function toggleMenu() {
  const links = document.querySelector('.nav-links');
  if (links) links.classList.toggle('open');
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
  const userInfo              = document.getElementById('navUserInfo');
  const welcomeSection        = document.getElementById('donorWelcome');
  const heroRegister          = document.getElementById('heroRegisterBtn');
  const heroRegisterRecipient = document.getElementById('heroRegisterRecipientBtn');
  const isProfilePage         = location.pathname.endsWith('profile.html');

  if (user) {
    if (userInfo) {
      userInfo.style.display = 'flex';
      const name = user.displayName || user.email.split('@')[0];
      const navName = document.getElementById('navUserName');
      if (navName) navName.textContent = name.split(' ')[0];
      if (user.photoURL) {
        document.getElementById('navUserAvatar').src = user.photoURL;
        document.getElementById('navUserAvatar').style.display = 'block';
      } else {
        document.getElementById('navUserAvatar').style.display = 'none';
      }
    }
    if (!isProfilePage) {
      if (heroRegister) heroRegister.style.display = 'none';
      if (heroRegisterRecipient) heroRegisterRecipient.style.display = 'none';
      if (userRole === 'recipient') {
        if (welcomeSection) welcomeSection.style.display = 'none';
      } else {
        if (welcomeSection) welcomeSection.style.display = '';
        renderDonorWelcome(user);
      }
    }
  } else {
    if (userInfo) userInfo.style.display = 'none';
    if (welcomeSection) welcomeSection.style.display = 'none';
    if (heroRegister) heroRegister.style.display = '';
    if (heroRegisterRecipient) heroRegisterRecipient.style.display = '';
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
    if (isRecipientIntent()) {
      showToast(t('auth_toast_recipient_verify'), 'info');
      scrollToRequests();
    } else {
      showToast(t('auth_toast_verify'), 'info');
      scrollToDonorWelcome();
    }
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
    showToast(isRecipientIntent() ? t('auth_toast_recipient') : t('auth_toast_signin'), 'success');
    handleAuthSuccessRedirect();
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
  handleAuthSuccessRedirect();
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

    if (['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(err.code)) {
      try {
        await auth.signInWithRedirect(provider);
        return;
      } catch (redirectErr) {
        showAuthError(authErrorMessage(redirectErr.code) || redirectErr.message);
        openAuthModal('signin', authIntent);
      }
    } else {
      showAuthError(authErrorMessage(err.code) || err.message);
      openAuthModal('signin', authIntent);
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
        openAuthModal('signin', authIntent);
      }
    });
}

function showToast(msg, type = 'success') {
  if (typeof window.showToast === 'function') {
    window.showToast(msg, type);
    return;
  }
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
}

async function signOut() {
  try {
    await auth.signOut();
    userRole = 'donor';
    showToast(t('auth_toast_signout'), 'info');
    if (location.pathname.endsWith('profile.html')) {
      setTimeout(() => { location.href = 'index.html'; }, 600);
    }
  } catch (err) {
    showToast(authErrorMessage(err.code), 'error');
  }
}

function initAuthFromSession() {
  const stored = sessionStorage.getItem('bloodcare_auth_intent');
  if (stored === 'recipient') {
    sessionStorage.removeItem('bloodcare_auth_intent');
    authIntent = 'recipient';
    if (!currentUser) {
      setTimeout(() => openAuthModal('signup', 'recipient'), 400);
    } else {
      scrollToRequests();
    }
  }
}

auth.onAuthStateChanged(user => {
  updateAuthUI(user);
  if (user && typeof window.upsertUserProfile === 'function') {
    const role = isRecipientIntent() ? 'recipient' : 'donor';
    window.upsertUserProfile(user, role)
      .then(role => { userRole = role || 'donor'; updateAuthUI(user); })
      .catch(err => console.error('User profile:', err));
  }
  if (typeof window.reloadNotifications === 'function') {
    window.reloadNotifications()
      .then(() => {
        if (typeof window.renderNotifications === 'function') window.renderNotifications();
        if (typeof window.updateNotifBadge === 'function') window.updateNotifBadge();
      })
      .catch(err => console.error('Notifications refresh:', err));
  }
});

handleGoogleRedirectResult();

document.addEventListener('DOMContentLoaded', initAuthFromSession);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAuthModal();
});

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.signUpWithEmail = signUpWithEmail;
window.signInWithEmail = signInWithEmail;
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.handleRegisterClick = handleRegisterClick;
window.handleRegisterRecipientClick = handleRegisterRecipientClick;
window.requireAuthForAction = requireAuthForAction;
window.getCurrentUser = () => currentUser;
window.getUserRole = () => userRole;
window.toggleMenu = toggleMenu;
