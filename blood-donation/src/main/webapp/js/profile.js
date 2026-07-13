/**
 * BloodCare - Profile Settings Management
 * Firebase Auth updates, Firestore sync, and photo preview.
 */
(function () {
  'use strict';

  const DEFAULT_AVATAR = 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/component/icl_phone_status_anon.png';
  let activeUser = null;

  function msg(key, fallback) {
    return typeof window.t === 'function' ? window.t(key) : fallback;
  }

  function displayToastMessage(text, variant) {
    if (typeof window.showToast === 'function') {
      window.showToast(text, variant);
    } else {
      alert(text);
    }
  }

  function syncNavUser(user, name, photoURL) {
    const navName = document.getElementById('navUserName');
    const navAvatar = document.getElementById('navUserAvatar');
    const navInfo = document.getElementById('navUserInfo');
    if (navName) navName.textContent = (name || user.email || '').split(' ')[0];
    if (navInfo) navInfo.style.display = 'flex';
    if (navAvatar && photoURL && photoURL !== DEFAULT_AVATAR) {
      navAvatar.src = photoURL;
      navAvatar.style.display = 'block';
    } else if (navAvatar) {
      navAvatar.style.display = 'none';
    }
  }

  function adjustToggleUI(isActive) {
    const statusText = document.getElementById('statusText');
    if (!statusText) return;
    if (isActive) {
      statusText.textContent = msg('profile_status_active', 'Active');
      statusText.className = 'status-text active';
    } else {
      statusText.textContent = msg('profile_status_inactive', 'Inactive');
      statusText.className = 'status-text inactive';
    }
  }

  function isGoogleAccount(user) {
    return user.providerData.some(p => p.providerId === 'google.com');
  }

  function initProfilePage() {
    const auth = window.auth;
    const db = window.db;
    if (!auth || !db) return;

    const settingsForm = document.getElementById('profileSettingsForm');
    const userNameInput = document.getElementById('userName');
    const userEmailInput = document.getElementById('userEmail');
    const profilePreview = document.getElementById('profilePreview');
    const photoInput = document.getElementById('photoInput');
    const removePhotoBtn = document.getElementById('removePhotoBtn');
    const statusToggle = document.getElementById('statusToggle');
    const passwordSection = document.getElementById('passwordSection');

    if (!settingsForm) return;

    auth.onAuthStateChanged(user => {
      if (!user) {
        window.location.href = 'index.html';
        return;
      }

      activeUser = user;
      userEmailInput.value = user.email || '';

      if (user.displayName) userNameInput.value = user.displayName;
      if (user.photoURL) profilePreview.src = user.photoURL;
      else profilePreview.src = DEFAULT_AVATAR;

      syncNavUser(user, user.displayName, user.photoURL);

      if (isGoogleAccount(user) && passwordSection) {
        passwordSection.style.display = 'none';
      }

      db.collection('donors').doc(user.uid).get()
        .then(doc => {
          if (!doc.exists) return;
          const data = doc.data();
          if (data.name) userNameInput.value = data.name;
          if (data.photoURL) {
            profilePreview.src = data.photoURL;
            syncNavUser(user, data.name, data.photoURL);
          }
          if (data.status === 'Inactive') {
            statusToggle.checked = false;
            adjustToggleUI(false);
          } else {
            statusToggle.checked = true;
            adjustToggleUI(true);
          }
        })
        .catch(err => console.error('Profile load:', err));
    });

    statusToggle.addEventListener('change', e => {
      adjustToggleUI(e.target.checked);
    });

    photoInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        displayToastMessage(msg('profile_photo_too_large', 'Image size exceeds 2MB limit.'), 'error');
        photoInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => { profilePreview.src = ev.target.result; };
      reader.readAsDataURL(file);
    });

    removePhotoBtn.addEventListener('click', () => {
      profilePreview.src = DEFAULT_AVATAR;
      photoInput.value = '';
    });

    settingsForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (!activeUser) return;

      const updatedName = userNameInput.value.trim();
      const curPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const cnfPassword = document.getElementById('confirmPassword').value;
      const finalStatus = statusToggle.checked ? 'Active' : 'Inactive';
      let photoURL = profilePreview.src;

      if (photoURL === DEFAULT_AVATAR) photoURL = '';

      if (!updatedName) {
        displayToastMessage(msg('profile_name_required', 'Full name cannot be blank.'), 'error');
        return;
      }

      const submitBtn = settingsForm.querySelector('.save-settings-btn');
      if (submitBtn) submitBtn.disabled = true;

      try {
        await activeUser.updateProfile({
          displayName: updatedName,
          photoURL: photoURL || null,
        });

        await db.collection('donors').doc(activeUser.uid).set({
          uid: activeUser.uid,
          name: updatedName,
          photoURL: photoURL || '',
          status: finalStatus,
          email: activeUser.email,
          lastProfileChange: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        if (newPassword && !isGoogleAccount(activeUser)) {
          if (newPassword.length < 6) {
            displayToastMessage(msg('auth_err_weak_password', 'Password must be at least 6 characters.'), 'error');
            return;
          }
          if (newPassword !== cnfPassword) {
            displayToastMessage(msg('profile_password_mismatch', 'New passwords do not match.'), 'error');
            return;
          }
          if (!curPassword) {
            displayToastMessage(msg('profile_current_required', 'Current password is required to change password.'), 'error');
            return;
          }

          const credential = firebase.auth.EmailAuthProvider.credential(activeUser.email, curPassword);
          await activeUser.reauthenticateWithCredential(credential);
          await activeUser.updatePassword(newPassword);

          document.getElementById('currentPassword').value = '';
          document.getElementById('newPassword').value = '';
          document.getElementById('confirmPassword').value = '';
        }

        syncNavUser(activeUser, updatedName, photoURL);
        displayToastMessage(msg('profile_saved', 'Profile saved successfully!'), 'success');
      } catch (err) {
        console.error('Profile save:', err);
        displayToastMessage(err.message || msg('profile_save_failed', 'Failed to save changes.'), 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.db && typeof window.initFirestore === 'function') {
      window.initFirestore(() => {
        if (typeof window.initNotificationUI === 'function') window.initNotificationUI();
        initProfilePage();
      });
    } else {
      initProfilePage();
    }
  });
})();
