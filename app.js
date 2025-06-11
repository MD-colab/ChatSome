// ===============================================
// 1. Firebase Configuration & Initialization
// ===============================================
// !!! IMPORTANT: Replace with your actual Firebase project configuration !!!
const firebaseConfig = {
  apiKey: "AIzaSyBa-pFNITxksJzz4kvDFXvYHfIzQZyjy_w",
  authDomain: "chatsome-a2c06.firebaseapp.com",
  projectId: "chatsome-a2c06",
  storageBucket: "chatsome-a2c06.firebasestorage.app",
  messagingSenderId: "704669977989",
  appId: "1:704669977989:web:ffe60426166c88bc8e08ec",
  measurementId: "G-SZ7P0CF4ZG"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const rtdb = firebase.database(); // For online status and typing indicators
const storage = firebase.storage(); // For file/media uploads

// Configure Firestore settings (optional, but good practice for newer features)
db.settings({ timestampsInSnapshots: true });


// ===============================================
// 2. Global State Variables
// ===============================================
let currentUser = null; // Firebase Auth user object
let currentUserData = null; // Firestore user document data (name, email, avatarInitial, status, statusMessage)
let currentChatId = null; // Currently selected chat ID (only relevant on chat.html)
let currentChatOtherUser = null; // Data of the other user in the current chat (only relevant on chat.html)

// Unsubscribe functions for various real-time listeners
let unsubscribeFromMessages = null;
let unsubscribeFromChatList = null;
let unsubscribeFromOtherUserStatus = null;
let unsubscribeFromChatTyping = null;
let unsubscribeFromRTDBConnection = null; // Realtime DB connection status listener

let allUsers = []; // Cache all users for new chat modal (fetched once on login)
let typingTimer = null; // Timer for debouncing typing status for current user
const TYPING_TIMEOUT_MS = 3000; // Time after which typing status clears for sender

// Unread message tracking (simplified)
const unreadCounts = {}; // Stores {chatId: count}
let lastMessageTimestamps = {}; // Stores {chatId: latestMessageTimestamp} for tracking new messages
let isMobileView = window.innerWidth <= 768; // Flag to check if current view is mobile

let appTheme = localStorage.getItem('appTheme') || 'light-theme'; // Global app theme: 'light-theme' or 'dark-theme'

// Multi-select modes
let isChatSelectMode = false;
const selectedChatIds = new Set();
let isMessageSelectMode = false;
const selectedMessageIds = new Set();


// ===============================================
// 3. Common DOM Elements (Cached on DOMContentLoaded)
//    These variables are global so functions can access them.
//    Their existence is checked via `if (element)` before use.
// ===============================================
// Index page (sidebar) elements
let sidebarUserInfo, currentUserAvatar, currentUserNameSpan, newChatBtn, chatSearchInput, chatList, sidebar, chatItemTemplate, moreOptionsBtn, moreOptionsMenu, selectChatsBtn, settingsFromIndexBtn, logoutFromIndexBtn, deleteSelectedChatsBtn;
// Chat page elements
let welcomeScreen, currentChatDetails, backToSidebarBtn, currentChatAvatar, currentChatHeaderAvatarStatusIndicator, currentChatNameSpan, currentChatHeaderStatusIndicator, currentChatStatusP, chatOptionsBtn, chatOptionsMenu, selectMessagesBtn, clearChatBtn, toggleThemeBtn, shareChatBtn, blockUserBtn, viewSharedMediaBtn, chatMessages, messageInput, sendBtn, typingIndicator, typingText, callBtn, videoCallBtn, attachBtn, emojiBtn, deleteSelectedMessagesBtn;
// Modals and context menus (present on multiple pages)
let newChatModal, closeNewChatModalBtn, modalSearchUsersInput, modalUserList;
let profileViewModal, closeProfileViewModalBtn, profileAvatar, profileName, profileEmail, profileStatus, profileStatusMessage, profileJoined, profileActions;
let contextMenu;

// Function to cache DOM elements based on the current page's HTML structure
function cacheDOMElements() {
    // Universal/Modal elements (check for existence)
    profileViewModal = document.getElementById('profileViewModal');
    if (profileViewModal) {
        closeProfileViewModalBtn = document.getElementById('closeProfileViewModalBtn');
        profileAvatar = document.getElementById('profileAvatar');
        profileName = document.getElementById('profileName');
        profileEmail = document.getElementById('profileEmail');
        profileStatus = document.getElementById('profileStatus');
        profileStatusMessage = document.getElementById('profileStatusMessage');
        profileJoined = document.getElementById('profileJoined');
        profileActions = profileViewModal.querySelector('.profile-actions');
    }
    contextMenu = document.getElementById('contextMenu');

    // Index page (sidebar) elements
    sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebarUserInfo = document.getElementById('sidebarUserInfo');
        currentUserAvatar = document.getElementById('currentUserAvatar');
        currentUserNameSpan = document.getElementById('currentUserName');
        newChatBtn = document.getElementById('newChatBtn');
        chatSearchInput = document.getElementById('chatSearchInput');
        chatList = document.getElementById('chatList');
        chatItemTemplate = document.getElementById('chatItemTemplate');
        newChatModal = document.getElementById('newChatModal');
        moreOptionsBtn = document.getElementById('moreOptionsBtn');
        moreOptionsMenu = document.getElementById('moreOptionsMenu');

        if (moreOptionsMenu) {
            selectChatsBtn = document.getElementById('selectChatsBtn');
            settingsFromIndexBtn = document.getElementById('settingsBtn');
            logoutFromIndexBtn = document.getElementById('logoutBtn');
            deleteSelectedChatsBtn = document.getElementById('deleteSelectedChatsBtn');
        }

        if (newChatModal) {
            closeNewChatModalBtn = document.getElementById('closeNewChatModalBtn');
            modalSearchUsersInput = document.getElementById('modalSearchUsers');
            modalUserList = document.getElementById('modalUserList');
        }
    }

    // Chat page elements
    currentChatDetails = document.getElementById('currentChatDetails');
    if (currentChatDetails) {
        welcomeScreen = document.getElementById('welcomeScreen');
        backToSidebarBtn = document.getElementById('backToSidebarBtn');
        currentChatAvatar = document.getElementById('currentChatHeaderAvatar');
        currentChatHeaderAvatarStatusIndicator = document.getElementById('currentChatHeaderAvatarStatusIndicator');
        currentChatNameSpan = document.querySelector('#currentChatName span');
        currentChatHeaderStatusIndicator = document.getElementById('currentChatHeaderStatusIndicator');
        currentChatStatusP = document.getElementById('currentChatStatus');
        chatOptionsBtn = document.getElementById('chatOptionsBtn');
        chatOptionsMenu = document.getElementById('chatOptionsMenu');
        callBtn = document.getElementById('callBtn');
        videoCallBtn = document.getElementById('videoCallBtn');
        attachBtn = document.getElementById('attachBtn');
        emojiBtn = document.getElementById('emojiBtn');

        if (chatOptionsMenu) {
            selectMessagesBtn = document.getElementById('selectMessagesBtn');
            clearChatBtn = document.getElementById('clearChatBtn');
            toggleThemeBtn = document.getElementById('toggleThemeBtn');
            shareChatBtn = document.getElementById('shareChatBtn');
            blockUserBtn = document.getElementById('blockUserBtn');
            viewSharedMediaBtn = document.getElementById('viewSharedMediaBtn');
            deleteSelectedMessagesBtn = document.getElementById('deleteSelectedMessagesBtn');
        }
        chatMessages = document.getElementById('chatMessages');
        messageInput = document.getElementById('messageInput');
        sendBtn = document.getElementById('sendBtn');
        typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingText = typingIndicator.querySelector('.typing-text');
        }
    }
    console.log('DOM elements cached.');
}


// ===============================================
// 4. Utility Functions (Globally Accessible)
// ===============================================

/**
 * Generates avatar initials from a name.
 * @param {string} name - The user's name.
 * @returns {string} The first letter(s) of the name in uppercase, or '?' if name is empty.
 */
function getAvatarInitial(name) {
    if (!name) return '?';
    const words = name.split(' ');
    if (words.length > 1) {
        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
}

/**
 * Formats a Firestore Timestamp to a human-readable time string.
 * @param {firebase.firestore.Timestamp} timestamp - The Firestore timestamp object.
 * @returns {string} Formatted time string (e.g., "10:30 AM").
 */
function formatTime(timestamp) {
    if (!timestamp || !timestamp.toDate) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Formats a Firestore Timestamp to a date string for message separators.
 * @param {firebase.firestore.Timestamp} timestamp - The Firestore timestamp object.
 * @returns {string} Formatted date string (e.g., "Today", "Yesterday", "MMM DD, YYYY").
 */
function formatDateForSeparator(timestamp) {
    if (!timestamp || !timestamp.toDate) return '';
    const date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() &&
                                 d1.getMonth() === d2.getMonth() &&
                                 d1.getDate() === d2.getDate();

    if (isSameDay(date, today)) {
        return 'Today';
    } else if (isSameDay(date, yesterday)) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

/**
 * Displays a general-purpose message (error/success) at the top of the viewport.
 * @param {string} message - The message to display.
 * @param {boolean} isSuccess - True for success (green), false for error (red).
 */
function showAppMessage(message, isSuccess = false) {
    let tempDiv = document.createElement('div');
    tempDiv.textContent = message;
    tempDiv.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        padding: 10px 20px; border-radius: 8px; z-index: 10000;
        background: ${isSuccess ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)'};
        color: white; font-weight: bold; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        transition: opacity 0.5s ease;
    `;
    document.body.appendChild(tempDiv);
    setTimeout(() => {
        tempDiv.style.opacity = '0';
        tempDiv.addEventListener('transitionend', () => tempDiv.remove());
    }, 5000);
}
// Expose showAppMessage globally for dots.js to use
window.showAppMessage = showAppMessage;


/**
 * Sets the loading state for a button.
 * @param {HTMLElement} button - The button element.
 * @param {boolean} isLoading - True to show loading, false for normal state.
 * @param {string} originalText - The original text of the button.
 */
function setButtonLoading(button, isLoading, originalText) {
    if (button) {
        if (isLoading) {
            button.textContent = 'Loading...';
            button.disabled = true;
        } else {
            button.innerHTML = originalText; // Use innerHTML for icons
            button.disabled = false;
        }
    }
}

/**
 * Scrolls the chat messages container to the bottom.
 */
function scrollToBottom() {
    if (!chatMessages) return;
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

/**
 * Clears chat-specific UI elements and state variables.
 * Used when navigating away from a chat or when a chat is deleted.
 */
function clearChatPageUI() {
    currentChatId = null;
    currentChatOtherUser = null;
    if (chatMessages) chatMessages.innerHTML = '';
    if (welcomeScreen) welcomeScreen.classList.remove('hidden');
    if (currentChatDetails) currentChatDetails.classList.add('hidden');
    if (typingIndicator) typingIndicator.classList.add('hidden');
    if (messageInput) messageInput.value = '';
    if (sendBtn) sendBtn.disabled = true;
    if (messageInput) updateMessageInputHeight();
    if (chatOptionsMenu) chatOptionsMenu.classList.add('hidden');
    hideContextMenu();
    // Reset message selection mode
    if (isMessageSelectMode) toggleMessageSelectMode();
}

/**
 * Manages all Firebase listeners (Firestore and Realtime Database).
 * Call this before logging out or when navigating away from a page that uses many listeners.
 */
function unsubscribeAllListeners() {
    console.log('Unsubscribing all active listeners...');
    if (unsubscribeFromMessages) {
        unsubscribeFromMessages();
        unsubscribeFromMessages = null;
    }
    if (unsubscribeFromChatList) {
        unsubscribeFromChatList();
        unsubscribeFromChatList = null;
    }
    if (unsubscribeFromOtherUserStatus) {
        unsubscribeFromOtherUserStatus();
        unsubscribeFromOtherUserStatus = null;
    }
    if (unsubscribeFromRTDBConnection) {
        unsubscribeFromRTDBConnection();
        unsubscribeFromRTDBConnection = null;
    }
    // Clear any pending typing timer
    if (typingTimer) {
        clearTimeout(typingTimer);
        typingTimer = null;
    }
    // Also, clear RTDB onDisconnect for the current user if logged out.
    if (currentUser && currentUser.uid) {
        rtdb.ref(`/status/${currentUser.uid}`).onDisconnect().cancel();
        // Also clear any typing status for the current user in RTDB upon logout
        if (currentChatId) { // currentChatId might be null if on index.html
             rtdb.ref(`typing/${currentChatId}/${currentUser.uid}`).remove();
        }
        console.log(`RTDB onDisconnect canceled and typing status cleared for ${currentUser.uid}.`);
    }
    console.log('All Firebase listeners unsubscribed and cleaned up.');
}

/**
 * Displays a generic context menu.
 * @param {MouseEvent | TouchEvent} event - The event that triggered the context menu.
 * @param {Array<Object>} options - An array of {label, icon, action, isDanger} objects.
 * @param {Object} [data] - Optional data to pass to actions (e.g., messageId, userId).
 */
function showContextMenu(event, options, data = {}) {
    if (!contextMenu) return; // Ensure contextMenu element exists
    event.preventDefault(); // Prevent default browser context menu
    event.stopPropagation(); // Stop propagation to prevent document click from closing immediately

    // Clear existing options
    contextMenu.querySelector('ul').innerHTML = '';

    // Populate options
    options.forEach(option => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fas fa-${option.icon}"></i> ${option.label}`;
        if (option.isDanger) {
            li.classList.add('danger');
        }
        li.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop propagation to prevent closing menu too early
            option.action(data);
            hideContextMenu();
        });
        contextMenu.querySelector('ul').appendChild(li);
    });

    // Position the menu
    // Adjust position to stay within viewport
    let x = event.clientX;
    let y = event.clientY;

    contextMenu.classList.add('show'); // Temporarily show to get dimensions
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
    contextMenu.classList.remove('show'); // Hide again

    if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10; // 10px margin
    }
    if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10; // 10px margin
    }
    // Ensure it doesn't go off screen to the left/top
    x = Math.max(0, x);
    y = Math.max(0, y);


    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.classList.add('show');
}

