package com.example.paketnik_app

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object TwoFactorRetrofitClient {
    // For Android emulator, 10.0.2.2 typically maps to your host machine's localhost
    private const val BASE_URL = "http://192.168.1.18:3002/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    // Reusing the concept of an auth interceptor to send the JWT token
    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val builder = original.newBuilder()

        AuthManager.getToken()?.let { token ->
            builder.addHeader("Authorization", "Bearer $token")
        }

        val request = builder.build()
        chain.proceed(request)
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(authInterceptor) // Add the auth interceptor
        .addInterceptor(loggingInterceptor)
        .build()

    val instance: TwoFactorApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(TwoFactorApiService::class.java)
    }
}