/**
 * AuthManager - Handles authentication state management with localStorage
 * with comprehensive error handling for all storage operations
 */
export const AuthManager = {
    // List of subscribers/listeners
    listeners: [],

    /**
     * Safe localStorage setItem with error handling
     * @param {string} key - Storage key
     * @param {string} value - Value to store
     * @returns {boolean} - Success status
     */
    safeSetItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error(`[AuthManager] Failed to set item "${key}":`, error);
            
            // Handle specific error types
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                console.warn('[AuthManager] localStorage quota exceeded. Attempting to clear old data...');
                this.handleQuotaExceeded();
                // Try once more after clearing
                try {
                    localStorage.setItem(key, value);
                    return true;
                } catch (retryError) {
                    console.error('[AuthManager] Retry failed after quota cleanup:', retryError);
                    return false;
                }
            }
            return false;
        }
    },

    /**
     * Safe localStorage getItem with error handling
     * @param {string} key - Storage key
     * @returns {string|null} - Stored value or null
     */
    safeGetItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.error(`[AuthManager] Failed to get item "${key}":`, error);
            return null;
        }
    },

    /**
     * Safe localStorage removeItem with error handling
     * @param {string} key - Storage key
     * @returns {boolean} - Success status
     */
    safeRemoveItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`[AuthManager] Failed to remove item "${key}":`, error);
            return false;
        }
    },

    /**
     * Safe JSON parse with error handling
     * @param {string} data - JSON string to parse
     * @param {*} fallback - Fallback value if parse fails
     * @returns {*} - Parsed object or fallback
     */
    safeJSONParse(data, fallback = null) {
        if (!data) return fallback;
        try {
            return JSON.parse(data);
        } catch (error) {
            console.error('[AuthManager] Failed to parse JSON:', error);
            return fallback;
        }
    },

    /**
     * Handle QuotaExceededError by clearing old/inactive data
     */
    handleQuotaExceeded() {
        try {
            // Get all keys
            const keys = Object.keys(localStorage);
            
            // Define keys that should NEVER be cleared
            const protectedKeys = ['pte_user_data', 'pte_auth_token', 'pte_refresh_token'];
            
            // Clear non-protected keys that might be old/expired
            keys.forEach(key => {
                if (!protectedKeys.includes(key)) {
                    try {
                        // Check if value is old (you can add expiry logic here)
                        localStorage.removeItem(key);
                    } catch (e) {
                        // Ignore removal errors
                    }
                }
            });
            
            console.log('[AuthManager] Cleaned up old localStorage items');
        } catch (error) {
            console.error('[AuthManager] Failed to handle quota exceeded:', error);
        }
    },

    /**
     * Get user from localStorage with error handling
     * @returns {Object|null} - User object or null
     */
    getUser() {
        const data = this.safeGetItem('pte_user_data');
        if (!data) return null;
        return this.safeJSONParse(data, null);
    },

    /**
     * Set user with error handling
     * @param {Object|null} user - User object or null
     * @returns {boolean} - Success status
     */
    setUser(user) {
        if (user) {
            try {
                const jsonData = JSON.stringify(user);
                return this.safeSetItem('pte_user_data', jsonData);
            } catch (error) {
                console.error('[AuthManager] Failed to stringify user data:', error);
                return false;
            }
        } else {
            return this.safeRemoveItem('pte_user_data');
        }
    },

    /**
     * Update state and notify listeners with comprehensive error handling
     * @param {Object|null} user - User object or null
     * @returns {Object} - Result with success status and optional error
     */
    updateState(user) {
        try {
            // Validate user data before storing
            if (user && typeof user !== 'object') {
                console.error('[AuthManager] Invalid user data type:', typeof user);
                return { success: false, error: 'Invalid user data type' };
            }

            // Attempt to store/remove user data
            const storageSuccess = this.setUser(user);
            
            if (!storageSuccess) {
                console.error('[AuthManager] Storage operation failed');
                // Still notify listeners even if storage fails (fallback to memory only)
                this.notify(user);
                return { 
                    success: false, 
                    error: 'Storage operation failed, but state updated in memory',
                    fallback: true 
                };
            }

            // Notify all subscribers about the change
            this.notify(user);
            
            // If user is cleared, also clear other auth-related data
            if (!user) {
                this.clearAuthData();
            }

            return { success: true };
        } catch (error) {
            console.error('[AuthManager] Error in updateState:', error);
            // Emergency fallback - still try to notify even if storage fails
            try {
                this.notify(user);
            } catch (notifyError) {
                console.error('[AuthManager] Failed to notify listeners:', notifyError);
            }
            return { 
                success: false, 
                error: error.message || 'Unknown error in updateState',
                fallback: true 
            };
        }
    },

    /**
     * Clear all authentication related data
     * @returns {boolean} - Success status
     */
    clearAuthData() {
        try {
            const keys = ['pte_user_data', 'pte_auth_token', 'pte_refresh_token', 'pte_session_id'];
            let allSuccess = true;
            
            keys.forEach(key => {
                if (!this.safeRemoveItem(key)) {
                    allSuccess = false;
                }
            });
            
            return allSuccess;
        } catch (error) {
            console.error('[AuthManager] Failed to clear auth data:', error);
            return false;
        }
    },

    /**
     * Subscribe to auth state changes
     * @param {Function} callback - Callback function to execute on state change
     * @returns {Function} - Unsubscribe function
     */
    subscribe(callback) {
        if (typeof callback !== 'function') {
            console.error('[AuthManager] Invalid callback function');
            return () => {};
        }
        
        this.listeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    },

    /**
     * Notify all subscribers with error handling
     * @param {Object|null} user - User object or null
     */
    notify(user) {
        if (!this.listeners.length) return;
        
        this.listeners.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('[AuthManager] Error in subscriber callback:', error);
                // Continue with other listeners
            }
        });
    },

    /**
     * Initialize AuthManager - try to restore session
     * @returns {Object|null} - Restored user or null
     */
    init() {
        try {
            const user = this.getUser();
            if (user) {
                console.log('[AuthManager] Session restored successfully');
                this.notify(user);
                return user;
            }
            return null;
        } catch (error) {
            console.error('[AuthManager] Failed to initialize:', error);
            return null;
        }
    },

    /**
     * Check if localStorage is available
     * @returns {boolean} - localStorage availability
     */
    isStorageAvailable() {
        try {
            const testKey = '__auth_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }
};

// Add this line to expose AuthManager to the browser's global scope
if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
}

export default AuthManager;