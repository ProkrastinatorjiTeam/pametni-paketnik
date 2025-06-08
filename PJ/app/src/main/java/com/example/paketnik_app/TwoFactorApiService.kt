package com.example.paketnik_app

import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

interface TwoFactorApiService {
    @Multipart
    @POST("user/updateImages")
    fun updateImages(
        @Part("userId") userId: RequestBody,
        @Part images: List<MultipartBody.Part>
    ): Call<ResponseBody>

    @Multipart
    @POST("user/verify") // New endpoint
    fun verifyUser(
        @Part("userId") userId: RequestBody,
        @Part image: MultipartBody.Part // Single image for verification
    ): Call<VerifyResponse>
}

// New data class for the /user/verify response
data class VerifyResponse(
    val is_match: Boolean,
    val message: String? // Optional message from the server
)