/**
 * Hides the generic context menu.
 */
function hideContextMenu() {
    if (contextMenu) {
        contextMenu.classList.remove('show');
    }
}

// Global click listener to hide context menu and other dropdown menus
document.addEventListener('click', (event) => {
    // Hide context menu
    if (contextMenu && contextMenu.classList.contains('show') && !contextMenu.contains(event.target)) {
        hideContextMenu();
    }
    // Hide chat options menu (if on chat.html)
    if (chatOptionsMenu && chatOptionsMenu.classList.contains('show') && !chatOptionsMenu.contains(event.target) && (!chatOptionsBtn || !chatOptionsBtn.contains(event.target))) {
        chatOptionsMenu.classList.remove('show');
    }
    // Hide more options menu (if on index.html)
    if (moreOptionsMenu && moreOptionsMenu.classList.contains('show') && !moreOptionsMenu.contains(event.target) && (!moreOptionsBtn || !moreOptionsBtn.contains(event.target))) {
        moreOptionsMenu.classList.remove('show');
    }
});

/**
 * Adjusts the height of the message input textarea to fit its content.
 */
function updateMessageInputHeight() {
    if (!messageInput) return;
    messageInput.style.height = 'auto'; // Reset height
    messageInput.style.height = messageInput.scrollHeight + 'px'; // Set to scroll height
}

// ===============================================
// 5. Authentication Logic (Login.html specific code REMOVED)
// This app.js file now assumes the user is already authenticated or handles redirection
// if they are not. Login/Registration UI and logic are handled in login.js.
// ===============================================


// ===============================================
// 6. User Status / Presence Logic (Shared)
// ===============================================

/**
 * Updates the current user's online/offline status in Firestore and Realtime Database.
 * Also sets up `onDisconnect` for RTDB to handle sudden disconnects.
 * @param {'online' | 'offline' | 'away'} status - The status to set.
 * @param {string} [statusMessage] - Optional status message to update.
 */
async function updateUserStatus(status, statusMessage = null) {
    if (!currentUser || !currentUser.uid) {
        console.warn('Cannot update user status: currentUser is not set.');
        return;
    }

    const userDocRef = db.collection('users').doc(currentUser.uid);
    const userRtdbRef = rtdb.ref(`/status/${currentUser.uid}`);
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
        // Update Firestore document
        await userDocRef.update(updateData);
        console.log(`User status updated to ${status} in Firestore for ${currentUser.uid}.`);
        if (statusMessage !== null) {
             console.log(`User status message updated to "${statusMessage}".`);
        }

        // Update Realtime Database for real-time presence
        if (status === 'online') {
            userRtdbRef.set({
                status: 'online',
                last_changed: rtdbLastChanged
            });
            // Set up onDisconnect: if client disconnects, set status to offline
            userRtdbRef.onDisconnect().set({
                status: 'offline',
                last_changed: rtdbLastChanged
            });
            console.log(`RTDB onDisconnect hook set for ${currentUser.uid}.`);
        } else {
            // If explicitly setting offline (e.g., on logout), remove onDisconnect and set status immediately
            userRtdbRef.onDisconnect().cancel(); // Remove the onDisconnect hook
            userRtdbRef.set({
                status: 'offline',
                last_changed: rtdbLastChanged
            });
            console.log(`RTDB status explicitly set to offline for ${currentUser.uid}.`);
        }
    }
    catch (error) {
        console.error('Error updating user status:', error);
    }
}

/**
 * Updates the UI for a user's status indicator.
 * @param {HTMLElement} indicatorElement - The status indicator span element.
 * @param {string} status - The status ('online', 'away', 'offline').
 */
function updateStatusIndicatorUI(indicatorElement, status) {
    if (!indicatorElement) return;
    indicatorElement.className = 'status-indicator'; // Reset classes
    switch (status) {
        case 'online':
            indicatorElement.classList.add('status-online');
            break;
        case 'away':
            indicatorElement.classList.add('status-away');
            break;
        case 'offline':
            indicatorElement.classList.add('status-offline');
            break;
        default:
            indicatorElement.classList.add('status-offline'); // Default to offline
    }
}

/**
 * Subscribes to Realtime Database connection status.
 */
function subscribeToRTDBConnectionStatus() {
    if (unsubscribeFromRTDBConnection) unsubscribeFromRTDBConnection(); // Clean up previous

    const connectedRef = rtdb.ref('.info/connected');
    unsubscribeFromRTDBConnection = connectedRef.on('value', (snapshot) => {
        if (snapshot.val() === true) {
            console.log('Realtime Database: Connected.');
            // Update status to online if currently logged in
            if (currentUser && currentUser.uid) {
                updateUserStatus('online', currentUserData?.statusMessage || 'Hey there! I\'m using Chat Some.'); // Pass current status message
            }
        } else {
            console.log('Realtime Database: Disconnected.');
            // Firebase onDisconnect handles offline status if this disconnect is unexpected.
        }
    });
}


/**
 * Subscribes to another user's status updates from Firestore.
 * This will drive the status display in chat header and chat list.
 * @param {string} userId - The ID of the user to monitor.
 * @param {HTMLElement} statusIndicatorElement - The UI element (e.g., span) to update for the indicator.
 * @param {HTMLElement} statusTextElement - The text element (e.g., p) to update (e.g., "Online", "Offline 5m ago").
 */
function subscribeToOtherUserStatus(userId, statusIndicatorElement, statusTextElement) {
    // Clean up previous subscription if any
    if (unsubscribeFromOtherUserStatus) {
        console.log('Unsubscribing from previous other user status listener.');
        unsubscribeFromOtherUserStatus();
    }

    if (!userId) {
        console.warn('Cannot subscribe to user status: userId is null.');
        if (statusIndicatorElement) updateStatusIndicatorUI(statusIndicatorElement, 'offline');
        if (statusTextElement) statusTextElement.textContent = 'Offline';
        return;
    }

    const userDocRef = db.collection('users').doc(userId);
    unsubscribeFromOtherUserStatus = userDocRef.onSnapshot(doc => {
        if (doc.exists) {
            const userData = doc.data();
            const status = userData.status || 'offline';
            const lastActive = userData.lastActive ? userData.lastActive.toDate() : null;

            if (statusIndicatorElement) updateStatusIndicatorUI(statusIndicatorElement, status);

            let statusText = status.charAt(0).toUpperCase() + status.slice(1);
            if (status === 'offline' && lastActive) {
                const now = Date.now();
                const diffMs = now - lastActive.getTime();
                const diffSeconds = Math.round(diffMs / 1000);

                if (diffSeconds < 60) {
                    statusText = `Offline now`;
                } else if (diffSeconds < 3600) { // less than 1 hour
                    statusText = `Offline ${Math.floor(diffSeconds / 60)}m ago`;
                } else if (diffSeconds < 86400) { // less than 24 hours
                    statusText = `Offline ${Math.floor(diffSeconds / 3600)}h ago`;
                } else {
                    statusText = `Offline ${Math.floor(diffSeconds / 86400)}d ago`;
                }
            }
            if (statusTextElement) statusTextElement.textContent = statusText;
        } else {
            console.warn(`User document for ID ${userId} not found or deleted during status listen. Defaulting to offline.`);
            if (statusIndicatorElement) updateStatusIndicatorUI(statusIndicatorElement, 'offline');
            if (statusTextElement) statusTextElement.textContent = 'Offline';
        }
    }, error => {
        console.error('Error subscribing to other user status:', error);
        if (statusIndicatorElement) updateStatusIndicatorUI(indicatorElement, 'offline');
        if (statusTextElement) statusTextElement.textContent = 'Error';
    });
    console.log(`Subscribed to user status for: ${userId}`);
}

// ===============================================
// 7. Authentication State Change & Routing
// ===============================================

