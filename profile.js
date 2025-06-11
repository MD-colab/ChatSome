// This file no longer imports from firebase-config.js.
// It relies on the global 'firebase' object.
// The functions from utils.js are now also global due to the updated utils.js and index.html/chat.html script imports.

let currentUser = null;
let currentUserData = null;
let appTheme = localStorage.getItem('appTheme') || 'light-theme';

// DOM elements for profile.html
let backToChatsBtn, myProfileAvatar, myProfileAvatarStatusIndicator, myProfileName, myProfileEmail, myProfileStatus, myProfileStatusMessage, myProfileLastActive, myProfileJoined, editProfileBtn, viewStarredMessagesBtn, logoutBtn;

function cacheDOMElements() {
    backToChatsBtn = document.getElementById('backToChatsBtn');
    myProfileAvatar = document.getElementById('myProfileAvatar');
    myProfileAvatarStatusIndicator = document.getElementById('myProfileAvatarStatusIndicator');
    myProfileName = document.getElementById('myProfileName');
    myProfileEmail = document.getElementById('myProfileEmail');
    myProfileStatus = document.getElementById('myProfileStatus');
    myProfileStatusMessage = document.getElementById('myProfileStatusMessage');
    myProfileLastActive = document.getElementById('myProfileLastActive');
    myProfileJoined = document.getElementById('myProfileJoined');
    editProfileBtn = document.getElementById('editProfileBtn');
    viewStarredMessagesBtn = document.getElementById('viewStarredMessagesBtn');
    logoutBtn = document.getElementById('logoutBtn');
    console.log('Profile DOM elements cached.');
}

// Function to update current user's status (similar to app.js, but ensures it's self-contained for this page)
async function updateUserStatus(status, statusMessage = null) {
    if (!currentUser || !currentUser.uid) return;

    const userDocRef = firebase.firestore().collection('users').doc(currentUser.uid);
    const userRtdbRef = firebase.database().ref(`/status/${currentUser.uid}`);
    const lastActiveTimestamp = firebase.firestore.FieldValue.serverTimestamp();
    const rtdbLastChanged = firebase.database.ServerValue.TIMESTAMP;

    const updateData = {
        status: status,
        lastActive: lastActiveTimestamp
    };
    if (statusMessage !== null) {
        updateData.statusMessage = statusMessage;
    }

    try {
        await userDocRef.update(updateData);
        console.log(`User status updated to ${status} in Firestore for ${currentUser.uid}.`);
        if (statusMessage !== null) {
            console.log(`User status message updated to "${statusMessage}".`);
        }

        if (status === 'online') {
            userRtdbRef.set({
                status: 'online',
                last_changed: rtdbLastChanged
            });
            firebase.database().ref(`/status/${currentUser.uid}`).onDisconnect().set({
                status: 'offline',
                last_changed: rtdbLastChanged
            });
        } else {
            firebase.database().ref(`/status/${currentUser.uid}`).onDisconnect().cancel();
            userRtdbRef.set({
                status: 'offline',
                last_changed: rtdbLastChanged
            });
        }
    } catch (error) {
        console.error('Error updating user status:', error);
    }
}

// Subscribe to current user's status updates for the profile page
let unsubscribeFromMyStatus = null;
function subscribeToMyStatus(userId) {
    if (unsubscribeFromMyStatus) unsubscribeFromMyStatus();

    const userDocRef = firebase.firestore().collection('users').doc(userId);
    unsubscribeFromMyStatus = userDocRef.onSnapshot((doc) => {
        if (doc.exists) {
            currentUserData = { id: doc.id, ...doc.data() };
            console.log('Current user data updated in profile.js:', currentUserData);
            displayMyProfile(currentUserData);
        } else {
            console.warn('Current user document not found in profile.js. Forcing logout.');
            // Using window.logout from app.js which is now global
            if (window.logout) window.logout();
        }
    }, (error) => {
        console.error('Error subscribing to my status:', error);
        window.showAppMessage('Error loading your profile data.');
    });
    console.log(`Subscribed to current user status for: ${userId}`);
}

function displayMyProfile(userData) {
    if (!userData) return;

    if (myProfileAvatar) {
        myProfileAvatar.textContent = window.getAvatarInitial(userData.name);
        window.updateStatusIndicatorUI(myProfileAvatarStatusIndicator, userData.status);
    }
    if (myProfileName) myProfileName.textContent = userData.name;
    if (myProfileEmail) myProfileEmail.textContent = userData.email;
    if (myProfileStatus) myProfileStatus.textContent = userData.status || 'Offline';
    if (myProfileStatusMessage) myProfileStatusMessage.textContent = userData.statusMessage || 'No status message set.';
    if (myProfileLastActive) myProfileLastActive.textContent = userData.lastActive ? `${window.formatTime(userData.lastActive)}` : 'N/A';
    if (myProfileJoined) myProfileJoined.textContent = userData.createdAt ? userData.createdAt.toDate().toLocaleDateString() : 'N/A';
}

// Main authentication state observer for profile.html
firebase.auth().onAuthStateChanged(async (user) => {
    cacheDOMElements();
    window.applyGlobalTheme(appTheme);

    if (user) {
        currentUser = user;
        console.log('User logged in on profile.html:', currentUser.uid);

        subscribeToMyStatus(currentUser.uid); // Listen to real-time updates for my profile

        // Set up event listeners
        if (backToChatsBtn) backToChatsBtn.addEventListener('click', () => window.location.href = 'index.html');
        if (editProfileBtn) editProfileBtn.addEventListener('click', () => window.location.href = 'settings.html');
        if (viewStarredMessagesBtn) viewStarredMessagesBtn.addEventListener('click', () => window.showAppMessage('View Starred Messages is a Work In Progress.', false));
        if (logoutBtn) logoutBtn.addEventListener('click', () => {
            if (window.logout) window.logout(); // Call global logout from app.js
        });

        // Set status to online and manage RTDB connection
        firebase.database().ref('.info/connected').on('value', (snapshot) => {
            if (snapshot.val() === true) {
                console.log('Realtime Database: Connected (profile.js).');
                updateUserStatus('online', currentUserData?.statusMessage);
            } else {
                console.log('Realtime Database: Disconnected (profile.js).');
            }
        });
        window.addEventListener('beforeunload', () => updateUserStatus('offline', currentUserData?.statusMessage));

    } else {
        console.log('User not logged in on profile.html. Redirecting to login.html');
        if (unsubscribeFromMyStatus) unsubscribeFromMyStatus(); // Clean up listener
        // If not logged in, should redirect to login.html. app.js's onAuthStateChanged handles this.
        // Explicitly redirect in case app.js hasn't handled it or to force a clean state.
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
});