package com.example.paketnik_app

import android.content.ContentValues
import android.content.Intent
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.camera.video.*
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import android.app.Activity
// import android.graphics.BitmapFactory // BitmapFactory was imported but not used directly

class FaceScanActivity : AppCompatActivity() {

    private lateinit var cameraExecutor: ExecutorService
    private lateinit var previewView: PreviewView
    private var videoCapture: VideoCapture<Recorder>? = null
    private lateinit var outputDirectory: File // Used for saving frames

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_face_scan)

        previewView = findViewById(R.id.previewView)
        cameraExecutor = Executors.newSingleThreadExecutor()

        // Output directory for images in internal cache
        outputDirectory = File(cacheDir, "FaceScanImages").apply {
            if (!exists()) mkdirs() else {
                // Clean up old frames from previous scans in this session if directory exists
                listFiles()?.forEach { it.delete() }
            }
        }

        startCamera()
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)

        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val preview = androidx.camera.core.Preview.Builder().build()
            // Use front camera for face scan
            val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

            preview.setSurfaceProvider(previewView.surfaceProvider)

            val recorder = Recorder.Builder()
                .setQualitySelector(QualitySelector.from(Quality.HD)) // Or SD for smaller video files
                .build()

            videoCapture = VideoCapture.withOutput(recorder)

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    this,
                    cameraSelector,
                    preview,
                    videoCapture
                )
                startRecording()
            } catch (exc: Exception) {
                Log.e("FaceScanActivity", "Use case binding failed", exc)
                Toast.makeText(this, "Could not start camera.", Toast.LENGTH_SHORT).show()
                finish()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun startRecording() {
        val videoCapture = this.videoCapture ?: return

        val contentValues = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, "face_scan_video_${System.currentTimeMillis()}")
            put(MediaStore.MediaColumns.MIME_TYPE, "video/mp4")
            // Storing in app's cache directory for easier management and cleanup
            // put(MediaStore.MediaColumns.RELATIVE_PATH, "Movies/PaketnikApp") // Example for public storage
        }

        // Using a file in cache for the video to avoid issues with MediaStore and permissions for temporary files
        val videoFile = File(cacheDir, "temp_face_scan.mp4")

        val outputFileOptions = FileOutputOptions.Builder(videoFile).build()


        val recording = videoCapture.output
            .prepareRecording(this, outputFileOptions) // Changed to outputFileOptions
            .start(ContextCompat.getMainExecutor(this)) { event ->
                when (event) {
                    is VideoRecordEvent.Start -> {
                        Toast.makeText(this, "Recording started...", Toast.LENGTH_SHORT).show()
                    }
                    is VideoRecordEvent.Finalize -> {
                        if (event.hasError()) {
                            Log.e("FaceScanActivity", "Video recording error: ${event.error} - ${event.cause?.message}")
                            Toast.makeText(this, "Video recording failed.", Toast.LENGTH_SHORT).show()
                            setResult(Activity.RESULT_CANCELED) // Indicate failure
                        } else {
                            Toast.makeText(this, "Face scan complete! Processing...", Toast.LENGTH_SHORT).show()
                            val videoUri = event.outputResults.outputUri
                            Log.d("FaceScanActivity", "Video saved to: $videoUri")

                            // Extract frames from the video URI
                            // The URI from FileOutputOptions is a file URI, which is good for MediaMetadataRetriever
                            val framePaths = extractFramesFromVideo(videoUri)

                            // Pass frame paths back to the calling activity
                            val resultIntent = Intent()
                            resultIntent.putStringArrayListExtra("FRAME_PATHS", ArrayList(framePaths))
                            setResult(Activity.RESULT_OK, resultIntent)
                        }
                        videoFile.delete() // Clean up the temporary video file
                        finish() // Finish FaceScanActivity after processing
                    }
                }
            }

        // Stop recording after 5 seconds
        Executors.newSingleThreadScheduledExecutor().schedule({
            recording.stop()
        }, 5, TimeUnit.SECONDS)
    }

    private fun extractFramesFromVideo(videoUri: Uri): List<String> {
        val framePaths = mutableListOf<String>()
        val mediaMetadataRetriever = MediaMetadataRetriever()
        try {
            // Using 'this' (Context) and Uri for setDataSource
            mediaMetadataRetriever.setDataSource(this, videoUri)

            val videoLengthInMs = mediaMetadataRetriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLong() ?: 0
            if (videoLengthInMs == 0L) {
                Log.e("FaceScanActivity", "Video duration is 0 or could not be read.")
                return framePaths
            }

            val frameRate = 3 // Capture 3 frames per second
            val interval = 1000L / frameRate // Interval in milliseconds

            var currentMs = 0L
            var frameIndex = 0
            // Loop for the duration of the video, extracting frames at specified intervals
            while (currentMs < videoLengthInMs) {
                // getFrameAtTime expects microseconds
                val bitmap = mediaMetadataRetriever.getFrameAtTime(currentMs * 1000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                bitmap?.let {
                    val resizedBitmap = resizeBitmap(it, 100, 100) // Resizing to 100x100
                    val framePath = saveFrameAsImage(resizedBitmap, frameIndex++)
                    framePaths.add(framePath)
                    it.recycle() // Recycle original bitmap
                    resizedBitmap.recycle() // Recycle resized bitmap if not needed anymore by saveFrameAsImage
                }
                currentMs += interval
            }
        } catch (e: Exception) {
            Log.e("FaceScanActivity", "Error extracting frames: ${e.message}", e)
            Toast.makeText(this, "Error processing video frames.", Toast.LENGTH_SHORT).show()
        } finally {
            mediaMetadataRetriever.release()
        }
        Log.d("FaceScanActivity", "Extracted ${framePaths.size} frames.")
        return framePaths
    }

    private fun resizeBitmap(bitmap: Bitmap, width: Int, height: Int): Bitmap {
        return Bitmap.createScaledBitmap(bitmap, width, height, true) // Using filter 'true' for better quality
    }

    private fun saveFrameAsImage(bitmap: Bitmap, frameIndex: Int): String {
        // Ensure outputDirectory is initialized and exists
        if (!outputDirectory.exists()) {
            outputDirectory.mkdirs()
        }
        val file = File(outputDirectory, "frame_$frameIndex.jpg")
        try {
            FileOutputStream(file).use {
                bitmap.compress(Bitmap.CompressFormat.JPEG, 90, it)
            }
            Log.d("FaceScanActivity", "Saved frame: ${file.absolutePath}")
            return file.absolutePath
        } catch (e: Exception) {
            Log.e("FaceScanActivity", "Error saving frame: ${e.message}", e)
            // Return an empty string or handle error appropriately if saving fails
            return ""
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        // Clean up cached images when activity is destroyed if they are no longer needed
        // outputDirectory.listFiles()?.forEach { it.delete() }
        // outputDirectory.delete()
        // Consider cleanup strategy: maybe clean up in MainActivity after successful upload
    }
}