// This is the main orchestrator for the application's pages (index.html, chat.html).
// It runs on every page load to determine authentication status and direct traffic.
auth.onAuthStateChanged(async (user) => {
    // Ensure DOM elements are cached BEFORE trying to use them in this listener
    cacheDOMElements();
    applyGlobalTheme(appTheme); // Apply theme as soon as DOM is ready

    if (user) {
        // User is logged in
        currentUser = user;
        console.log('User logged in:', currentUser.uid, 'on page:', window.location.pathname);

        // Fetch currentUserData (critical for all subsequent operations)
        const userDocRef = db.collection('users').doc(currentUser.uid);
        try {
            const userDoc = await userDocRef.get();
            if (userDoc.exists) {
                currentUserData = { id: userDoc.id, ...userDoc.data() };
                console.log('Current user data fetched and cached:', currentUserData);
            } else {
                // This scenario means an authenticated user somehow doesn't have a Firestore profile.
                // It's a critical error for this app. Force logout.
                console.error("User document not found for:", currentUser.uid, "This is unexpected. Forcing logout.");
                await auth.signOut(); // This will trigger onAuthStateChanged again
                return;
            }
        } catch (error) {
            console.error('Error fetching current user data:', error);
            await auth.signOut(); // Logout if data fetching fails, triggers onAuthStateChanged again
            return;
        }

        // Update status to online and set up RTDB connection listener
        await updateUserStatus('online', currentUserData.statusMessage || 'Hey there! I\'m using Chat Some.');
        subscribeToRTDBConnectionStatus();

        // Page-specific initialization based on current URL
        if (window.location.pathname.includes('login.html')) {
            // Logged in on login page, redirect to index
            window.location.href = 'index.html';
        } else if (window.location.pathname.includes('index.html')) {
            // Logged in on index page, initialize index page
            console.log('Initializing index page logic...');
            // Display current user's info in sidebar (clickable to my profile page)
            if (sidebarUserInfo) sidebarUserInfo.addEventListener('click', () => {
                window.location.href = 'profile.html'; // Redirect to dedicated profile page
            });
            if (currentUserAvatar && currentUserNameSpan) {
                currentUserAvatar.textContent = currentUserData.avatarInitial;
                currentUserNameSpan.textContent = currentUserData.name;
            }
            // Fetch all users (populates `allUsers` cache)
            await fetchAllUsers();
            // Load user chats (depends on `allUsers` and `currentUserData`)
            loadUserChats();

            // Set up event listeners unique to index.html
            if (newChatBtn) newChatBtn.addEventListener('click', () => {
                if (newChatModal) newChatModal.classList.remove('hidden');
                if (modalSearchUsersInput) modalSearchUsersInput.value = '';
                displayAllUsersInModal(); // Show all users by default
            });
            if (chatSearchInput) chatSearchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                Array.from(chatList.children).forEach(chatItem => {
                    if (chatItem.classList.contains('hidden') || !chatItem.dataset.chatId) return;
                    // Don't hide items that are selected
                    if (isChatSelectMode && chatItem.querySelector('.chat-select-checkbox')?.checked) return;

                    const chatName = chatItem.querySelector('.chat-name span').textContent.toLowerCase();
                    const chatPreview = chatItem.querySelector('.chat-preview').textContent.toLowerCase();
                    if (chatName.includes(searchTerm) || chatPreview.includes(searchTerm)) {
                        chatItem.style.display = 'flex';
                    } else {
                        chatItem.style.display = 'none';
                    }
                });
            });
            if (closeNewChatModalBtn) closeNewChatModalBtn.addEventListener('click', () => {
                if (newChatModal) newChatModal.classList.add('hidden');
            });
            if (modalSearchUsersInput) modalSearchUsersInput.addEventListener('input', (e) => {
                displayAllUsersInModal(e.target.value);
            });

            // "More Options" menu for index.html header - event listeners are set up in dots.js
            // The functions called by dots.js will be global functions defined in this app.js.
            // Expose main app functions to global scope for dots.js to access them
            window.toggleChatSelectMode = toggleChatSelectMode;
            window.deleteSelectedChats = deleteSelectedChats;

        } else if (window.location.pathname.includes('chat.html')) {
            // Logged in on chat page, initialize chat page
            console.log('Initializing chat page logic...');
            const urlParams = new URLSearchParams(window.location.search);
            const chatIdFromUrl = urlParams.get('chatId');
            const otherUserIdFromUrl = urlParams.get('otherUserId');

            if (!chatIdFromUrl || !otherUserIdFromUrl) {
                console.error('Missing chatId or otherUserId in URL parameters. Redirecting to index.html.');
                showAppMessage('Chat context not found. Redirecting to chat list.', false);
                setTimeout(() => window.location.href = 'index.html', 3000);
                return;
            }

            // Fetch all users first (important for `allUsers` cache used in `selectChat` and `openProfileViewModal`)
            await fetchAllUsers();

            // Fetch other user data (could be from `allUsers` cache or direct fetch)
            let otherUser = allUsers.find(u => u.id === otherUserIdFromUrl);
            if (!otherUser) {
                try {
                    const otherUserDoc = await db.collection('users').doc(otherUserIdFromUrl).get();
                    if (otherUserDoc.exists) {
                        otherUser = { id: otherUserDoc.id, ...otherUserDoc.data() };
                        allUsers.push(otherUser); // Add to cache
                        // Since we just fetched, this other user might not be part of `allUsers` yet if the chat was just created.
                        // Add to allUsers if not present
                        if (!allUsers.some(u => u.id === otherUser.id)) {
                            allUsers.push(otherUser);
                        }
                    } else {
                        console.error('Other user data not found for ID:', otherUserIdFromUrl);
                        showAppMessage('Other user not found. Redirecting to chat list.', false);
                        setTimeout(() => window.location.href = 'index.html', 3000);
                        return;
                    }
                } catch (error) {
                    console.error('Error fetching other user data:', error);
                    showAppMessage('Error loading chat. Redirecting to chat list.', false);
                    setTimeout(() => window.location.href = 'index.html', 3000);
                    return;
                }
            }
            // Select the chat to load messages and set up chat UI
            selectChat(chatIdFromUrl, otherUser);

            // Set up event listeners unique to chat.html
            if (backToSidebarBtn) backToSidebarBtn.addEventListener('click', () => {
                // Navigate back to index.html and clean up chat page state
                window.location.href = 'index.html';
            });
            // Chat Options Menu Item Functionalities - event listeners are set up in dots.js
            // Expose main app functions to global scope for dots.js to access them
            window.clearChat = clearChat; // Expose clearChat function
            window.toggleTheme = toggleTheme; // Expose toggleTheme function
            window.shareCurrentChat = shareCurrentChat;
            window.blockUser = blockUser;
            window.viewSharedMedia = viewSharedMedia;
            window.toggleMessageSelectMode = toggleMessageSelectMode;
            window.deleteSelectedMessages = deleteSelectedMessages;


            // Apply saved chat theme on load (for chat.html)
            const savedChatTheme = localStorage.getItem('chatTheme');
            if (savedChatTheme && chatMessages) {
                chatMessages.classList.add(savedChatTheme);
                chatMessages.dataset.theme = savedChatTheme;
            }

            // Call and Attach/Emoji Buttons
            if (callBtn) callBtn.addEventListener('click', () => showAppMessage('Voice Call feature is a Work In Progress.', false));
            if (videoCallBtn) videoCallBtn.addEventListener('click', () => showAppMessage('Video Call feature is a Work In Progress.', false));
            if (emojiBtn) emojiBtn.addEventListener('click', () => {
                // Simple emoji insertion, a real picker would be more complex
                showAppMessage('Emoji selection is a Work In Progress. Would open emoji picker, inserting a random one for now.', false);
                const emojis = ['😊', '😂', '👍', '❤️', '👏', '🥳', '😎'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                messageInput.value += randomEmoji;
                updateMessageInputHeight();
            });
            if (attachBtn) attachBtn.addEventListener('click', () => {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx'; // Accept various types
                fileInput.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        await sendFileMessage(file);
                    }
                };
                fileInput.click(); // Programmatically click the hidden input
            });


            // Message input and send button listeners for chat.html
            if (messageInput) {
                messageInput.addEventListener('input', () => {
                    if (sendBtn) sendBtn.disabled = messageInput.value.trim() === '';
                    updateMessageInputHeight();
                    setTypingStatusRTDB(true);
                });
                messageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (sendBtn) sendBtn.click();
                    }
                });
            }
            if (sendBtn) sendBtn.addEventListener('click', async () => {
                const messageText = messageInput.value.trim();
                if (messageText === '' || !currentUser || !currentChatId) {
                    console.warn('Cannot send message: Input is empty, user not logged in, or no chat selected.');
                    return;
                }
                try {
                    await sendMessageToFirestore('text', messageText);
                    setTypingStatusRTDB(false); // Clear typing status immediately
                    messageInput.value = '';
                    updateMessageInputHeight();
                    if (sendBtn) sendBtn.disabled = true;
                    clearTimeout(typingTimer); typingTimer = null; // Clear any pending typing timer
                } catch (error) {
                    console.error('Error sending message:', error);
                    showAppMessage("Failed to send message. Please check your internet and security rules.");
                }
            });
        }
        // Add a global listener to update user status to offline on browser/tab close
        window.addEventListener('beforeunload', () => updateUserStatus('offline', currentUserData.statusMessage));

    } else {
        // User is NOT logged in
        console.log('User is not logged in.');
        // Update status to offline (if currentUser was previously set)
        if (currentUser && currentUser.uid) { // Ensure currentUser was valid before trying to update status
            await updateUserStatus('offline', currentUserData?.statusMessage);
        }
        currentUser = null;
        currentUserData = null;

        unsubscribeAllListeners(); // Clean up all listeners
        clearChatPageUI(); // Clear chat/index specific UI

        // If not on login page, redirect to login.html
        if (!window.location.pathname.includes('login.html')) {
            console.log('Redirecting to login.html');
            window.location.href = 'login.html';
        }
        // If on login.html and not logged in, login.js will handle its UI, no action needed here.
    }
});

// Global logout function (accessible via `window.logout()`)
// This function needs to be global because settings.js or profile.js might call it.
window.logout = async () => {
    try {
        // Explicitly set offline status in RTDB immediately on logout
        if (currentUser && currentUser.uid) {
            await rtdb.ref(`/status/${currentUser.uid}`).set({
                status: 'offline',
                last_changed: firebase.database.ServerValue.TIMESTAMP
            });
            // Cancel any onDisconnect hook
            rtdb.ref(`/status/${currentUser.uid}`).onDisconnect().cancel();
            // Clear typing status if applicable
            if (currentChatId) {
                rtdb.ref(`typing/${currentChatId}/${currentUser.uid}`).remove();
            }
            console.log(`RTDB status explicitly set to offline for ${currentUser.uid} before logout.`);
        }

        await auth.signOut();
        console.log('User initiated logout successfully.');
        window.location.href = 'login.html'; // Redirect to login page after logout
    } catch (error) {
        console.error('Logout error:', error);
        showAppMessage('Failed to logout. Please try again.');
    }
};


// ===============================================
// 8. Chat List Management (Index Page Specific)
// ===============================================

/**
 * Loads and listens for real-time updates to the current user's chat list.
 */
