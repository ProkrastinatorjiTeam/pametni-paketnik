package com.example.paketnik_app

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

object AuthManager {
    private const val PREFS_NAME = "auth_prefs"
    private const val TOKEN_KEY = "jwt_token"
    private const val USER_ID_KEY = "user_id" // Added key for userId

    private var prefs: SharedPreferences? = null

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun setToken(token: String) {
        prefs?.edit()?.putString(TOKEN_KEY, token)?.apply()
    }

    fun getToken(): String? {
        return prefs?.getString(TOKEN_KEY, null)
    }

    // Function to save userId
    fun setUserId(userId: String) {
        prefs?.edit()?.putString(USER_ID_KEY, userId)?.apply()
    }

    // Function to retrieve userId
    fun getUserId(): String? {
        return prefs?.getString(USER_ID_KEY, null)
    }

    fun isLoggedIn(): Boolean {
        return getToken() != null
    }

    fun logout() {
        prefs?.edit {
            remove(TOKEN_KEY)
            remove(USER_ID_KEY) // Clear userId on logout
        }
    }
}