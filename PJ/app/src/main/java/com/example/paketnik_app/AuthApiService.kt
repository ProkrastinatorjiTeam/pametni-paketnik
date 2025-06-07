package com.example.paketnik_app

import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApiService {
    @POST("user/login")
    fun loginUser(@Body request: LoginRequest): Call<LoginResponse>

    @POST("user/register")
    fun registerUser(@Body request: RegisterRequest): Call<RegisterResponse>

    @POST("box/check-access")
    fun openBox(@Body body: Map<String, Int>): Call<OpenBoxResponse>

    @POST("unlockevent/create")
    fun createUnlock(@Body request: UnlockRequest): Call<Void>
}

data class UnlockRequest(
    val boxId: String,
    val success: Boolean
)

data class OpenBoxResponse(val success: Boolean, val boxId: String)