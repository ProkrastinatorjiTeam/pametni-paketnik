package com.example.paketnik_app

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object TwoFactorRetrofitClient {
    // Base URL for the 2FA server
    private const val BASE_URL = "https://face.id.fl0rijan.freemyip.com"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    // Interceptor to add JWT Authorization token to 2FA API requests
    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val builder = original.newBuilder()

        AuthManager.getToken()?.let { token ->
            builder.addHeader("Authorization", "Bearer $token")
        }

        val request = builder.build()
        chain.proceed(request)
    }

    // OkHttpClient setup with authentication and logging interceptors
    private val client = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(loggingInterceptor)
        .build()

    // Lazily initialized Retrofit instance for the TwoFactorApiService
    val instance: TwoFactorApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(TwoFactorApiService::class.java)
    }
}