function loadUserChats() {
    if (!currentUser || !currentUser.uid || !chatList || !chatItemTemplate) {
        console.warn('Cannot load user chats: dependencies missing (currentUser, chatList, chatItemTemplate).');
        if (chatList) chatList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 20px;">No chats. Click the "+" button to start a new conversation!</p>';
        return;
    }

    // Unsubscribe from previous chat list listener if active
    if (unsubscribeFromChatList) {
        unsubscribeFromChatList();
    }

    console.log('Subscribing to user chats for:', currentUser.uid);
    unsubscribeFromChatList = db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .orderBy('lastUpdated', 'desc')
        .onSnapshot(async (snapshot) => {
            console.log('Chat list snapshot received. Changes:', snapshot.docChanges().length);
            const processedChatIds = new Set();
            const fragment = document.createDocumentFragment();

            const currentChatItems = new Map(); // Keep track of current DOM chat items for updates
            Array.from(chatList.children).forEach(item => {
                if (item.classList.contains('chat-item') && !item.classList.contains('hidden')) {
                    currentChatItems.set(item.dataset.chatId, item);
                }
            });

            for (const docChange of snapshot.docChanges()) {
                const chat = docChange.doc.data();
                chat.id = docChange.doc.id;

                const otherParticipantId = chat.participants.find(pId => pId !== currentUser.uid);
                if (!otherParticipantId) {
                    console.warn(`Chat ${chat.id} found without other participant for user ${currentUser.uid}. Skipping.`);
                    continue;
                }

                let otherUserData = allUsers.find(u => u.id === otherParticipantId);
                if (!otherUserData) {
                    try {
                        const userDoc = await db.collection('users').doc(otherParticipantId).get();
                        if (userDoc.exists) {
                            otherUserData = { id: userDoc.id, ...userDoc.data() };
                            allUsers.push(otherUserData); // Add to cache for future use
                            console.log(`Fetched and cached user ${otherUserData.name} for chat list.`);
                        } else {
                            otherUserData = { name: 'Unknown User', avatarInitial: '?', status: 'offline', statusMessage: 'User Not Found' };
                            console.warn(`User data not found for participant ID: ${otherParticipantId}. Using fallback.`);
                        }
                    } catch (fetchError) {
                        console.error(`Error fetching user ${otherParticipantId} for chat list:`, fetchError);
                        otherUserData = { name: 'Error User', avatarInitial: '!', status: 'offline', statusMessage: 'Error loading user data' };
                    }
                }

                const lastMessageText = chat.lastMessage ? chat.lastMessage.text : 'No messages yet';
                const lastMessageTime = chat.lastMessage ? formatTime(chat.lastMessage.timestamp) : '';
                const otherUserStatus = otherUserData.status || 'offline';

                let chatItem = currentChatItems.get(chat.id); // Get existing item or null

                if (docChange.type === 'added' || docChange.type === 'modified') {
                    if (!chatItem) {
                        chatItem = chatItemTemplate.cloneNode(true);
                        chatItem.id = '';
                        chatItem.classList.remove('hidden');
                        chatItem.addEventListener('click', (e) => {
                            if (isChatSelectMode) {
                                const checkbox = chatItem.querySelector('.chat-select-checkbox');
                                if (checkbox) {
                                    checkbox.checked = !checkbox.checked;
                                    handleChatSelection(chat.id, checkbox.checked);
                                }
                            } else {
                                // Redirect to chat.html with query parameters
                                window.location.href = `chat.html?chatId=${chat.id}&otherUserId=${otherUserData.id}`;
                            }
                        });
                        chatItem.addEventListener('contextmenu', (e) => {
                            showContextMenu(e, [
                                { label: 'Delete Chat', icon: 'trash-alt', action: () => deleteChat(chat.id), isDanger: true },
                                { label: 'View Profile', icon: 'user', action: () => openProfileViewModal(otherUserData.id) }
                            ]);
                        });
                        chatItem.addEventListener('touchstart', (e) => {
                            const touchTimer = setTimeout(() => {
                                showContextMenu(e, [
                                    { label: 'Delete Chat', icon: 'trash-alt', action: () => deleteChat(chat.id), isDanger: true },
                                    { label: 'View Profile', icon: 'user', action: () => openProfileViewModal(otherUserData.id) }
                                ]);
                            }, 500);
                            const touchEndHandler = () => { clearTimeout(touchTimer); chatItem.removeEventListener('touchend', touchEndHandler); chatItem.removeEventListener('touchcancel', touchEndHandler); };
                            chatItem.addEventListener('touchend', touchEndHandler);
                            chatItem.addEventListener('touchcancel', touchEndHandler);
                        });

                        // Add checkbox for selection mode (already in template)
                        const checkbox = chatItem.querySelector('.chat-select-checkbox');
                        checkbox.addEventListener('change', (e) => handleChatSelection(chat.id, e.target.checked));
                    }

                    chatItem.dataset.chatId = chat.id;
                    chatItem.dataset.otherUserId = otherUserData.id;
                    chatItem.dataset.otherUserName = otherUserData.name;

                    chatItem.querySelector('.chat-avatar').textContent = otherUserData.avatarInitial;
                    chatItem.querySelector('.chat-name span').textContent = otherUserData.name;
                    chatItem.querySelector('.chat-preview').textContent = lastMessageText;
                    chatItem.querySelector('.chat-time').textContent = lastMessageTime;

                    const statusIndicator = chatItem.querySelector('.status-indicator');
                    updateStatusIndicatorUI(statusIndicator, otherUserStatus);

                    // Handle unread messages (increment if new message from other user)
                    const latestMsgTimestamp = chat.lastMessage?.timestamp?.toMillis() || 0;
                    // Only mark as unread if the message is from the other participant and it's newer than what we last saw
                    if (latestMsgTimestamp > (lastMessageTimestamps[chat.id] || 0) && chat.lastMessage?.senderId !== currentUser.uid) {
                        unreadCounts[chat.id] = (unreadCounts[chat.id] || 0) + 1;
                        chatItem.querySelector('.unread-badge').textContent = unreadCounts[chat.id];
                        chatItem.querySelector('.unread-badge').classList.remove('hidden');
                    } else { // No new unread messages or already read
                        chatItem.querySelector('.unread-badge').classList.add('hidden');
                        // Reset unread count if the latest message is from current user or older
                        if (chat.lastMessage?.senderId === currentUser.uid || latestMsgTimestamp <= (lastMessageTimestamps[chat.id] || 0)) {
                           unreadCounts[chat.id] = 0;
                        }
                    }
                    lastMessageTimestamps[chat.id] = latestMsgTimestamp; // Update last seen timestamp for this chat

                    // Update checkbox visibility based on `isChatSelectMode`
                    const checkboxContainer = chatItem.querySelector('.chat-select-container');
                    if (checkboxContainer) {
                        checkboxContainer.style.display = isChatSelectMode ? 'flex' : 'none';
                        // If exiting select mode, ensure checkboxes are unchecked
                        if (!isChatSelectMode) {
                            checkboxContainer.querySelector('.chat-select-checkbox').checked = false;
                            chatItem.classList.remove('selected'); // Remove selected class
                        } else if (selectedChatIds.has(chat.id)) {
                             chatItem.classList.add('selected'); // Add selected class if already selected
                        } else {
                             chatItem.classList.remove('selected');
                        }
                    }

                    fragment.appendChild(chatItem); // Add to fragment for batch update
                    processedChatIds.add(chat.id); // Mark as processed

                } else if (docChange.type === 'removed') {
                    if (chatItem) {
                        chatItem.remove();
                        currentChatItems.delete(chat.id); // Remove from our map
                        delete unreadCounts[chat.id]; // Clean up unread count
                        delete lastMessageTimestamps[chat.id]; // Clean up timestamp
                        selectedChatIds.delete(chat.id); // Remove from selected set if deleted
                        updateDeleteSelectedChatsButtonVisibility();
                    }
                }
            }

            // Remove any chat items that were previously there but are no longer in the snapshot
            Array.from(currentChatItems.keys()).forEach(id => {
                if (!processedChatIds.has(id)) {
                    currentChatItems.get(id).remove();
                    currentChatItems.delete(id);
                    selectedChatIds.delete(id); // Clean up selected set
                }
            });

            // Re-sort the list based on lastUpdated (to ensure newest chats are on top)
            const sortedItems = Array.from(fragment.children).filter(el => el.classList.contains('chat-item'))
                                    .sort((a, b) => {
                                        const chatA = snapshot.docs.find(doc => doc.id === a.dataset.chatId)?.data();
                                        const chatB = snapshot.docs.find(doc => doc.id === b.dataset.chatId)?.data();
                                        const timeA = chatA?.lastUpdated?.toMillis() || 0;
                                        const timeB = chatB?.lastUpdated?.toMillis() || 0;
                                        return timeB - timeA; // Descending order (newest first)
                                    });

            chatList.innerHTML = ''; // Clear existing list before appending sorted ones
            sortedItems.forEach(item => chatList.appendChild(item));
            console.log('Chat list updated and sorted.');

            if (chatList.children.length === 0) {
                chatList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 20px;">No chats yet. Click "+" to start a new conversation!</p>';
            }
            updateDeleteSelectedChatsButtonVisibility(); // Update button visibility after list update

        }, error => {
            console.error("Error loading chats:", error);
            if (chatList) chatList.innerHTML = '<p style="text-align: center; color: red; padding: 20px;">Error loading chats. Please try again.</p>';
        });
}

/**
 * Toggles chat selection mode.
 * Shows/hides checkboxes and the delete selected button.
 */
function toggleChatSelectMode() {
    isChatSelectMode = !isChatSelectMode;
    selectedChatIds.clear(); // Clear any selections when toggling mode
    const chatItems = chatList.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        const checkboxContainer = item.querySelector('.chat-select-container');
        if (checkboxContainer) {
            checkboxContainer.style.display = isChatSelectMode ? 'flex' : 'none';
            checkboxContainer.querySelector('.chat-select-checkbox').checked = false; // Uncheck all
            item.classList.remove('selected'); // Remove selected class
        }
    });
    updateDeleteSelectedChatsButtonVisibility();
    showAppMessage(isChatSelectMode ? 'Chat selection mode ON. Select chats to delete.' : 'Chat selection mode OFF.', true);
}

/**
 * Handles individual chat selection.
 * @param {string} chatId - The ID of the chat.
 * @param {boolean} isSelected - True if selected, false if unselected.
 */
function handleChatSelection(chatId, isSelected) {
    const chatItem = chatList.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
    if (isSelected) {
        selectedChatIds.add(chatId);
        if (chatItem) chatItem.classList.add('selected');
    } else {
        selectedChatIds.delete(chatId);
        if (chatItem) chatItem.classList.remove('selected');
    }
    updateDeleteSelectedChatsButtonVisibility();
}

/**
 * Updates the visibility of the "Delete Selected Chats" button.
 */
function updateDeleteSelectedChatsButtonVisibility() {
    if (deleteSelectedChatsBtn) {
        if (isChatSelectMode && selectedChatIds.size > 0) {
            deleteSelectedChatsBtn.style.display = 'flex'; // Use flex to center icon/text
            deleteSelectedChatsBtn.textContent = `Delete Selected (${selectedChatIds.size})`;
            deleteSelectedChatsBtn.prepend(document.createElement('i')).className = 'fas fa-trash-alt';
        } else {
            deleteSelectedChatsBtn.style.display = 'none';
        }
    }
}

