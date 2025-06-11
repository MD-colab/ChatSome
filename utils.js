// utils.js
// This file contains general utility functions used across the application.
// It relies on the global 'firebase' object provided by the compat SDKs.

/**
 * Generates avatar initials from a name.
 * @param {string} name - The user's name.
 * @returns {string} The first letter(s) of the name in uppercase, or '?' if name is empty.
 */
export function getAvatarInitial(name) {
    if (!name) return '?';
    const words = name.split(' ');
    if (words.length > 1) {
        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
}

/**
 * Formats a Firestore Timestamp to a human-readable time string.
 * @param {object} timestamp - The Firestore timestamp object.
 * @returns {string} Formatted time string (e.g., "10:30 AM").
 */
export function formatTime(timestamp) {
    if (!timestamp || !timestamp.toDate) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Formats a Firestore Timestamp to a date string for message separators.
 * @param {object} timestamp - The Firestore timestamp object.
 * @returns {string} Formatted date string (e.g., "Today", "Yesterday", "MMM DD, YYYY").
 */
export function formatDateForSeparator(timestamp) {
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
export function showAppMessage(message, isSuccess = false) {
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

/**
 * Sets the loading state for a button.
 * @param {HTMLElement} button - The button element.
 * @param {boolean} isLoading - True to show loading, false for normal state.
 * @param {string} originalText - The original text of the button.
 */
export function setButtonLoading(button, isLoading, originalText) {
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
 * @param {HTMLElement} chatMessagesElement - The chat messages container.
 */
export function scrollToBottom(chatMessagesElement) {
    if (!chatMessagesElement) return;
    requestAnimationFrame(() => {
        chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
    });
}

/**
 * Updates the UI for a user's status indicator.
 * @param {HTMLElement} indicatorElement - The status indicator span element.
 * @param {string} status - The status ('online', 'away', 'offline').
 */
export function updateStatusIndicatorUI(indicatorElement, status) {
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
 * Displays a generic context menu.
 * @param {MouseEvent | TouchEvent} event - The event that triggered the context menu.
 * @param {Array<Object>} options - An array of {label, icon, action, isDanger} objects.
 * @param {Object} [data] - Optional data to pass to actions (e.g., messageId, userId).
 * @param {HTMLElement} contextMenuElement - The context menu DOM element.
 */
export function showContextMenu(event, options, data = {}, contextMenuElement) {
    if (!contextMenuElement) return; // Ensure contextMenu element exists
    event.preventDefault(); // Prevent default browser context menu
    event.stopPropagation(); // Stop propagation to prevent document click from closing immediately

    // Clear existing options
    contextMenuElement.querySelector('ul').innerHTML = '';

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
            hideContextMenu(contextMenuElement);
        });
        contextMenuElement.querySelector('ul').appendChild(li);
    });

    // Position the menu
    // Adjust position to stay within viewport
    let x = event.clientX;
    let y = event.clientY;

    contextMenuElement.classList.add('show'); // Temporarily show to get dimensions
    const menuWidth = contextMenuElement.offsetWidth;
    const menuHeight = contextMenuElement.offsetHeight;
    contextMenuElement.classList.remove('show'); // Hide again

    if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10; // 10px margin
    }
    if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10; // 10px margin
    }
    // Ensure it doesn't go off screen to the left/top
    x = Math.max(0, x);
    y = Math.max(0, y);


    contextMenuElement.style.left = `${x}px`;
    contextMenuElement.style.top = `${y}px`;
    contextMenuElement.classList.add('show');
}

/**
 * Hides the generic context menu.
 * @param {HTMLElement} contextMenuElement - The context menu DOM element.
 */
export function hideContextMenu(contextMenuElement) {
    if (contextMenuElement) {
        contextMenuElement.classList.remove('show');
    }
}

/**
 * Adjusts the height of the message input textarea to fit its content.
 * @param {HTMLElement} messageInput - The message input textarea.
 */
export function updateMessageInputHeight(messageInput) {
    if (!messageInput) return;
    messageInput.style.height = 'auto'; // Reset height
    messageInput.style.height = messageInput.scrollHeight + 'px'; // Set to scroll height
}

