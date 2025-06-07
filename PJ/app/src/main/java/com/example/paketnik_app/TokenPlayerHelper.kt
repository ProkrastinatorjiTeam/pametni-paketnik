package com.example.paketnik_app

import android.content.Context
import android.media.MediaPlayer
import android.util.Base64
import android.util.Log
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.*
import java.util.zip.ZipInputStream

object TokenPlayerHelper {
    private val client = OkHttpClient()

    fun openBoxAndPlayToken(
        context: Context,
        boxId: String,
        tokenFormat: Int = 2,
        apiUrl: String = "https://api-d4me-stage.direct4.me/sandbox/v1/Access/openbox"
    ) {
        val json = JSONObject().apply {
            put("boxId", boxId)
            put("tokenFormat", tokenFormat)
        }

        val body = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url(apiUrl)
            .addHeader("Authorization", "Bearer 9ea96945-3a37-4638-a5d4-22e89fbc998f")
            .post(body)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("TokenHelper", "API call failed: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                if (!response.isSuccessful) {
                    Log.e("TokenHelper", "API call error: ${response.code}")
                    return
                }

                val responseJson = JSONObject(response.body?.string() ?: "{}")
                val base64Data = responseJson.optString("data")

                if (base64Data.isEmpty()) {
                    Log.e("TokenHelper", "No data found in response")
                    return
                }

                try {
                    val decodedBytes = Base64.decode(base64Data, Base64.DEFAULT)
                    val zipFile = File(context.cacheDir, "token.zip")
                    zipFile.writeBytes(decodedBytes)

                    val outputDir = File(context.cacheDir, "unzipped_token").apply { mkdirs() }
                    unzip(zipFile, outputDir)

                    val wavFile = outputDir.listFiles()?.firstOrNull { it.extension == "wav" }
                    if (wavFile != null) {
                        android.os.Handler(android.os.Looper.getMainLooper()).post {
                            playAndCleanup(context, wavFile, zipFile, outputDir)
                        }
                    } else {
                        Log.e("TokenHelper", "No .wav file found in unzipped data.")
                    }
                } catch (e: Exception) {
                    Log.e("TokenHelper", "Error decoding or processing token: ${e.message}")
                }
            }
        })
    }

    private fun unzip(zipFile: File, targetDir: File) {
        ZipInputStream(FileInputStream(zipFile)).use { zis ->
            var entry = zis.nextEntry
            while (entry != null) {
                val outFile = File(targetDir, entry.name)
                FileOutputStream(outFile).use { fos ->
                    zis.copyTo(fos)
                }
                zis.closeEntry()
                entry = zis.nextEntry
            }
        }
    }

    private fun playAndCleanup(context: Context, wavFile: File, zipFile: File, tempDir: File) {
        val mediaPlayer = MediaPlayer().apply {
            setDataSource(wavFile.absolutePath)
            isLooping = true
            prepare()
            start()
        }

        val alertDialog = android.app.AlertDialog.Builder(context)
            .setTitle("Playing Token")
            .setMessage("Token is being played. Close this dialog to stop.")
            .setCancelable(false)
            .setPositiveButton("Stop") { dialog, _ ->
                mediaPlayer.stop()
                mediaPlayer.release()
                wavFile.delete()
                zipFile.delete()
                deleteDirectory(tempDir)
                dialog.dismiss()
            }
            .create()

        android.os.Handler(android.os.Looper.getMainLooper()).post {
            alertDialog.show()
        }
    }

    private fun deleteDirectory(dir: File) {
        if (dir.isDirectory) {
            dir.listFiles()?.forEach { deleteDirectory(it) }
        }
        dir.delete()
    }
}