/**
 * Deletes selected chats and their messages.
 */
async function deleteSelectedChats() {
    if (selectedChatIds.size === 0) {
        showAppMessage('No chats selected to delete.', false);
        return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedChatIds.size} selected chats and all their messages? This cannot be undone.`)) {
        return;
    }

    try {
        const batch = db.batch();
        for (const chatId of selectedChatIds) {
            const chatRef = db.collection('chats').doc(chatId);
            const messagesSnapshot = await chatRef.collection('messages').get();
            messagesSnapshot.docs.forEach(msgDoc => {
                batch.delete(msgDoc.ref);
            });
            batch.delete(chatRef);
        }
        await batch.commit();
        showAppMessage(`${selectedChatIds.size} chats deleted successfully!`, true);
        toggleChatSelectMode(); // Exit select mode after deletion
    } catch (error) {
        console.error('Error deleting selected chats:', error);
        showAppMessage('Failed to delete selected chats. Please check security rules.', false);
    }
}


// ===============================================
// 9. New Chat Modal Logic (Index Page Specific)
// ===============================================

/**
 * Fetches all registered users (excluding the current user) for the new chat modal.
 * Caches them in `allUsers` array.
 */
async function fetchAllUsers() {
    if (!currentUser || !modalUserList) {
        if (modalUserList) modalUserList.innerHTML = `<p style="text-align: center; color: #64748b; padding: 20px;">Please log in to see users.</p>`;
        return;
    }

    if (modalUserList) modalUserList.innerHTML = `<p style="text-align: center; color: #64748b; padding: 20px;">Loading users...</p>`;

    try {
        console.log('Fetching all users...');
        const snapshot = await db.collection('users').get();
        allUsers = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(user => user.id !== currentUser.uid);

        displayAllUsersInModal();
        console.log('All users fetched and cached:', allUsers.length, 'users.');
    }
    catch (error) {
        console.error('Error fetching all users:', error);
        if (modalUserList) modalUserList.innerHTML = `<p style="text-align: center; color: red; padding: 20px;">Error loading users. Please check console and Firebase rules.</p>`;
    }
}

/**
 * Displays users in the new chat modal, optionally filtering by search text.
 * @param {string} searchText - The text to filter users by (name or email).
 */
function displayAllUsersInModal(searchText = '') {
    if (!modalUserList) return;
    modalUserList.innerHTML = '';

    const filteredUsers = allUsers.filter(user =>
        (user.name && user.name.toLowerCase().includes(searchText.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchText.toLowerCase()))
    );

    if (filteredUsers.length === 0) {
        modalUserList.innerHTML = `<p style="text-align: center; color: #64748b; padding: 20px;">No users found.</p>`;
        return;
    }

    filteredUsers.forEach(user => {
        const userItem = document.createElement('div');
        userItem.classList.add('user-item');
        userItem.dataset.userId = user.id;

        userItem.innerHTML = `
            <div class="user-avatar">${getAvatarInitial(user.name)}</div>
            <div class="user-details">
                <h4>${user.name || user.email.split('@')[0]}</h4>
                <p>${user.email}</p>
            </div>
        `;
        // Add click listener to select/start chat
        userItem.addEventListener('click', () => startNewChat(user));
        // Add click listener to open profile view modal (for avatar)
        userItem.querySelector('.user-avatar').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent starting chat if avatar clicked
            openProfileViewModal(user.id);
        });
        // Add context menu for user items (right-click / long-press)
        userItem.addEventListener('contextmenu', (e) => {
            showContextMenu(e, [
                { label: 'View Profile', icon: 'user', action: () => openProfileViewModal(user.id) },
                { label: 'Start Chat', icon: 'comment-dots', action: () => startNewChat(user) }
            ]);
        });
        userItem.addEventListener('touchstart', (e) => {
            const touchTimer = setTimeout(() => {
                showContextMenu(e, [
                    { label: 'View Profile', icon: 'user', action: () => openProfileViewModal(user.id) },
                    { label: 'Start Chat', icon: 'comment-dots', action: () => startNewChat(user) }
                ]);
            }, 500);
            const touchEndHandler = () => { clearTimeout(touchTimer); userItem.removeEventListener('touchend', touchEndHandler); userItem.removeEventListener('touchcancel', touchEndHandler); };
            userItem.addEventListener('touchend', touchEndHandler);
            userItem.addEventListener('touchcancel', touchEndHandler);
        });

        modalUserList.appendChild(userItem);
    });
}

/**
 * Initiates a new chat or selects an existing one with a chosen user.
 * This function redirects to chat.html.
 * @param {Object} otherUser - The user object to start a chat with.
 */
async function startNewChat(otherUser) {
    if (!currentUser || !otherUser) {
        console.warn('Cannot start new chat: currentUser or otherUser is missing.');
        return;
    }

    try {
        console.log(`Attempting to start chat with ${otherUser.name} (${otherUser.id}).`);
        // Check if a chat already exists between these two users
        // Query for chats where current user is a participant
        const existingChatQuery = await db.collection('chats')
            .where('participants', 'array-contains', currentUser.uid)
            .get();

        let existingChat = null;
        existingChatQuery.forEach(doc => {
            const chatData = doc.data();
            if (chatData.participants.includes(otherUser.id)) {
                existingChat = { id: doc.id, ...chatData };
                return;
            }
        });

        if (existingChat) {
            console.log('Existing chat found, redirecting:', existingChat.id);
            window.location.href = `chat.html?chatId=${existingChat.id}&otherUserId=${otherUser.id}`;
        } else {
            console.log('Creating new chat with:', otherUser.name);
            const newChatRef = await db.collection('chats').add({
                participants: [currentUser.uid, otherUser.id],
                lastMessage: null, // No messages yet
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            window.location.href = `chat.html?chatId=${newChatRef.id}&otherUserId=${otherUser.id}`; // Corrected otherUserId
        }

        if (newChatModal) newChatModal.classList.add('hidden');
    } catch (error) {
        console.error('Error starting new chat:', error);
        showAppMessage('Failed to start chat. Please try again or check Firebase rules.', false);
    }
}


// ===============================================
// 10. Chat Page Logic (chat.html specific)
// ===============================================

/**
 * Sends a message (text or media) to Firestore.
 * @param {'text' | 'image' | 'video' | 'audio' | 'document'} type - The type of message.
 * @param {string} content - The text content for text messages, or mediaUrl for media messages.
 * @param {string} [fileName] - The original file name for media messages.
 */
async function sendMessageToFirestore(type, content, fileName = null) {
    if (!currentUser || !currentChatId) {
        console.warn('Cannot send message: User not logged in or no chat selected.');
        showAppMessage('Cannot send message. Please log in or select a chat.', false);
        return;
    }

    const messagesRef = db.collection('chats').doc(currentChatId).collection('messages');
    const chatRef = db.collection('chats').doc(currentChatId);

    const messageData = {
        senderId: currentUser.uid,
        type: type,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        readBy: [currentUser.uid], // Sender has read it
        starred: false
    };

    if (type === 'text') {
        messageData.text = content;
    } else { // Media messages
        messageData.mediaUrl = content;
        messageData.fileName = fileName;
    }

    try {
        await messagesRef.add(messageData);
        await chatRef.update({
            lastMessage: {
                senderId: currentUser.uid,
                type: type,
                text: type === 'text' ? content : `[${type.toUpperCase()}: ${fileName || 'file'}]`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            },
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Message (${type}) sent to chat ${currentChatId}.`);
    } catch (error) {
        console.error(`Error sending ${type} message:`, error);
        showAppMessage(`Failed to send ${type} message. Please check your internet and security rules.`, false);
        throw error; // Re-throw to allow calling function to handle (e.g., file upload failure)
    }
}

/**
 * Handles file selection and uploads to Firebase Storage.
 * Then sends a message with the media URL.
 * @param {File} file - The file to upload.
 */
async function sendFileMessage(file) {
    if (!currentUser || !currentChatId) {
        showAppMessage('Cannot send file: User not logged in or no chat selected.', false);
        return;
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
    if (file.size > MAX_FILE_SIZE) {
        showAppMessage('File size exceeds 50MB limit.', false);
        return;
    }

    // Determine file type for message
    let messageType = 'document';
    if (file.type.startsWith('image/')) {
        messageType = 'image';
    } else if (file.type.startsWith('video/')) {
        messageType = 'video';
    } else if (file.type.startsWith('audio/')) {
        messageType = 'audio';
    }

    // Add a temporary message to display upload progress
    const uploadMessageId = 'uploading-' + Date.now(); // Temporary ID for progress message
    const tempMessageElement = document.createElement('div');
    tempMessageElement.classList.add('message', 'sent', 'uploading-message');
    tempMessageElement.dataset.messageId = uploadMessageId;
    tempMessageElement.innerHTML = `
        <div class="message-bubble">
            <span class="upload-text">Uploading ${file.name} (0%)</span>
            <div class="upload-progress-bar"></div>
            <div class="message-meta">
                <div class="message-time">${formatTime(firebase.firestore.Timestamp.now())}</div>
            </div>
        </div>
    `;
    chatMessages.appendChild(tempMessageElement);
    scrollToBottom();


    const storageRef = storage.ref(`chat_media/${currentUser.uid}/${file.name}_${Date.now()}`);
    const uploadTask = storageRef.put(file);

    uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            const progressBar = tempMessageElement.querySelector('.upload-progress-bar');
            const uploadText = tempMessageElement.querySelector('.upload-text');
            if (progressBar) progressBar.style.width = progress + '%';
            if (uploadText) uploadText.textContent = `Uploading ${file.name} (${Math.round(progress)}%)`;
            console.log('Upload is ' + progress + '% done');
        },
        (error) => {
            console.error('Upload failed:', error);
            showAppMessage(`Failed to upload ${file.name}: ${error.message}`, false);
            if (tempMessageElement) tempMessageElement.remove(); // Remove temporary message
        },
        () => {
            // Upload completed successfully, get the download URL
            uploadTask.snapshot.ref.getDownloadURL().then(async (downloadURL) => {
                console.log('File available at', downloadURL);
                if (tempMessageElement) tempMessageElement.remove(); // Remove temporary message
                try {
                    await sendMessageToFirestore(messageType, downloadURL, file.name);
                    // showAppMessage(`${file.name} sent successfully!`, true); // Message will appear in chat naturally
                } catch (error) {
                    // Message sending failed after successful upload
                    console.error('Error sending message after upload:', error);
                    showAppMessage('File uploaded, but message sending failed.', false);
                }
            }).catch(error => {
                console.error('Error getting download URL:', error);
                showAppMessage(`Failed to get download URL for ${file.name}.`, false);
                if (tempMessageElement) tempMessageElement.remove();
            });
        }
    );
}


/**
 * Selects a chat and loads its messages on the chat.html page.
 * @param {string} chatId - The ID of the chat to select.
 * @param {Object} otherUserData - Data of the other participant in the chat.
 */
