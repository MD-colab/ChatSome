// This file no longer imports from firebase-config.js.
// It relies on the global 'firebase' object.
// The functions from utils.js are now also global due to the updated utils.js and HTML script imports.

let currentUser = null;
let currentUserData = null;
let appTheme = localStorage.getItem('appTheme') || 'light-theme';

// DOM elements for settings.html
let backToProfileOrChatsBtn, lightThemeBtn, darkThemeBtn, statusMessageInput, saveStatusMessageBtn, logoutBtn;

function cacheDOMElements() {
    backToProfileOrChatsBtn = document.getElementById('backToProfileOrChatsBtn');
    lightThemeBtn = document.getElementById('lightThemeBtn');
    darkThemeBtn = document.getElementById('darkThemeBtn');
    statusMessageInput = document.getElementById('statusMessageInput');
    saveStatusMessageBtn = document.getElementById('saveStatusMessageBtn');
    logoutBtn = document.getElementById('logoutBtn');
    console.log('Settings DOM elements cached.');
}

/**
 * Updates the current user's online/offline status in Firestore and Realtime Database.
 * (Duplicated for self-contained functionality on this page, or could be a shared utility).
 */
async function updateUserStatus(status, statusMessage = null) {
    if (!currentUser || !currentUser.uid) {
        console.warn('Cannot update user status: currentUser is not set.');
        return;
    }

    const userDocRef = firebase.firestore().collection('users').doc(currentUser.uid);
    const updateData = {
        status: status,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (statusMessage !== null) {
        updateData.statusMessage = statusMessage;
    }

    try {
        await userDocRef.update(updateData);
        console.log(`User status updated in Firestore for ${currentUser.uid}.`);
        if (statusMessage !== null) {
             console.log(`User status message updated to "${statusMessage}".`);
        }
    } catch (error) {
        console.error('Error updating user status from settings:', error);
    }
}

/**
 * Saves the current user's status message.
 */
async function saveUserStatusMessage() {
    if (!currentUser || !statusMessageInput || !currentUserData) return;

    const newStatusMessage = statusMessageInput.value.trim();
    if (newStatusMessage === (currentUserData.statusMessage || '')) {
        window.showAppMessage('Status message is already the same.', false);
        return;
    }

    window.setButtonLoading(saveStatusMessageBtn, true, '<i class="fas fa-check"></i> Save');
    try {
        await updateUserStatus(currentUserData.status, newStatusMessage); // Update status message in Firestore
        currentUserData.statusMessage = newStatusMessage; // Update local cache
        window.showAppMessage('Status message updated successfully!', true);
    } catch (error) {
        console.error('Error updating status message:', error);
        window.showAppMessage('Failed to update status message.', false);
    } finally {
        window.setButtonLoading(saveStatusMessageBtn, false, '<i class="fas fa-check"></i> Save');
    }
}

// Main authentication state observer for settings.html
firebase.auth().onAuthStateChanged(async (user) => {
    cacheDOMElements();
    // Pass theme buttons to applyGlobalTheme to manage active state
    window.applyGlobalTheme(appTheme, lightThemeBtn, darkThemeBtn);

    if (user) {
        currentUser = user;
        console.log('User logged in on settings.html:', currentUser.uid);

        // Fetch current user data
        try {
            const userDoc = await firebase.firestore().collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) {
                currentUserData = { id: userDoc.id, ...userDoc.data() };
                if (statusMessageInput) {
                    statusMessageInput.value = currentUserData.statusMessage || '';
                }
            } else {
                console.error("User document not found for:", currentUser.uid, "Forcing logout.");
                if (window.logout) window.logout();
                return;
            }
        } catch (error) {
            console.error('Error fetching current user data in settings.js:', error);
            if (window.logout) window.logout();
            return;
        }

        // Set up event listeners
        if (backToProfileOrChatsBtn) backToProfileOrChatsBtn.addEventListener('click', () => {
            // Determine if previous page was profile.html or index.html
            const referrer = document.referrer;
            if (referrer.includes('profile.html')) {
                window.location.href = 'profile.html';
            } else {
                window.location.href = 'index.html';
            }
        });
        if (lightThemeBtn) lightThemeBtn.addEventListener('click', () => window.applyGlobalTheme('light-theme', lightThemeBtn, darkThemeBtn));
        if (darkThemeBtn) darkThemeBtn.addEventListener('click', () => window.applyGlobalTheme('dark-theme', lightThemeBtn, darkThemeBtn));
        if (saveStatusMessageBtn) saveStatusMessageBtn.addEventListener('click', saveUserStatusMessage);
        if (logoutBtn) logoutBtn.addEventListener('click', () => {
             // Pass relevant Firebase instances to globalLogout
            window.logout(firebase.auth(), firebase.database(), currentUser);
        });

        // Update status to online (for this page's presence)
        firebase.database().ref('.info/connected').on('value', (snapshot) => {
            if (snapshot.val() === true) {
                console.log('Realtime Database: Connected (settings.js).');
                updateUserStatus('online', currentUserData?.statusMessage);
            } else {
                console.log('Realtime Database: Disconnected (settings.js).');
            }
        });
        window.addEventListener('beforeunload', () => updateUserStatus('offline', currentUserData?.statusMessage));

    } else {
        console.log('User not logged in on settings.html. Redirecting to login.html');
        // If not logged in, should redirect to login.html. app.js's onAuthStateChanged handles this.
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
});