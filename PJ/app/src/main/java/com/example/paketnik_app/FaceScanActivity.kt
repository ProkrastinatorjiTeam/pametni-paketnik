package com.example.paketnik_app

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Bundle
import android.os.CountDownTimer
import android.provider.MediaStore
import android.util.Log
import android.widget.TextView // Added import
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.*
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.math.min

class FaceScanActivity : AppCompatActivity() {

    private lateinit var cameraExecutor: ExecutorService
    private lateinit var previewView: PreviewView
    private var videoCapture: VideoCapture<Recorder>? = null
    private lateinit var outputDirectory: File
    private lateinit var textViewStatus: TextView // Added TextView reference
    private var recordingTimer: CountDownTimer? = null // Added for recording progress

    private val RECORDING_DURATION_SECONDS = 10L // Increased duration
    private val TARGET_FRAME_RATE = 10 // Increased frame rate

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_face_scan)

        previewView = findViewById(R.id.previewView)
        textViewStatus = findViewById(R.id.textView_status) // Initialize TextView
        cameraExecutor = Executors.newSingleThreadExecutor()

        outputDirectory = File(cacheDir, "FaceScanImages").apply {
            if (!exists()) mkdirs() else {
                listFiles()?.forEach { it.delete() }
            }
        }
        textViewStatus.text = "Initializing camera..."
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
                .setQualitySelector(QualitySelector.from(Quality.HD)) // Keep HD for better source frames
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
                textViewStatus.text = "Camera start failed."
                finish()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun startRecording() {
        val videoCapture = this.videoCapture ?: return

        val videoFile = File(cacheDir, "temp_face_scan_${System.currentTimeMillis()}.mp4")
        val outputFileOptions = FileOutputOptions.Builder(videoFile).build()

        // Countdown timer for recording progress
        recordingTimer = object : CountDownTimer(RECORDING_DURATION_SECONDS * 1000, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                textViewStatus.text = "Recording... ${millisUntilFinished / 1000}s left"
            }
            override fun onFinish() {
                // This will be called roughly when the scheduled stop happens
                // The actual stop is handled by the scheduled executor
            }
        }.start()

        val recording = videoCapture.output
            .prepareRecording(this, outputFileOptions)
            .start(ContextCompat.getMainExecutor(this)) { event ->
                when (event) {
                    is VideoRecordEvent.Start -> {
                        Log.d("FaceScanActivity", "Recording started.")
                        // Toast.makeText(this, "Recording started...", Toast.LENGTH_SHORT).show() // Replaced by TextView
                    }
                    is VideoRecordEvent.Finalize -> {
                        recordingTimer?.cancel() // Stop the countdown timer
                        if (event.hasError()) {
                            Log.e("FaceScanActivity", "Video recording error: ${event.error} - ${event.cause?.message}")
                            Toast.makeText(this, "Video recording failed.", Toast.LENGTH_SHORT).show()
                            textViewStatus.text = "Recording failed."
                            setResult(Activity.RESULT_CANCELED)
                        } else {
                            // Toast.makeText(this, "Face scan complete! Processing...", Toast.LENGTH_SHORT).show() // Replaced by TextView
                            textViewStatus.text = "Processing frames..."
                            val videoUri = event.outputResults.outputUri
                            Log.d("FaceScanActivity", "Video saved to: $videoUri")

                            val framePaths = extractFramesFromVideo(videoUri)

                            val resultIntent = Intent()
                            resultIntent.putStringArrayListExtra("FRAME_PATHS", ArrayList(framePaths))
                            setResult(Activity.RESULT_OK, resultIntent)
                        }
                        videoFile.delete()
                        finish()
                    }
                }
            }

        // Schedule recording stop
        Executors.newSingleThreadScheduledExecutor().schedule({
            recording.stop()
        }, RECORDING_DURATION_SECONDS, TimeUnit.SECONDS)
    }

    private fun cropToSquareAndResizeBitmap(sourceBitmap: Bitmap, targetSquareSize: Int): Bitmap {
        val originalWidth = sourceBitmap.width
        val originalHeight = sourceBitmap.height
        val sideLength = min(originalWidth, originalHeight)
        val x = (originalWidth - sideLength) / 2
        val y = (originalHeight - sideLength) / 2
        val croppedBitmap = Bitmap.createBitmap(sourceBitmap, x, y, sideLength, sideLength)
        val scaledBitmap = Bitmap.createScaledBitmap(croppedBitmap, targetSquareSize, targetSquareSize, true)
        if (croppedBitmap != scaledBitmap) {
            croppedBitmap.recycle()
        }
        return scaledBitmap
    }

    private fun extractFramesFromVideo(videoUri: Uri): List<String> {
        val framePaths = mutableListOf<String>()
        val mediaMetadataRetriever = MediaMetadataRetriever()
        try {
            mediaMetadataRetriever.setDataSource(this, videoUri)

            val videoLengthInMs = mediaMetadataRetriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLong() ?: 0
            if (videoLengthInMs == 0L) {
                Log.e("FaceScanActivity", "Video duration is 0 or could not be read.")
                textViewStatus.text = "Error: Video has no duration."
                return framePaths
            }

            // Use TARGET_FRAME_RATE defined in the class
            val interval = 1000L / TARGET_FRAME_RATE
            val totalExpectedFrames = (videoLengthInMs / 1000.0 * TARGET_FRAME_RATE).toInt()
            Log.d("FaceScanActivity", "Video length: ${videoLengthInMs}ms, Interval: ${interval}ms, Expected frames: $totalExpectedFrames")


            var currentMs = 0L
            var frameIndex = 0
            while (currentMs < videoLengthInMs && frameIndex < totalExpectedFrames) { // Added safety for totalExpectedFrames
                val originalFrameBitmap = mediaMetadataRetriever.getFrameAtTime(currentMs * 1000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                originalFrameBitmap?.let {
                    val processedBitmap = cropToSquareAndResizeBitmap(it, 100) // Target size 100x100
                    val framePath = saveFrameAsImage(processedBitmap, frameIndex)
                    if (framePath.isNotEmpty()) {
                        framePaths.add(framePath)
                    }
                    it.recycle()
                    processedBitmap.recycle()

                    // Update progress for frame extraction
                    val currentFrameNum = frameIndex + 1
                    runOnUiThread { // Ensure UI updates on the main thread
                        textViewStatus.text = "Processing frame $currentFrameNum of $totalExpectedFrames..."
                    }
                    frameIndex++
                }
                currentMs += interval
            }
        } catch (e: Exception) {
            Log.e("FaceScanActivity", "Error extracting frames: ${e.message}", e)
            Toast.makeText(this, "Error processing video frames.", Toast.LENGTH_SHORT).show()
            runOnUiThread { textViewStatus.text = "Error processing frames." }
        } finally {
            mediaMetadataRetriever.release()
        }
        Log.d("FaceScanActivity", "Extracted ${framePaths.size} frames.")
        runOnUiThread { textViewStatus.text = "Processing complete. Extracted ${framePaths.size} frames." }
        return framePaths
    }

    private fun saveFrameAsImage(bitmap: Bitmap, frameIndex: Int): String {
        if (!outputDirectory.exists()) {
            outputDirectory.mkdirs()
        }
        val file = File(outputDirectory, "frame_$frameIndex.jpg")
        try {
            FileOutputStream(file).use {
                bitmap.compress(Bitmap.CompressFormat.JPEG, 90, it)
            }
            // Log.d("FaceScanActivity", "Saved frame: ${file.absolutePath}") // Logged frequently, can be verbose
            return file.absolutePath
        } catch (e: Exception) {
            Log.e("FaceScanActivity", "Error saving frame $frameIndex: ${e.message}", e)
            return ""
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        recordingTimer?.cancel() // Ensure timer is cancelled
    }
}