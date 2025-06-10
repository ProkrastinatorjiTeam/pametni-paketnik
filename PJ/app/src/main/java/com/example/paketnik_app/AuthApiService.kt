package com.example.paketnik_app

import com.google.gson.annotations.SerializedName
import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.GET
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

    @GET("user/history")
    fun getUnlockHistory(): Call<UnlockHistoryResponse>
}

data class UnlockRequest(
    val boxId: String,
    val success: Boolean
)

data class OpenBoxResponse(val success: Boolean, val boxId: String)

data class UnlockEvent(
    @SerializedName("_id") val id: String,
    val user: String,
    val box: String,
    val success: Boolean,
    val timestamp: String,
    @SerializedName("__v") val version: Int
)

data class UnlockHistoryResponse(
    val message: String,
    val unlockEvents: List<UnlockEvent>
)