async function selectChat(chatId, otherUserData) {
    if (!currentUser || chatId === currentChatId) return;

    console.log('Selecting chat:', chatId, 'with user:', otherUserData.name);

    currentChatId = chatId;
    currentChatOtherUser = otherUserData;

    // Update chat header details
    if (welcomeScreen) welcomeScreen.classList.add('hidden');
    if (currentChatDetails) currentChatDetails.classList.remove('hidden');
    if (currentChatAvatar) currentChatAvatar.textContent = otherUserData.avatarInitial;
    if (currentChatNameSpan) currentChatNameSpan.textContent = otherUserData.name;

    // Set up profile view for chat partner's avatar/info click
    if (currentChatAvatar) {
        // Remove existing listener first to prevent duplicates
        const oldAvatar = currentChatAvatar;
        currentChatAvatar = oldAvatar.cloneNode(true);
        oldAvatar.parentNode.replaceChild(currentChatAvatar, oldAvatar);
        currentChatAvatar.addEventListener('click', () => openProfileViewModal(otherUserData.id));
    }
    if (currentChatNameSpan && currentChatNameSpan.closest('.chat-header-details')) {
        const oldHeaderDetails = currentChatNameSpan.closest('.chat-header-details');
        const newHeaderDetails = oldHeaderDetails.cloneNode(true);
        oldHeaderDetails.parentNode.replaceChild(newHeaderDetails, oldHeaderDetails);
        newHeaderDetails.addEventListener('click', () => openProfileViewModal(otherUserData.id));
        // Re-cache specific elements within the new header details
        currentChatNameSpan = newHeaderDetails.querySelector('#currentChatName span');
        currentChatHeaderStatusIndicator = newHeaderDetails.querySelector('#currentChatHeaderStatusIndicator');
        currentChatStatusP = newHeaderDetails.querySelector('#currentChatStatus');
        currentChatHeaderAvatarStatusIndicator = currentChatAvatar.querySelector('#currentChatHeaderAvatarStatusIndicator');
    }


    // Subscribe to other user's status for header (both avatar and name indicators)
    subscribeToOtherUserStatus(otherUserData.id, currentChatHeaderStatusIndicator, currentChatStatusP);
    if (currentChatHeaderAvatarStatusIndicator) updateStatusIndicatorUI(currentChatHeaderAvatarStatusIndicator, otherUserData.status || 'offline');

    if (chatMessages) chatMessages.innerHTML = '';
    if (typingIndicator) typingIndicator.classList.add('hidden');

    // Unsubscribe from previous chat's listeners
    if (unsubscribeFromMessages) unsubscribeFromMessages();
    if (unsubscribeFromChatTyping) unsubscribeFromChatTyping();
    if (chatOptionsMenu) chatOptionsMenu.classList.add('hidden');

    // Reset message selection mode if currently active
    if (isMessageSelectMode) toggleMessageSelectMode();

    // Listen for new messages in the selected chat
    let lastDisplayedDate = null; // To track last date for separators
    unsubscribeFromMessages = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp')
        .onSnapshot((snapshot) => {
            console.log('Messages snapshot received for chat:', chatId, 'Changes:', snapshot.docChanges().length);
            // Process changes to update/add/remove messages
            snapshot.docChanges().forEach(change => {
                const messageData = { id: change.doc.id, ...change.doc.data() };
                if (change.type === 'added') {
                    const formattedDate = formatDateForSeparator(messageData.timestamp);
                    // Add date separator if date changes or if it's the very first message displayed
                    if (lastDisplayedDate !== formattedDate || (chatMessages && chatMessages.children.length === 0)) {
                        displayDateSeparator(formattedDate);
                        lastDisplayedDate = formattedDate;
                    }
                    displayMessage(messageData);
                } else if (change.type === 'modified') {
                    // Find and update the existing message in DOM
                    const existingMessageElement = document.querySelector(`.message[data-message-id="${messageData.id}"]`);
                    if (existingMessageElement) {
                        // Update content based on type
                        let newContentHTML = '';
                        if (messageData.type === 'text') {
                            newContentHTML = messageData.text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
                        } else if (messageData.type === 'image') {
                            newContentHTML = `<img src="${messageData.mediaUrl}" alt="${messageData.fileName || 'Image'}" class="message-media-image" loading="lazy">`;
                        } else if (messageData.type === 'video') {
                            newContentHTML = `<video controls class="message-media-video"><source src="${messageData.mediaUrl}" type="video/*"></video>`;
                        } else if (messageData.type === 'audio') {
                            newContentHTML = `<audio controls class="message-media-audio"><source src="${messageData.mediaUrl}" type="audio/*"></audio>`;
                        } else if (messageData.type === 'document') {
                            newContentHTML = `
                                <div class="message-media-document">
                                    <i class="fas fa-file-alt"></i>
                                    <a href="${messageData.mediaUrl}" target="_blank" rel="noopener noreferrer">${messageData.fileName || 'Document'}</a>
                                </div>
                            `;
                        }
                        if (messageData.editedAt && messageData.type === 'text') { // Only text messages can be edited
                            newContentHTML += ' <span class="edited-label">(edited)</span>';
                        }
                        // Update the message bubble's inner HTML, preserving checkbox if present
                        const messageBubble = existingMessageElement.querySelector('.message-bubble');
                        const messageMeta = messageBubble.querySelector('.message-meta'); // Get meta element before clearing
                        messageBubble.innerHTML = newContentHTML; // Replace content
                        if (messageMeta) messageBubble.appendChild(messageMeta); // Re-append meta

                        // If message was starred/unstarred, update icon
                        let starIcon = messageBubble.querySelector('.message-meta .fa-star');
                        if (messageData.starred && !starIcon) {
                             const newStarIcon = document.createElement('i');
                             newStarIcon.className = 'fas fa-star starred';
                             messageMeta.prepend(newStarIcon); // Add to the left of time
                        } else if (!messageData.starred && starIcon) {
                             starIcon.remove();
                        }
                    }
                } else if (change.type === 'removed') {
                    const existingMessageElement = document.querySelector(`.message[data-message-id="${messageData.id}"]`);
                    if (existingMessageElement) {
                        existingMessageElement.remove();
                    }
                    selectedMessageIds.delete(messageData.id); // Clean up selected set
                    updateDeleteSelectedMessagesButtonVisibility();
                }
            });
            scrollToBottom();
        }, error => {
            console.error("Error loading messages:", error);
            showAppMessage("Failed to load messages. Please try again.");
        });

    // Listen for typing status in the selected chat (Realtime Database)
    const typingRef = rtdb.ref(`typing/${chatId}`);
    unsubscribeFromChatTyping = typingRef.on('value', (snapshot) => {
        const typingStatus = snapshot.val() || {};
        // Filter out current user's typing status
        const otherTypingUsers = Object.keys(typingStatus).filter(uid => uid !== currentUser.uid && typingStatus[uid]);

        if (otherTypingUsers.length > 0) {
            if (typingIndicator) typingIndicator.classList.remove('hidden');
            if (typingText) typingText.textContent = `${currentChatOtherUser.name} is typing...`; // Simplified to show only the other user
            scrollToBottom(); // Scroll to show typing indicator if it appears
        } else {
            if (typingIndicator) typingIndicator.classList.add('hidden');
        }
    }, (error) => {
        console.error("Error monitoring typing status:", error);
    });
    console.log(`Subscribed to typing status for chat: ${chatId}`);

    // Adjust visibility of elements based on mobile/desktop view
    if (isMobileView) {
        // On mobile, the sidebar is not present on chat.html, back button is shown
        if (backToSidebarBtn) backToSidebarBtn.style.display = 'block';
    } else {
        // On desktop, the sidebar is always present, back button is hidden
        if (backToSidebarBtn) backToSidebarBtn.style.display = 'none';
    }
}

/**
 * Toggles message selection mode.
 * Shows/hides checkboxes and the delete selected button.
 */
function toggleMessageSelectMode() {
    isMessageSelectMode = !isMessageSelectMode;
    selectedMessageIds.clear(); // Clear any selections when toggling mode
    const messages = chatMessages.querySelectorAll('.message');
    messages.forEach(item => {
        const checkboxContainer = item.querySelector('.message-select-container');
        if (checkboxContainer) {
            checkboxContainer.style.display = isMessageSelectMode ? 'flex' : 'none';
            checkboxContainer.querySelector('.message-select-checkbox').checked = false; // Uncheck all
            item.classList.remove('selected'); // Remove selected class
        }
    });
    updateDeleteSelectedMessagesButtonVisibility();
    showAppMessage(isMessageSelectMode ? 'Message selection mode ON. Select messages to delete.' : 'Message selection mode OFF.', true);
}

/**
 * Handles individual message selection.
 * @param {string} messageId - The ID of the message.
 * @param {boolean} isSelected - True if selected, false if unselected.
 */
function handleMessageSelection(messageId, isSelected) {
    const messageElement = chatMessages.querySelector(`.message[data-message-id="${messageId}"]`);
    if (isSelected) {
        selectedMessageIds.add(messageId);
        if (messageElement) messageElement.classList.add('selected');
    } else {
        selectedMessageIds.delete(messageId);
        if (messageElement) messageElement.classList.remove('selected');
    }
    updateDeleteSelectedMessagesButtonVisibility();
}

/**
 * Updates the visibility of the "Delete Selected Messages" button.
 */
function updateDeleteSelectedMessagesButtonVisibility() {
    if (deleteSelectedMessagesBtn) {
        if (isMessageSelectMode && selectedMessageIds.size > 0) {
            deleteSelectedMessagesBtn.style.display = 'flex'; // Use flex for centering
            deleteSelectedMessagesBtn.textContent = `Delete Selected (${selectedMessageIds.size})`;
            deleteSelectedMessagesBtn.prepend(document.createElement('i')).className = 'fas fa-trash-alt';
        } else {
            deleteSelectedMessagesBtn.style.display = 'none';
        }
    }
}

/**
 * Deletes selected messages from Firestore (if sender) or locally (if receiver).
 */
