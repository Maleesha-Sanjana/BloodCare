/**
 * BloodCare - Profile Settings Management Engine
 * Integrates Firebase Auth updates, Firestore sync, and Base64 Photo Processing.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Check if Firebase is correctly loaded from window context
    const auth = window.auth;
    const db = window.db;

    if (!auth || !db) {
        console.error("Firebase instance variables missing from global window context.");
        return;
    }

    // DOM References
    const settingsForm = document.getElementById("profileSettingsForm");
    const userNameInput = document.getElementById("userName");
    const userEmailInput = document.getElementById("userEmail");
    const profilePreview = document.getElementById("profilePreview");
    const photoInput = document.getElementById("photoInput");
    const removePhotoBtn = document.getElementById("removePhotoBtn");
    const statusToggle = document.getElementById("statusToggle");
    const statusText = document.getElementById("statusText");
    const navUserDisplay = document.getElementById("navUserDisplay");

    const DEFAULT_AVATAR = "https://www.gstatic.com/firebasejs/ui/2.0.0/images/component/icl_phone_status_anon.png";
    let activeUser = null;

    // 1. Listen to Auth State Change & Fetch Existing Core Fields
    auth.onAuthStateChanged((user) => {
        if (user) {
            activeUser = user;
            userEmailInput.value = user.email;
            
            // Set basic Auth Profile state
            if (user.displayName) userNameInput.value = user.displayName;
            if (user.photoURL) profilePreview.src = user.photoURL;
            if (navUserDisplay) navUserDisplay.textContent = user.displayName || user.email;

            // Fetch extended fields (like Donor Status toggle) from Firestore
            db.collection("donors").doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        const donorData = doc.data();
                        if (donorData.name) userNameInput.value = donorData.name;
                        if (donorData.photoURL) profilePreview.src = donorData.photoURL;
                        
                        // Setup toggle mapping status
                        if (donorData.status === "Inactive") {
                            statusToggle.checked = false;
                            adjustToggleUI(false);
                        } else {
                            statusToggle.checked = true;
                            adjustToggleUI(true);
                        }
                    }
                })
                .catch(err => console.error("Error reading extended donor data object:", err));
        } else {
            // Unauthenticated intercept - send to index login portal
            window.location.href = "index.html";
        }
    });

    // 2. Real-time Status Toggle Interface Refresher
    statusToggle.addEventListener("change", (e) => {
        adjustToggleUI(e.target.checked);
    });

    function adjustToggleUI(isActive) {
        if (isActive) {
            statusText.textContent = "Active";
            statusText.className = "status-text active";
        } else {
            statusText.textContent = "Inactive";
            statusText.className = "status-text inactive";
        }
    }

    // 3. Instant Photo Pick and Local Reader Preview
    photoInput.addEventListener("change", (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            // Enforce basic client size protection (2MB limit)
            if (selectedFile.size > 2 * 1024 * 1024) {
                displayToastMessage("Image size exceeds 2MB limit.", "error");
                photoInput.value = "";
                return;
            }
            const fileReader = new FileReader();
            fileReader.onload = (event) => {
                profilePreview.src = event.target.result;
            };
            fileReader.readAsDataURL(selectedFile);
        }
    });

    // Remove Selected Picture Action Handler
    removePhotoBtn.addEventListener("click", () => {
        profilePreview.src = DEFAULT_AVATAR;
        photoInput.value = "";
    });

    // 4. Form Submit Orchestrator: Update Auth Profile, Sync Firestore & Process Passwords
    settingsForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!activeUser) return;

        const updatedName = userNameInput.value.trim();
        const curPassword = document.getElementById("currentPassword").value;
        const newPassword = document.getElementById("newPassword").value;
        const cnfPassword = document.getElementById("confirmPassword").value;
        const finalStatus = statusToggle.checked ? "Active" : "Inactive";
        const base64Photo = profilePreview.src;

        if (!updatedName) {
            displayToastMessage("Full name cannot be blank.", "error");
            return;
        }

        try {
            // Step A: Update Core Firebase Native Authentication Profile Reference
            await activeUser.updateProfile({
                displayName: updatedName,
                photoURL: base64Photo
            });

            // Step B: Write/Merge Document Matrix downstream to FireStore collection 'donors'
            await db.collection("donors").doc(activeUser.uid).set({
                name: updatedName,
                photoURL: base64Photo,
                status: finalStatus,
                email: activeUser.email,
                lastProfileChange: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Step C: If security fields are filled, execute Auth credential lifecycle updates
            if (newPassword) {
                if (newPassword.length < 6) {
                    displayToastMessage("New password must contain at least 6 characters.", "error");
                    return;
                }
                if (newPassword !== cnfPassword) {
                    displayToastMessage("New password mismatch errors found.", "error");
                    return;
                }
                if (!curPassword) {
                    displayToastMessage("Current credentials required for password mutation verification.", "error");
                    return;
                }

                // Elevate operational security context by reauthenticating prior to token write
                const authCredential = firebase.auth.EmailAuthProvider.credential(activeUser.email, curPassword);
                await activeUser.reauthenticateWithCredential(authCredential);
                
                // Commit Password Update
                await activeUser.updatePassword(newPassword);

                // Clear operational security inputs
                document.getElementById("currentPassword").value = "";
                document.getElementById("newPassword").value = "";
                document.getElementById("confirmPassword").value = "";
            }

            // Sync structural context UI element states
            if (navUserDisplay) navUserDisplay.textContent = updatedName;
            displayToastMessage("Profile configuration successfully preserved!", "success");

        } catch (error) {
            console.error("Critical Profile Error Exception:", error);
            displayToastMessage(error.message || "Failed saving changes.", "error");
        }
    });

    // Localized Notification Interceptor
    function displayToastMessage(msg, variant) {
        if (typeof window.showToast === "function") {
            window.showToast(msg, variant);
        } else {
            alert(`[${variant.toUpperCase()}] ${msg}`);
        }
    }
});