package com.example.paketnik_app

import android.app.Application

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AuthManager.init(this)
    }
}