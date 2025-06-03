package com.example.paketnik_app

import okhttp3.MultipartBody
import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

interface TwoFactorApiService {
    @Multipart
    @POST("user/updateImages") // Your specified endpoint
    fun updateImages(@Part images: List<MultipartBody.Part>): Call<ResponseBody> // Using ResponseBody for a generic response
}

// You might want a more specific response class later, e.g.:
// data class UpdateImagesResponse(val success: Boolean, val message: String)