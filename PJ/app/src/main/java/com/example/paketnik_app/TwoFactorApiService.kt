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
        @Part("userId") userId: RequestBody, // Added userId part
        @Part images: List<MultipartBody.Part>
    ): Call<ResponseBody>
}