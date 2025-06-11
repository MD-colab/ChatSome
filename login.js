// login.js

import { auth } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Get DOM elements
const authScreen = document.getElementById('authScreen');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle'); // Added this line
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
const authBtn = document.getElementById('authBtn');
const authSwitchBtn = document.getElementById('authSwitchBtn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const authMessage = document.getElementById('authMessage');

let isLoginMode = true; // State to track if we are in login or signup mode

// Function to update UI based on mode (Login/Signup)
function updateAuthUI() {
    if (isLoginMode) {
        authTitle.textContent = 'Login to Chat Some';
        authSubtitle.textContent = 'Access your account or create a new one to chat with friends!';
        authBtn.textContent = 'Login';
        authSwitchBtn.innerHTML = "Don't have an account? <u>Sign Up</u>";
        confirmPasswordGroup.style.display = 'none';
        confirmPasswordInput.removeAttribute('required');
    } else {
        authTitle.textContent = 'Sign Up for Chat Some';
        authSubtitle.textContent = 'Create a new account to get started chatting!';
        authBtn.textContent = 'Sign Up';
        authSwitchBtn.innerHTML = "Already have an account? <u>Login</u>";
        confirmPasswordGroup.style.display = 'block';
        confirmPasswordInput.setAttribute('required', 'required');
    }
    authMessage.style.display = 'none'; // Hide message when switching modes
    emailInput.value = ''; // Clear inputs
    passwordInput.value = '';
    confirmPasswordInput.value = '';
}

// Function to display messages
function showAuthMessage(message, type = 'error') {
    authMessage.textContent = message;
    authMessage.style.display = 'block';
    authMessage.style.background = type === 'error' ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 0, 0.2)';
    authMessage.style.color = type === 'error' ? '#ffdddd' : '#ddffdd';
}

// Event Listener for Auth Button (Login/Signup)
authBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!email || !password) {
        showAuthMessage('Please enter both email and password.');
        return;
    }

    if (!isLoginMode && password !== confirmPassword) {
        showAuthMessage('Passwords do not match.');
        return;
    }

    authBtn.disabled = true; // Disable button during request
    authMessage.style.display = 'none'; // Clear previous messages

    try {
        if (isLoginMode) {
            // Login
            await signInWithEmailAndPassword(auth, email, password);
            // Redirection will be handled by onAuthStateChanged
        } else {
            // Sign Up
            await createUserWithEmailAndPassword(auth, email, password);
            // Redirection will be handled by onAuthStateChanged
        }
    } catch (error) {
        console.error("Auth error:", error);
        let errorMessage = 'An unknown error occurred.';
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Invalid email format.';
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                errorMessage = 'Incorrect email or password.';
                break;
            case 'auth/email-already-in-use':
                errorMessage = 'Email already registered. Try logging in.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password should be at least 6 characters.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password authentication is not enabled. Please check Firebase console.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection.';
                break;
            default:
                errorMessage = error.message;
                break;
        }
        showAuthMessage(errorMessage);
    } finally {
        authBtn.disabled = false; // Re-enable button
    }
});

// Event Listener for Google Sign-in Button
googleSignInBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    googleSignInBtn.disabled = true;
    authMessage.style.display = 'none';

    try {
        await signInWithPopup(auth, provider);
        // Redirection will be handled by onAuthStateChanged
    } catch (error) {
        console.error("Google Sign-in error:", error);
        let errorMessage = 'Failed to sign in with Google.';
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Google sign-in popup was closed.';
        } else if (error.code === 'auth/cancelled-popup-request') {
            errorMessage = 'Another Google sign-in request is already in progress.';
        } else if (error.code === 'auth/operation-not-allowed') {
             errorMessage = 'Google Sign-in is not enabled. Please check Firebase console.';
        } else if (error.code === 'auth/account-exists-with-different-credential') {
            errorMessage = 'Account already exists with a different sign-in method. Please use your existing method.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Please check your internet connection.';
        }
        showAuthMessage(errorMessage);
    } finally {
        googleSignInBtn.disabled = false;
    }
});


// Event Listener for Auth Switch Button
authSwitchBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    updateAuthUI();
});

// Firebase Authentication State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User signed in on login.html. Redirecting to index.html...");
        authScreen.classList.add('hidden');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    } else {
        console.log("User signed out or not logged in on login.html.");
        authScreen.classList.remove('hidden');
        updateAuthUI();
    }
});

updateAuthUI();