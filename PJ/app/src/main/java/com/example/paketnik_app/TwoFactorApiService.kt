package com.example.paketnik_app

import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

interface TwoFactorApiService {
    // API endpoint to update user's face images
    @Multipart
    @POST("user/updateImages")
    fun updateImages(
        @Part("userId") userId: RequestBody,
        @Part images: List<MultipartBody.Part>
    ): Call<ResponseBody>

    // API endpoint to verify user's face against a single image
    @Multipart
    @POST("user/verify")
    fun verifyUser(
        @Part("userId") userId: RequestBody,
        @Part image: MultipartBody.Part
    ): Call<VerifyResponse>
}

// Data class for the response from the /user/verify endpoint
data class VerifyResponse(
    val is_match: Boolean,
    val message: String?
)