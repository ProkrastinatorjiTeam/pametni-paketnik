package com.example.paketnik_app

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.os.Bundle
import android.os.CountDownTimer
import android.util.Log
import android.view.Surface
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import kotlin.math.min

class FaceVerifyActivity : AppCompatActivity() {

    private lateinit var cameraExecutor: ExecutorService
    private lateinit var previewView: PreviewView
    private lateinit var textViewStatus: TextView
    private var imageCapture: ImageCapture? = null
    private var countDownTimer: CountDownTimer? = null
    private var physicalId: Int = -1

    private val COUNTDOWN_SECONDS = 3L
    private val IMAGE_TARGET_SIZE = 224 // Or another appropriate size for your model

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_face_verify)

        previewView = findViewById(R.id.previewViewFaceVerify)
        textViewStatus = findViewById(R.id.textViewStatusFaceVerify)
        cameraExecutor = Executors.newSingleThreadExecutor()

        physicalId = intent.getIntExtra("PHYSICAL_ID", -1)
        if (physicalId == -1) {
            Toast.makeText(this, "Error: Box ID not provided.", Toast.LENGTH_LONG).show()
            Log.e("FaceVerifyActivity", "PHYSICAL_ID not received in intent.")
            setResult(Activity.RESULT_CANCELED)
            finish()
            return
        }
        Log.d("FaceVerifyActivity", "Received PHYSICAL_ID: $physicalId")

        textViewStatus.text = "Initializing camera..."
        // Wait for the previewView to be laid out before starting the camera
        previewView.post { startCamera() }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }

            // Ensure display is available before accessing rotation
            val rotation = previewView.display?.rotation ?: Surface.ROTATION_0
            Log.d("FaceVerifyActivity", "PreviewView display rotation: $rotation")

            imageCapture = ImageCapture.Builder()
                .setTargetRotation(rotation) // Use the rotation
                .build()

            val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture)
                textViewStatus.text = "Camera ready."
                Log.d("FaceVerifyActivity", "Camera bound to lifecycle.")
                startCountdown()
            } catch (exc: Exception) {
                Log.e("FaceVerifyActivity", "Use case binding failed", exc)
                Toast.makeText(this, "Could not start camera.", Toast.LENGTH_SHORT).show()
                setResult(Activity.RESULT_CANCELED)
                finish()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun startCountdown() {
        textViewStatus.text = "Get ready..."
        Log.d("FaceVerifyActivity", "Starting countdown.")
        countDownTimer = object : CountDownTimer(COUNTDOWN_SECONDS * 1000, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                textViewStatus.text = "Position your face: ${millisUntilFinished / 1000 + 1}s"
            }

            override fun onFinish() {
                textViewStatus.text = "Capturing..."
                Log.d("FaceVerifyActivity", "Countdown finished. Capturing image.")
                captureImage()
            }
        }.start()
    }

    private fun captureImage() {
        val imageCapture = this.imageCapture
        if (imageCapture == null) {
            Log.e("FaceVerifyActivity", "ImageCapture is null, cannot capture image.")
            Toast.makeText(this@FaceVerifyActivity, "Camera error, cannot capture image.", Toast.LENGTH_SHORT).show()
            setResult(Activity.RESULT_CANCELED)
            finish()
            return
        }

        val photoFile = File(cacheDir, "face_verify_${System.currentTimeMillis()}.jpg")
        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()
        Log.d("FaceVerifyActivity", "Attempting to take picture. Output file: ${photoFile.absolutePath}")

        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
                    textViewStatus.text = "Processing image..."
                    Log.d("FaceVerifyActivity", "Photo capture succeeded: ${outputFileResults.savedUri}")
                    processAndSendImage(photoFile)
                }

                override fun onError(exception: ImageCaptureException) {
                    Log.e("FaceVerifyActivity", "Photo capture failed: ${exception.message}", exception)
                    Toast.makeText(this@FaceVerifyActivity, "Failed to capture image: ${exception.message}", Toast.LENGTH_LONG).show()
                    setResult(Activity.RESULT_CANCELED)
                    photoFile.delete()
                    finish()
                }
            }
        )
    }

    private fun processAndSendImage(imageFile: File) {
        Log.d("FaceVerifyActivity", "Processing image: ${imageFile.absolutePath}")
        try {
            val originalBitmap = BitmapFactory.decodeFile(imageFile.absolutePath)
            if (originalBitmap == null) {
                Log.e("FaceVerifyActivity", "Failed to decode bitmap from file: ${imageFile.absolutePath}")
                Toast.makeText(this, "Error processing image (decode failed).", Toast.LENGTH_SHORT).show()
                setResult(Activity.RESULT_CANCELED)
                imageFile.delete()
                finish()
                return
            }
            Log.d("FaceVerifyActivity", "Original bitmap decoded: ${originalBitmap.width}x${originalBitmap.height}")

            val processedBitmap = cropToSquareAndResizeBitmap(originalBitmap, IMAGE_TARGET_SIZE)
            Log.d("FaceVerifyActivity", "Processed bitmap: ${processedBitmap.width}x${processedBitmap.height}")
            if (originalBitmap != processedBitmap) { // Only recycle if it's a different instance
                originalBitmap.recycle()
            }


            val processedImageFile = File(cacheDir, "processed_${imageFile.name}")
            FileOutputStream(processedImageFile).use {
                processedBitmap.compress(Bitmap.CompressFormat.JPEG, 90, it)
            }
            Log.d("FaceVerifyActivity", "Processed image saved to: ${processedImageFile.absolutePath}")
            processedBitmap.recycle()

            sendImageForVerification(processedImageFile, imageFile)

        } catch (e: Exception) {
            Log.e("FaceVerifyActivity", "Error processing image: ${e.message}", e)
            Toast.makeText(this, "Error processing image.", Toast.LENGTH_SHORT).show()
            setResult(Activity.RESULT_CANCELED)
            imageFile.delete()
            finish()
        }
    }


    private fun cropToSquareAndResizeBitmap(sourceBitmap: Bitmap, targetSquareSize: Int): Bitmap {
        val originalWidth = sourceBitmap.width
        val originalHeight = sourceBitmap.height
        Log.d("FaceVerifyActivity", "Cropping: original ${originalWidth}x${originalHeight} to $targetSquareSize")

        val matrix = Matrix()
        // Front camera images are often mirrored, and might need rotation.
        // For now, we assume the image from ImageCapture is correctly oriented or
        // that the server handles minor orientation issues.
        // If specific rotation is needed, it should be applied here.
        // e.g. matrix.postRotate(degrees) or matrix.postScale(-1f, 1f) for mirroring

        val sideLength = min(originalWidth, originalHeight)
        val x = (originalWidth - sideLength) / 2
        val y = (originalHeight - sideLength) / 2

        Log.d("FaceVerifyActivity", "Cropping at x=$x, y=$y, sideLength=$sideLength")

        val croppedBitmap = Bitmap.createBitmap(sourceBitmap, x, y, sideLength, sideLength, matrix, true)
        Log.d("FaceVerifyActivity", "Cropped bitmap: ${croppedBitmap.width}x${croppedBitmap.height}")

        if (croppedBitmap.width == targetSquareSize && croppedBitmap.height == targetSquareSize) {
            Log.d("FaceVerifyActivity", "Cropped bitmap is already target size. No scaling needed.")
            return croppedBitmap // No need to scale if already correct size
        }

        val scaledBitmap = Bitmap.createScaledBitmap(croppedBitmap, targetSquareSize, targetSquareSize, true)
        Log.d("FaceVerifyActivity", "Scaled bitmap: ${scaledBitmap.width}x${scaledBitmap.height}")

        if (croppedBitmap != scaledBitmap && croppedBitmap != sourceBitmap) {
            croppedBitmap.recycle()
        }
        return scaledBitmap
    }


    // Method in FaceVerifyActivity.kt
    private fun sendImageForVerification(imageFileToSend: File, originalPhotoFile: File) {
        val userId = AuthManager.getUserId()
        if (userId == null) {
            Log.e("FaceVerifyActivity", "User ID is null. Cannot send image for verification.")
            Toast.makeText(this, "User ID not found. Please log in again.", Toast.LENGTH_LONG).show()
            cleanupFilesAndFinish(imageFileToSend, originalPhotoFile, false, physicalId)
            return
        }

        textViewStatus.text = "Verifying..."
        Log.d("FaceVerifyActivity", "Sending image for verification. User: $userId, File: ${imageFileToSend.name}")

        // Prepare user ID and image file for multipart request
        val userIdRequestBody = userId.toRequestBody("text/plain".toMediaTypeOrNull())
        val imageRequestBody = imageFileToSend.asRequestBody("image/jpeg".toMediaTypeOrNull())
        val imagePart = MultipartBody.Part.createFormData("image", imageFileToSend.name, imageRequestBody)

        // Make the API call to verify user via TwoFactorRetrofitClient
        TwoFactorRetrofitClient.instance.verifyUser(userIdRequestBody, imagePart)
            .enqueue(object : Callback<VerifyResponse> {
                override fun onResponse(call: Call<VerifyResponse>, response: Response<VerifyResponse>) {
                    // Handle server response for user verification
                    if (response.isSuccessful) {
                        val verifyResponse = response.body()
                        if (verifyResponse != null) {
                            Log.d("FaceVerifyActivity", "Verification response: is_match=${verifyResponse.is_match}, msg=${verifyResponse.message}")
                            if (verifyResponse.is_match) {
                                Toast.makeText(this@FaceVerifyActivity, "Verification successful!", Toast.LENGTH_SHORT).show()
                                cleanupFilesAndFinish(imageFileToSend, originalPhotoFile, true, physicalId)
                            } else {
                                Toast.makeText(this@FaceVerifyActivity, "Verification failed: ${verifyResponse.message ?: "Not a match"}", Toast.LENGTH_LONG).show()
                                cleanupFilesAndFinish(imageFileToSend, originalPhotoFile, false, physicalId)
                            }
                        } else {
                            Log.e("FaceVerifyActivity", "Verification API success but empty response body.")
                            Toast.makeText(this@FaceVerifyActivity, "Verification failed: Empty response.", Toast.LENGTH_LONG).show()
                            cleanupFilesAndFinish(imageFileToSend, originalPhotoFile, false, physicalId)
                        }
                    } else {
                        val errorBody = response.errorBody()?.string()
                        Log.e("FaceVerifyActivity", "Verification API error: ${response.code()} - $errorBody")
                        Toast.makeText(this@FaceVerifyActivity, "Verification failed: Server error ${response.code()}", Toast.LENGTH_LONG).show()
                        cleanupFilesAndFinish(imageFileToSend, originalPhotoFile, false, physicalId)
                    }
                }

                override fun onFailure(call: Call<VerifyResponse>, t: Throwable) {
                    // Handle network failure for user verification
                    Log.e("FaceVerifyActivity", "Verification network error: ${t.message}", t)
                    Toast.makeText(this@FaceVerifyActivity, "Network error: ${t.message}", Toast.LENGTH_LONG).show()
                    cleanupFilesAndFinish(imageFileToSend, originalPhotoFile, false, physicalId)
                }
            })
    }

    private fun cleanupFilesAndFinish(processedFile: File, originalFile: File, isMatch: Boolean, currentPhysicalId: Int) {
        Log.d("FaceVerifyActivity", "Cleaning up files. Processed: ${processedFile.path}, Original: ${originalFile.path}, isMatch: $isMatch, physicalId: $currentPhysicalId")
        val processedDeleted = processedFile.delete()
        Log.d("FaceVerifyActivity", "Processed file deleted: $processedDeleted")
        if (originalFile.exists() && originalFile.absolutePath != processedFile.absolutePath) {
            val originalDeleted = originalFile.delete()
            Log.d("FaceVerifyActivity", "Original file deleted: $originalDeleted")
        }

        val resultIntent = Intent()
        resultIntent.putExtra("IS_MATCH", isMatch)
        resultIntent.putExtra("PHYSICAL_ID", currentPhysicalId)
        setResult(if (isMatch) Activity.RESULT_OK else Activity.RESULT_CANCELED, resultIntent)
        Log.d("FaceVerifyActivity", "Setting result: ${if (isMatch) "OK" else "CANCELED"} with physicalId $currentPhysicalId and finishing.")
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d("FaceVerifyActivity", "onDestroy called.")
        cameraExecutor.shutdown()
        countDownTimer?.cancel()
    }
}