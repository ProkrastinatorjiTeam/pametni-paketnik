package com.example.paketnik_app

import okhttp3.CookieJar
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.net.CookieManager
import java.net.CookiePolicy
import okhttp3.JavaNetCookieJar // Import JavaNetCookieJar

object AuthRetrofitClient {
    private const val BASE_URL = "https://api.fl0rijan.freemyip.com/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val builder = original.newBuilder()

        AuthManager.getToken()?.let { token ->
            builder.addHeader("Authorization", "Bearer $token")
        }

        val request = builder.build()
        chain.proceed(request)
    }

    // CookieJar for session management
    private val cookieManager = CookieManager().apply {
        setCookiePolicy(CookiePolicy.ACCEPT_ALL)
    }
    private val cookieJar: CookieJar = JavaNetCookieJar(cookieManager)

    private val client = OkHttpClient.Builder()
        .cookieJar(cookieJar) // Added CookieJar
        .addInterceptor(authInterceptor)
        .addInterceptor(loggingInterceptor)
        .build()

    val instance: AuthApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AuthApiService::class.java)
    }
}