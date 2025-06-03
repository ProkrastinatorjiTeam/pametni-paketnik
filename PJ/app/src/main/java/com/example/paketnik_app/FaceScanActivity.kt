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
import android.graphics.BitmapFactory

class FaceScanActivity : AppCompatActivity() {

    private lateinit var cameraExecutor: ExecutorService
    private lateinit var previewView: PreviewView
    private var videoCapture: VideoCapture<Recorder>? = null
    private lateinit var outputDirectory: File

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_face_scan)

        previewView = findViewById(R.id.previewView)
        cameraExecutor = Executors.newSingleThreadExecutor()

        // Create output directory for images in internal storage
        outputDirectory = File(cacheDir, "FaceScanImages").apply {
            if (!exists()) mkdirs()
        }

        startCamera()
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)

        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val preview = androidx.camera.core.Preview.Builder().build()
            val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

            preview.setSurfaceProvider(previewView.surfaceProvider)

            val recorder = Recorder.Builder()
                .setQualitySelector(QualitySelector.from(Quality.HD))
                .build()

            videoCapture = VideoCapture.withOutput(recorder)

            cameraProvider.unbindAll()
            cameraProvider.bindToLifecycle(
                this,
                cameraSelector,
                preview,
                videoCapture
            )

            startRecording()
        }, ContextCompat.getMainExecutor(this))
    }

    private fun startRecording() {
        val videoCapture = this.videoCapture ?: return

        val contentValues = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, "face_scan_video")
            put(MediaStore.MediaColumns.MIME_TYPE, "video/mp4")
        }

        val mediaStoreOutputOptions = MediaStoreOutputOptions.Builder(
            contentResolver,
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI
        ).setContentValues(contentValues).build()

        val recording = videoCapture.output
            .prepareRecording(this, mediaStoreOutputOptions)
            .start(ContextCompat.getMainExecutor(this)) { event ->
                if (event is VideoRecordEvent.Finalize) {
                    if (event.hasError()) {
                        Log.e("FaceScanActivity", "Video recording error: ${event.error}")
                    } else {
                        Toast.makeText(this, "Face scan complete!", Toast.LENGTH_SHORT).show()

                        // Extract frames from the video URI
                        val videoUri = event.outputResults.outputUri
                        val framePaths = extractFramesFromVideo(videoUri)

                        // Pass frame paths to RegisterActivity
                        val resultIntent = Intent()
                        resultIntent.putStringArrayListExtra("FRAME_PATHS", ArrayList(framePaths))
                        setResult(Activity.RESULT_OK, resultIntent)
                        finish()
                    }
                }
            }

        Executors.newSingleThreadScheduledExecutor().schedule({
            recording.stop()
        }, 5, TimeUnit.SECONDS)
    }

    private fun extractFramesFromVideo(videoUri: Uri): List<String> {
        val framePaths = mutableListOf<String>()
        val mediaMetadataRetriever = MediaMetadataRetriever()
        mediaMetadataRetriever.setDataSource(this, videoUri)

        val videoLengthInMs = mediaMetadataRetriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLong() ?: 0
        val frameRate = 3 // Capture 3 frame per second
        val interval = 1000 / frameRate

        var currentMs = 0L
        var frameIndex = 0
        while (currentMs < videoLengthInMs) {
            var bitmap = mediaMetadataRetriever.getFrameAtTime(currentMs * 1000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
            bitmap?.let {
                val resizedBitmap = resizeBitmap(it, 100, 100)
                val framePath = saveFrameAsImage(resizedBitmap, frameIndex++)
                framePaths.add(framePath)
            }
            currentMs += interval
        }
        mediaMetadataRetriever.release()
        return framePaths
    }

    private fun resizeBitmap(bitmap: Bitmap, width: Int, height: Int): Bitmap {
        return Bitmap.createScaledBitmap(bitmap, width, height, false)
    }

    private fun saveFrameAsImage(bitmap: Bitmap, frameIndex: Int): String {
        val file = File(outputDirectory, "frame_$frameIndex.jpg")
        FileOutputStream(file).use {
            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, it)
        }
        Log.d("FaceScanActivity", "Saved frame: ${file.absolutePath}")
        return file.absolutePath
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }
}