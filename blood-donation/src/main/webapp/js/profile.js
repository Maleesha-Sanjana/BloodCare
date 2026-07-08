const auth = window.auth;

function renderProfilePage(user) {
  const fullName = user.displayName || user.email.split('@')[0];
  const firstName = fullName.split(' ')[0];

  const avatar = document.getElementById('profileAvatar');
  const nameEl = document.getElementById('profileName');
  const emailEl = document.getElementById('profileEmail');
  const providerEl = document.getElementById('profileProvider');
  const verifiedEl = document.getElementById('profileVerified');
  const sinceEl = document.getElementById('profileSince');

  if (nameEl) nameEl.textContent = fullName;
  if (emailEl) emailEl.textContent = user.email || '—';

  if (avatar && user.photoURL) {
    avatar.src = user.photoURL;
    avatar.style.display = 'block';
  } else if (avatar) {
    avatar.style.display = 'none';
  }

  const provider = (user.providerData[0] && user.providerData[0].providerId) || 'password';
  const providerLabel = provider === 'google.com' ? 'Google' : 'Email';
  if (providerEl) providerEl.textContent = providerLabel;

  if (verifiedEl) {
    verifiedEl.textContent = user.emailVerified ? t('profile_yes') : t('profile_no');
    verifiedEl.className = 'profile-detail-value ' + (user.emailVerified ? 'verified-yes' : 'verified-no');
  }

  if (sinceEl && user.metadata && user.metadata.creationTime) {
    sinceEl.textContent = new Date(user.metadata.creationTime).toLocaleDateString('en-LK', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  const navName = document.getElementById('navUserName');
  if (navName) navName.textContent = firstName;
}

auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  renderProfilePage(user);
});
