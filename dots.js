document.addEventListener('DOMContentLoaded', () => {
    // Index Page Elements (if present)
    const moreOptionsBtn = document.getElementById('moreOptionsBtn');
    const moreOptionsMenu = document.getElementById('moreOptionsMenu');
    const selectChatsBtn = document.getElementById('selectChatsBtn');
    const settingsFromIndexBtn = document.getElementById('settingsBtn');
    const logoutFromIndexBtn = document.getElementById('logoutBtn');
    const deleteSelectedChatsBtn = document.getElementById('deleteSelectedChatsBtn');

    // Chat Page Elements (if present)
    const chatOptionsBtn = document.getElementById('chatOptionsBtn');
    const chatOptionsMenu = document.getElementById('chatOptionsMenu');
    const selectMessagesBtn = document.getElementById('selectMessagesBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const toggleThemeBtn = document.getElementById('toggleThemeBtn');
    const shareChatBtn = document.getElementById('shareChatBtn');
    const blockUserBtn = document.getElementById('blockUserBtn');
    const viewSharedMediaBtn = document.getElementById('viewSharedMediaBtn');
    const deleteSelectedMessagesBtn = document.getElementById('deleteSelectedMessagesBtn');

    // ==============================================
    // Index Page "More Options" Menu
    // ==============================================
    if (moreOptionsBtn && moreOptionsMenu) {
        moreOptionsBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent document click from closing it immediately
            moreOptionsMenu.classList.toggle('show');
        });

        if (selectChatsBtn) {
            selectChatsBtn.addEventListener('click', () => {
                // Assuming app.js exposes this function globally
                if (window.toggleChatSelectMode) {
                    window.toggleChatSelectMode();
                    moreOptionsMenu.classList.remove('show');
                } else {
                    window.showAppMessage('App logic not fully loaded for chat selection.', false);
                }
            });
        }

        if (settingsFromIndexBtn) {
            settingsFromIndexBtn.addEventListener('click', () => {
                window.location.href = 'settings.html'; // Redirect to dedicated settings page
                moreOptionsMenu.classList.remove('show');
            });
        }

        if (logoutFromIndexBtn) {
            logoutFromIndexBtn.addEventListener('click', () => {
                if (window.logout) { // Assuming app.js exposes global logout
                    window.logout();
                    moreOptionsMenu.classList.remove('show');
                } else {
                    window.showAppMessage('App logic not fully loaded for logout.', false);
                }
            });
        }

        if (deleteSelectedChatsBtn) {
            deleteSelectedChatsBtn.addEventListener('click', () => {
                if (window.deleteSelectedChats) {
                    window.deleteSelectedChats();
                } else {
                    window.showAppMessage('App logic not fully loaded for deleting chats.', false);
                }
            });
        }
    }

    // ==============================================
    // Chat Page "Chat Options" Menu
    // ==============================================
    if (chatOptionsBtn && chatOptionsMenu) {
        chatOptionsBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent document click from closing it immediately
            chatOptionsMenu.classList.toggle('show');
        });

        if (selectMessagesBtn) {
            selectMessagesBtn.addEventListener('click', () => {
                if (window.toggleMessageSelectMode) { // Assuming app.js exposes this function
                    window.toggleMessageSelectMode();
                    chatOptionsMenu.classList.remove('show');
                } else {
                    window.showAppMessage('App logic not fully loaded for message selection.', false);
                }
            });
        }

        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => {
                if (window.clearChat) { // Assuming app.js exposes this function
                    window.clearChat();
                    chatOptionsMenu.classList.remove('show');
                } else {
                    window.showAppMessage('App logic not fully loaded for clearing chat.', false);
                }
            });
        }

        if (toggleThemeBtn) {
            toggleThemeBtn.addEventListener('click', () => {
                if (window.toggleTheme) { // Assuming app.js exposes this function
                    window.toggleTheme();
                    chatOptionsMenu.classList.remove('show');
                } else {
                    window.showAppMessage('App logic not fully loaded for toggling theme.', false);
                }
            });
        }

        if (shareChatBtn) {
            shareChatBtn.addEventListener('click', () => {
                if (window.shareCurrentChat) { // Assuming app.js exposes this function
                    window.shareCurrentChat();
                    chatOptionsMenu.classList.remove('show');
                } else {
                    window.showAppMessage('App logic not fully loaded for sharing chat.', false);
                }
            });
        }

        if (blockUserBtn) {
            blockUserBtn.addEventListener('click', () => {
                if (window.blockUser) { // Assuming app.js exposes this function
                    window.blockUser();
                    chatOptionsMenu.classList.remove('show');
                } else {
                    window.showAppMessage('App logic not fully loaded for blocking user.', false);
                }
            });
        }

        if (viewSharedMediaBtn) {
            viewSharedMediaBtn.addEventListener('click', () => {
                if (window.viewSharedMedia) { // Assuming app.js exposes this function
                    window.viewSharedMedia();
                    chatOptionsMenu.classList.remove('show');
                } else {
                    window.showAppMessage('App logic not fully loaded for viewing shared media.', false);
                }
            });
        }

        if (deleteSelectedMessagesBtn) {
            deleteSelectedMessagesBtn.addEventListener('click', () => {
                if (window.deleteSelectedMessages) {
                    window.deleteSelectedMessages();
                } else {
                    window.showAppMessage('App logic not fully loaded for deleting messages.', false);
                }
            });
        }
    }

    // Global click listener to hide menus if clicked outside
    document.addEventListener('click', (event) => {
        if (moreOptionsMenu && moreOptionsMenu.classList.contains('show') && !moreOptionsMenu.contains(event.target) && (!moreOptionsBtn || !moreOptionsBtn.contains(event.target))) {
            moreOptionsMenu.classList.remove('show');
        }
        if (chatOptionsMenu && chatOptionsMenu.classList.contains('show') && !chatOptionsMenu.contains(event.target) && (!chatOptionsBtn || !chatOptionsBtn.contains(event.target))) {
            chatOptionsMenu.classList.remove('show');
        }
    });

});