async function deleteSelectedMessages() {
    if (selectedMessageIds.size === 0) {
        showAppMessage('No messages selected to delete.', false);
        return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedMessageIds.size} selected messages?`)) {
        return;
    }

    const messagesToDeleteFromFirestore = [];
    const messagesToDeleteLocally = [];

    // Categorize messages based on sender
    selectedMessageIds.forEach(messageId => {
        const messageElement = chatMessages.querySelector(`.message[data-message-id="${messageId}"]`);
        if (messageElement) {
            // Check if it was a sent message (assuming 'sent' class correctly identifies sender)
            if (messageElement.classList.contains('sent')) {
                messagesToDeleteFromFirestore.push(messageId);
            } else {
                // If it's a received message, delete only locally
                messagesToDeleteLocally.push(messageId);
            }
        }
    });

    try {
        // Delete from Firestore (only messages sent by current user)
        if (messagesToDeleteFromFirestore.length > 0) {
            const batch = db.batch();
            messagesToDeleteFromFirestore.forEach(messageId => {
                batch.delete(db.collection('chats').doc(currentChatId).collection('messages').doc(messageId));
            });
            await batch.commit();
            console.log(`Deleted ${messagesToDeleteFromFirestore.length} sent messages from Firestore.`);
        }

        // Delete locally (messages received from others)
        messagesToDeleteLocally.forEach(messageId => {
            const messageElement = chatMessages.querySelector(`.message[data-message-id="${messageId}"]`);
            if (messageElement) messageElement.remove();
        });
        if (messagesToDeleteLocally.length > 0) {
            console.log(`Removed ${messagesToDeleteLocally.length} received messages locally.`);
        }

        showAppMessage(`Deleted ${selectedMessageIds.size} messages successfully!`, true);
        toggleMessageSelectMode(); // Exit select mode after deletion
    } catch (error) {
        console.error('Error deleting selected messages:', error);
        showAppMessage('Failed to delete selected messages. Please check security rules.', false);
    }
}


/**
 * Shares the current chat. Uses Web Share API if available, falls back to clipboard.
 */
async function shareCurrentChat() {
    if (!currentChatOtherUser) {
        showAppMessage('No chat selected to share.', false);
        return;
    }

    const shareData = {
        title: `Chat with ${currentChatOtherUser.name} on Chat Some`,
        text: `Hey, check out my chat with ${currentChatOtherUser.name} on Chat Some!`,
        url: window.location.href // Share the current chat URL
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
            console.log('Chat shared successfully via Web Share API.');
            showAppMessage('Chat shared!', true);
        } else {
            // Fallback for browsers that don't support Web Share API
            await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
            console.log('Chat link copied to clipboard.');
            showAppMessage('Chat link copied to clipboard!', true);
        }
    } catch (error) {
        console.error('Error sharing chat:', error);
        showAppMessage('Failed to share chat.', false);
    } finally {
        if (chatOptionsMenu) chatOptionsMenu.classList.remove('show');
    }
}


/**
 * Clears all messages in the current chat.
 */
async function clearChat() {
    if (!currentChatId || !confirm('Are you sure you want to clear all messages in this chat? This cannot be undone.')) {
        return;
    }
    try {
        const messagesRef = db.collection('chats').doc(currentChatId).collection('messages');
        const snapshot = await messagesRef.get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => { batch.delete(doc.ref); });
        await batch.commit();
        console.log(`All messages in chat ${currentChatId} cleared.`);
        showAppMessage('Chat history cleared!', true);
        if (chatMessages) chatMessages.innerHTML = '';
    } catch (error) {
        console.error('Error clearing chat history:', error);
        showAppMessage('Failed to clear chat history.');
    } finally {
        if (chatOptionsMenu) chatOptionsMenu.classList.remove('show');
    }
}

/**
 * Toggles the theme of the current chat background.
 */
function toggleTheme() {
    if (!chatMessages) return;
    const currentChatTheme = chatMessages.dataset.theme || 'default';
    let nextTheme;
    switch (currentChatTheme) {
        case 'default':
            nextTheme = 'theme-gradient';
            break;
        case 'theme-gradient':
            nextTheme = 'theme-dark';
            break;
        case 'theme-dark':
            nextTheme = 'default';
            break;
        default:
            nextTheme = 'theme-gradient'; // Fallback
    }
    chatMessages.classList.remove('theme-gradient', 'theme-dark');
    if (nextTheme !== 'default') {
        chatMessages.classList.add(nextTheme);
    }
    chatMessages.dataset.theme = nextTheme;
    console.log('Chat theme toggled to:', nextTheme);
    if (chatOptionsMenu) chatOptionsMenu.classList.remove('show');
    localStorage.setItem('chatTheme', nextTheme); // Store theme in localStorage to persist
}


/**
 * Placeholder for blocking a user.
 */
function blockUser() {
    if (currentChatOtherUser) {
        showAppMessage(`Block ${currentChatOtherUser.name} is a Work In Progress.`, false);
    }
    if (chatOptionsMenu) chatOptionsMenu.classList.remove('show');
}

/**
 * Placeholder for viewing shared media.
 * This function is now mostly illustrative as media is directly embedded.
 */
function viewSharedMedia() {
    showAppMessage('Viewing shared media is a Work In Progress. Currently, media is embedded directly in chat.', false);
    if (chatOptionsMenu) chatOptionsMenu.classList.remove('show');
}


/**
 * Displays a single message in the chat messages area.
 * @param {Object} message - The message object from Firestore (must contain 'id').
 */
function displayMessage(message) {
    if (!chatMessages) return;

    // Check if message already exists (to avoid duplicates on initial load or re-renders)
    if (document.querySelector(`.message[data-message-id="${message.id}"]`)) {
        return;
    }

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.dataset.messageId = message.id; // Store message ID for context menu ops

    let messageContentHtml = '';
    let messageBubbleContent = '';

    if (message.type === 'text') {
        // Make links clickable
        const textWithLinks = message.text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        messageBubbleContent = textWithLinks;
    } else if (message.type === 'image') {
        messageBubbleContent = `<img src="${message.mediaUrl}" alt="${message.fileName || 'Image'}" class="message-media-image" loading="lazy">`;
    } else if (message.type === 'video') {
        messageBubbleContent = `<video controls class="message-media-video"><source src="${message.mediaUrl}" type="video/*"></video>`;
    } else if (message.type === 'audio') {
        messageBubbleContent = `<audio controls class="message-media-audio"><source src="${message.mediaUrl}" type="audio/*"></audio>`;
    } else if (message.type === 'document') {
        messageBubbleContent = `
            <div class="message-media-document">
                <i class="fas fa-file-alt"></i>
                <a href="${message.mediaUrl}" target="_blank" rel="noopener noreferrer">${message.fileName || 'Document'}</a>
            </div>
        `;
    }

    if (message.editedAt && message.type === 'text') { // Only text messages can be edited
        messageBubbleContent += ' <span class="edited-label">(edited)</span>';
    }


    if (message.senderId === currentUser.uid) {
        messageElement.classList.add('sent');
        messageContentHtml = `
            <div class="message-bubble">
                ${messageBubbleContent}
                <div class="message-meta">
                    ${message.starred ? '<i class="fas fa-star starred"></i>' : ''}
                    <div class="message-time">${formatTime(message.timestamp)}</div>
                </div>
            </div>
        `;
    } else {
        messageElement.classList.add('received');
        messageContentHtml = `
            <div class="message-bubble">
                ${messageBubbleContent}
                <div class="message-meta">
                    ${message.starred ? '<i class="fas fa-star starred"></i>' : ''}
                    <div class="message-time">${formatTime(message.timestamp)}</div>
                </div>
            </div>
        `;
    }
    messageElement.innerHTML = messageContentHtml;

    // Add checkbox for selection mode
    const checkboxContainer = document.createElement('div');
    checkboxContainer.classList.add('message-select-container');
    checkboxContainer.innerHTML = `<input type="checkbox" class="message-select-checkbox">`;
    const checkbox = checkboxContainer.querySelector('.message-select-checkbox');
    checkbox.addEventListener('change', (e) => handleMessageSelection(message.id, e.target.checked));
    messageElement.prepend(checkboxContainer); // Add checkbox to the beginning of the message

    // Update checkbox visibility based on `isMessageSelectMode`
    if (checkboxContainer) {
        checkboxContainer.style.display = isMessageSelectMode ? 'flex' : 'none';
        // If exiting select mode, ensure checkboxes are unchecked
        if (!isMessageSelectMode) {
            checkboxContainer.querySelector('.message-select-checkbox').checked = false;
            messageElement.classList.remove('selected'); // Remove selected class
        } else if (selectedMessageIds.has(message.id)) {
            messageElement.classList.add('selected'); // Add selected class if already selected
        } else {
            messageElement.classList.remove('selected');
        }
    }


    // Add context menu listener for messages (right-click / long-press)
    messageElement.addEventListener('contextmenu', (e) => {
        const options = [];
        options.push(
            { label: message.starred ? 'Unstar Message' : 'Star Message', icon: 'star', action: (data) => starMessage(data.messageId, !data.starred), isDanger: false },
            { label: 'Reply', icon: 'reply', action: (data) => replyToMessage(data.messageText), isDanger: false },
            { label: 'Forward', icon: 'share', action: (data) => forwardMessage(data.messageId), isDanger: false },
            { label: 'Message Info', icon: 'info-circle', action: (data) => showMessageInfo(data.messageId), isDanger: false }
        );
        if (message.senderId === currentUser.uid) {
            if (message.type === 'text') { // Only text messages can be edited
                options.push({ label: 'Edit Message', icon: 'edit', action: (data) => editMessage(data.messageId, data.messageText), isDanger: false });
            }
            options.push({ label: 'Delete Message', icon: 'trash-alt', action: (data) => deleteMessage(data.messageId), isDanger: true });
        } else {
            options.push({ label: 'Delete For Me', icon: 'trash-alt', action: (data) => deleteMessageLocally(data.messageId), isDanger: true });
        }
        showContextMenu(e, options, { messageId: message.id, messageText: message.text, starred: message.starred, type: message.type });
    });
    messageElement.addEventListener('touchstart', (e) => {
        const touchTimer = setTimeout(() => {
            const options = [];
            options.push(
                { label: message.starred ? 'Unstar Message' : 'Star Message', icon: 'star', action: (data) => starMessage(data.messageId, !data.starred), isDanger: false },
                { label: 'Reply', icon: 'reply', action: (data) => replyToMessage(data.messageText), isDanger: false },
                { label: 'Forward', icon: 'share', action: (data) => forwardMessage(data.messageId), isDanger: false },
                { label: 'Message Info', icon: 'info-circle', action: (data) => showMessageInfo(data.messageId), isDanger: false }
            );
            if (message.senderId === currentUser.uid) {
                if (message.type === 'text') {
                    options.push({ label: 'Edit Message', icon: 'edit', action: (data) => editMessage(data.messageId, data.messageText), isDanger: false });
                }
                options.push({ label: 'Delete Message', icon: 'trash-alt', action: (data) => deleteMessage(data.messageId), isDanger: true });
            } else {
                options.push({ label: 'Delete For Me', icon: 'trash-alt', action: (data) => deleteMessageLocally(data.messageId), isDanger: true });
            }
            showContextMenu(e, options, { messageId: message.id, messageText: message.text, starred: message.starred, type: message.type });
        }, 500);
        const touchEndHandler = () => { clearTimeout(touchTimer); messageElement.removeEventListener('touchend', touchEndHandler); messageElement.removeEventListener('touchcancel', touchEndHandler); };
        messageElement.addEventListener('touchend', touchEndHandler);
        messageElement.addEventListener('touchcancel', touchEndHandler);
    });

    chatMessages.appendChild(messageElement);
}


/**
 * Displays a date separator in the chat messages area.
 * @param {string} dateText - The text to display for the date (e.g., "Today", "Yesterday").
 */
function displayDateSeparator(dateText) {
    if (!chatMessages) return;
    const separator = document.createElement('div');
    separator.classList.add('date-separator');
    separator.innerHTML = `<span>${dateText}</span>`;
    chatMessages.appendChild(separator);
}

/**
 * Edits a message in Firestore and updates UI.
 * @param {string} messageId - The ID of the message to edit.
 * @param {string} currentText - The current text of the message.
 */
async function editMessage(messageId, currentText) {
    if (!currentChatId) return;

    const newText = prompt('Edit your message:', currentText);
    if (newText && newText.trim() !== '' && newText.trim() !== currentText) {
        try {
            await db.collection('chats').doc(currentChatId).collection('messages').doc(messageId).update({
                text: newText.trim(),
                editedAt: firebase.firestore.FieldValue.serverTimestamp() // Add edited timestamp
            });
            console.log(`Message ${messageId} edited.`);
            showAppMessage('Message edited successfully!', true);
        } catch (error) {
            console.error('Error editing message:', error);
            showAppMessage('Failed to edit message. Check security rules.', false);
        }
    }
}

/**
 * Deletes a message from Firestore and updates UI (for sent messages).
 * @param {string} messageId - The ID of the message to delete.
 */
async function deleteMessage(messageId) {
    if (!currentChatId) return;

    if (!confirm('Are you sure you want to delete this message for everyone?')) {
        return;
    }

    try {
        await db.collection('chats').doc(currentChatId).collection('messages').doc(messageId).delete();
        console.log(`Message ${messageId} deleted from Firestore.`);
        showAppMessage('Message deleted successfully!', true);
    } catch (error) {
        console.error('Error deleting message:', error);
        showAppMessage('Failed to delete message. Check security rules.', false);
    }
}

/**
 * Deletes a message from the current user's view only (for received messages).
 * This doesn't actually delete from Firestore.
 * @param {string} messageId - The ID of the message to remove from UI.
 */
function deleteMessageLocally(messageId) {
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (messageElement) {
        messageElement.remove();
        console.log(`Message ${messageId} removed from UI (local delete).`);
        showAppMessage('Message removed from your view.', true);
    }
}

/**
 * Toggles the starred status of a message.
 * @param {string} messageId - The ID of the message to star/unstar.
 * @param {boolean} starStatus - True to star, false to unstar.
 */
async function starMessage(messageId, starStatus) {
    if (!currentChatId) return;
    try {
        await db.collection('chats').doc(currentChatId).collection('messages').doc(messageId).update({
            starred: starStatus
        });
        console.log(`Message ${messageId} starred status toggled to ${starStatus}.`);
        showAppMessage(`Message ${starStatus ? 'starred' : 'unstarred'}!`, true);
    } catch (error) {
        console.error('Error starring message:', error);
        showAppMessage('Failed to star/unstar message. Check security rules.', false);
    }
}

/**
 * Placeholder for replying to a message.
 * @param {string} messageText - The text of the message being replied to.
 */
function replyToMessage(messageText) {
    showAppMessage(`Functionality for 'Reply' is a Work In Progress. Would pre-fill input with quote/context for: "${messageText}".`, false);
    if (messageInput) {
        // Example: messageInput.value = `"${messageText}"\n`;
        // messageInput.focus();
        // updateMessageInputHeight();
    }
}

/**
 * Placeholder for forwarding a message.
 * @param {string} messageId - The ID of the message to forward.
 */
function forwardMessage(messageId) {
    showAppMessage(`Functionality for 'Forward' is a Work In Progress. Would open chat selection to forward message ID: ${messageId}.`, false);
}

/**
 * Placeholder for showing message info.
 * @param {string} messageId - The ID of the message to show info for.
 */
function showMessageInfo(messageId) {
    showAppMessage(`Functionality for 'Message Info' is a Work In Progress. Would show details like delivery/read receipts for message ID: ${messageId}.`, false);
}


// ===============================================
// 11. Typing Indicator Logic (Realtime Database)
// ===============================================

/**
 * Updates the current user's typing status in Realtime Database for the current chat.
 * Uses debouncing to prevent excessive updates.
 * @param {boolean} isTyping - True if the user is typing, false otherwise.
 */
function setTypingStatusRTDB(isTyping) {
    if (!currentUser || !currentChatId) return;

    const typingRef = rtdb.ref(`typing/${currentChatId}/${currentUser.uid}`);

    if (isTyping) {
        typingRef.set(true);
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            typingRef.remove()
                .then(() => console.log('Typing status cleared after timeout.'))
                .catch(e => console.error('Error clearing typing status after timeout:', e));
            typingTimer = null;
        }, TYPING_TIMEOUT_MS);
    } else {
        clearTimeout(typingTimer);
        typingTimer = null;
        typingRef.remove()
            .then(() => console.log('Typing status cleared manually.'))
            .catch(e => console.error('Error clearing typing status manually:', e));
    }
}

// ===============================================
// 12. Global Settings & Theme Logic (Shared)
//     This section is now minimal, mostly just applying theme.
//     Settings management moved to settings.js
// ===============================================

/**
 * Applies the global theme to the body element.
 * @param {string} themeName - 'light-theme' or 'dark-theme'.
 */
function applyGlobalTheme(themeName) {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(themeName);
    appTheme = themeName;
    localStorage.setItem('appTheme', themeName); // Persist

    // Note: Theme buttons for global settings are now handled by settings.js
    console.log('Global theme set to:', themeName);
}


// ===============================================
// 13. Profile View Modal (Shared Across Pages)
//     This modal is now primarily for viewing *other* users' profiles.
//     For current user's profile, it redirects to profile.html.
// ===============================================

// Close profile view modal
if (closeProfileViewModalBtn) {
    closeProfileViewModalBtn.addEventListener('click', () => {
        console.log("Close profile modal button clicked!");
        if (profileViewModal) {
            profileViewModal.classList.add('hidden');
        }
    });
}

/**
 * Opens the full-screen profile view modal for a given user.
 * @param {string} userId - The ID of the user whose profile to display.
 */
async function openProfileViewModal(userId) {
    if (!profileViewModal || !profileName || !profileEmail || !profileAvatar || !profileStatus || !profileStatusMessage || !profileJoined || !profileActions) {
        console.error("Profile modal DOM elements not found. Cannot open profile.");
        return;
    }

    // If it's the current user's profile, redirect to the dedicated page
    if (userId === currentUser.uid) {
        window.location.href = 'profile.html';
        return;
    }

    profileViewModal.classList.remove('hidden');
    profileName.textContent = 'Loading...';
    profileEmail.textContent = '';
    profileAvatar.textContent = '';
    profileStatus.textContent = '';
    profileStatusMessage.textContent = '';
    profileJoined.textContent = '';
    profileActions.innerHTML = ''; // Clear previous actions

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            profileAvatar.textContent = getAvatarInitial(userData.name);
            profileName.textContent = userData.name;
            profileEmail.textContent = userData.email;
            profileStatus.textContent = userData.status || 'Offline';
            profileStatusMessage.textContent = userData.statusMessage || 'No status message'; // Display status message
            profileJoined.textContent = userData.createdAt ? userData.createdAt.toDate().toLocaleDateString() : 'N/A';

            let statusIndicatorInProfileAvatar = profileAvatar.querySelector('.status-indicator');
            if (!statusIndicatorInProfileAvatar) {
                statusIndicatorInProfileAvatar = document.createElement('span');
                statusIndicatorInProfileAvatar.classList.add('status-indicator');
                profileAvatar.appendChild(statusIndicatorInProfileAvatar);
            }
            updateStatusIndicatorUI(statusIndicatorInProfileAvatar, userData.status);

            // Actions for OTHER users
            const startChatAction = document.createElement('button');
            startChatAction.classList.add('primary');
            startChatAction.textContent = 'Message';
            startChatAction.addEventListener('click', async () => {
                if (profileViewModal) profileViewModal.classList.add('hidden');
                // This logic redirects to chat.html with context
                const existingChat = (await db.collection('chats')
                                            .where('participants', 'array-contains', currentUser.uid)
                                            .get())
                                            .docs.find(doc => doc.data().participants.includes(userId));
                if (existingChat) {
                    window.location.href = `chat.html?chatId=${existingChat.id}&otherUserId=${userId}`;
                } else {
                    const newChatRef = await db.collection('chats').add({
                        participants: [currentUser.uid, userId],
                        lastMessage: null,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    window.location.href = `chat.html?chatId=${newChatRef.id}&otherUserId=${userId}`; // Corrected otherUserId
                }
            });
            profileActions.appendChild(startChatAction);

            const viewSharedMediaAction = document.createElement('button');
            viewSharedMediaAction.classList.add('secondary');
            viewSharedMediaAction.textContent = 'View Shared Media (WIP)';
            viewSharedMediaAction.addEventListener('click', () => showAppMessage('Shared media view is a Work In Progress.', false));
            profileActions.appendChild(viewSharedMediaAction);


        } else {
            profileName.textContent = 'User Not Found';
            profileEmail.textContent = 'N/A';
            profileAvatar.textContent = '?';
            profileStatus.textContent = 'Unknown';
            profileStatusMessage.textContent = 'User profile data could not be loaded.';
            profileJoined.textContent = 'N/A';
            const statusIndicatorInProfileAvatar = profileAvatar.querySelector('.status-indicator');
            if (statusIndicatorInProfileAvatar) statusIndicatorInProfileAvatar.remove(); // Remove indicator if user not found
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        profileName.textContent = 'Error Loading Profile';
        profileEmail.textContent = '';
        profileAvatar.textContent = '!';
        profileStatus.textContent = 'Error';
        profileStatusMessage.textContent = 'Failed to load user profile.';
        profileJoined.textContent = '';
        const statusIndicatorInProfileAvatar = profileAvatar.querySelector('.status-indicator');
        if (statusIndicatorInProfileAvatar) statusIndicatorInProfileAvatar.remove(); // Remove indicator on error
    }
}


// ===============================================
// 14. Mobile Responsiveness & Main Entry Point
// ===============================================

// Adjust isMobileView on resize
window.addEventListener('resize', () => {
    isMobileView = window.innerWidth <= 768;
    // Hide all menus when resizing
    hideContextMenu();
    if (chatOptionsMenu) chatOptionsMenu.classList.remove('show');
    if (moreOptionsMenu) moreOptionsMenu.classList.remove('show');
});

// Mobile back button for chat.html
if (backToSidebarBtn) { // This element only exists on chat.html
    backToSidebarBtn.addEventListener('click', () => {
        // This button is only active on mobile when on chat.html
        if (isMobileView) {
            // Before navigating, clean up chat-specific listeners and state
            if (unsubscribeFromMessages) unsubscribeFromMessages();
            if (unsubscribeFromChatTyping) unsubscribeFromChatTyping();

            // Clear any typing status for the current user in RTDB before leaving
            if (currentUser && currentUser.uid && currentChatId) {
                rtdb.ref(`typing/${currentChatId}/${currentUser.uid}`).remove().catch(e => console.error("Error clearing typing status on back:", e));
            }
            // Navigate back to the index page (chat list)
            window.location.href = 'index.html';
        }
    });
}

// Global DOMContentLoaded listener: Main entry point for all pages.
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cache all relevant DOM elements for the current page
    cacheDOMElements();

    // 2. Perform the initial authentication check and route accordingly.
    // This function will call the appropriate page-specific initialization logic.
    console.log('DOMContentLoaded: Starting auth check and routing...');
    // The `onAuthStateChanged` listener itself handles calling the page-specific
    // initialization logic once auth state and currentUserData are resolved.
});