/**
 * Applies the global theme to the body element and updates theme buttons.
 * @param {string} themeName - 'light-theme' or 'dark-theme'.
 * @param {HTMLElement} [lightBtn] - Optional light theme button element to update active state.
 * @param {HTMLElement} [darkBtn] - Optional dark theme button element to update active state.
 */
export function applyGlobalTheme(themeName, lightBtn = null, darkBtn = null) {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(themeName);
    localStorage.setItem('appTheme', themeName); // Persist

    if (lightBtn && darkBtn) {
        lightBtn.classList.toggle('active', themeName === 'light-theme');
        darkBtn.classList.toggle('active', themeName === 'dark-theme');
    }
    console.log('Global theme set to:', themeName);
}

/**
 * Manages all Firebase listeners (Firestore and Realtime Database).
 * Call this before logging out or when navigating away from a page that uses many listeners.
 * @param {Array<Function>} unsubscribeFunctions - An array of unsubscribe functions to call.
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {object} rtdbInstance - The Firebase Realtime Database instance (e.g., `firebase.database()`).
 * @param {string} [currentChatId] - The ID of the currently active chat, if any.
 */
export function unsubscribeAllListeners(unsubscribeFunctions, currentUser, rtdbInstance, currentChatId = null) {
    console.log('Unsubscribing all active listeners...');
    if (unsubscribeFunctions && Array.isArray(unsubscribeFunctions)) {
        unsubscribeFunctions.forEach(unsub => {
            if (typeof unsub === 'function') {
                unsub();
            }
        });
    }

    // Also, clear RTDB onDisconnect for the current user if logged out.
    if (currentUser && currentUser.uid && rtdbInstance) {
        rtdbInstance.ref(`/status/${currentUser.uid}`).onDisconnect().cancel();
        // Also clear any typing status for the current user in RTDB upon logout
        if (currentChatId) {
             rtdbInstance.ref(`typing/${currentChatId}/${currentUser.uid}`).remove();
        }
        console.log(`RTDB onDisconnect canceled and typing status cleared for ${currentUser.uid}.`);
    }
    console.log('All Firebase listeners unsubscribed and cleaned up.');
}

/**
 * Global logout function.
 * @param {object} authInstance - The Firebase Auth instance (e.g., `firebase.auth()`).
 * @param {object} rtdbInstance - The Firebase Realtime Database instance (e.g., `firebase.database()`).
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {string} [currentChatId] - The ID of the currently active chat, if any (for clearing typing status).
 */
export async function globalLogout(authInstance, rtdbInstance, currentUser, currentChatId = null) {
    try {
        if (currentUser && currentUser.uid && rtdbInstance) {
            // Explicitly set offline status in RTDB immediately on logout
            await rtdbInstance.ref(`/status/${currentUser.uid}`).set({
                status: 'offline',
                last_changed: firebase.database.ServerValue.TIMESTAMP
            });
            // Cancel any onDisconnect hook
            rtdbInstance.ref(`/status/${currentUser.uid}`).onDisconnect().cancel();
            // Clear typing status if applicable
            if (currentChatId) {
                rtdbInstance.ref(`typing/${currentChatId}/${currentUser.uid}`).remove();
            }
            console.log(`RTDB status explicitly set to offline for ${currentUser.uid} before logout.`);
        }

        await authInstance.signOut();
        console.log('User initiated logout successfully.');
        // Ensure redirection happens after logout
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        showAppMessage('Failed to logout. Please try again.');
    }
}

// Expose these utility functions globally for direct use in HTML files and for app.js/dots.js
// This replaces the module import system for simplicity with compat SDKs.
window.getAvatarInitial = getAvatarInitial;
window.formatTime = formatTime;
window.formatDateForSeparator = formatDateForSeparator;
window.showAppMessage = showAppMessage;
window.setButtonLoading = setButtonLoading;
window.scrollToBottom = scrollToBottom;
window.updateStatusIndicatorUI = updateStatusIndicatorUI;
window.showContextMenu = showContextMenu;
window.hideContextMenu = hideContextMenu;
window.updateMessageInputHeight = updateMessageInputHeight;
window.applyGlobalTheme = applyGlobalTheme;
window.unsubscribeAllListeners = unsubscribeAllListeners;
window.logout = globalLogout; // Rename for global access (was globalLogout)

console.log('Utils loaded.');