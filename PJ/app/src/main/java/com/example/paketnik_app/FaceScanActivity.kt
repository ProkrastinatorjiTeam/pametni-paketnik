package com.example.paketnik_app

import android.content.ContentValues
import android.content.Intent
import android.graphics.Bitmap
import android.media.MediaExtractor
import android.media.MediaCodec
import android.media.MediaFormat
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
import java.nio.ByteBuffer
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

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
        outputDirectory = File(getExternalFilesDir(null), "FaceScanImages").apply {
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

                        // Pass video URI to RegisterActivity
                        val intent = Intent(this, RegisterActivity::class.java)
                        intent.putExtra("VIDEO_URI", event.outputResults.outputUri.toString())
                        startActivity(intent)
                        finish()
                    }
                }
            }

        Executors.newSingleThreadScheduledExecutor().schedule({
            recording.stop()
        }, 5, TimeUnit.SECONDS)
    }

    private fun extractFrames(videoUri: android.net.Uri) {
        val extractor = MediaExtractor()
        val inputStream = contentResolver.openInputStream(videoUri) ?: return
        val tempFile = File(cacheDir, "temp_video.mp4").apply {
            outputStream().use { inputStream.copyTo(it) }
        }

        extractor.setDataSource(tempFile.absolutePath)
        val trackIndex = (0 until extractor.trackCount).find {
            extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("video/") == true
        } ?: return

        extractor.selectTrack(trackIndex)
        val format = extractor.getTrackFormat(trackIndex)
        val width = format.getInteger(MediaFormat.KEY_WIDTH)
        val height = format.getInteger(MediaFormat.KEY_HEIGHT)
        val frameRate = format.getInteger(MediaFormat.KEY_FRAME_RATE)

        val codec = MediaCodec.createDecoderByType(format.getString(MediaFormat.KEY_MIME)!!)
        codec.configure(format, null, null, 0)
        codec.start()

        val bufferInfo = MediaCodec.BufferInfo()
        var frameIndex = 0

        while (true) {
            val inputBufferIndex = codec.dequeueInputBuffer(10000)
            if (inputBufferIndex >= 0) {
                val inputBuffer = codec.getInputBuffer(inputBufferIndex) ?: continue
                val sampleSize = extractor.readSampleData(inputBuffer, 0)
                if (sampleSize < 0) {
                    codec.queueInputBuffer(inputBufferIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                    break
                } else {
                    codec.queueInputBuffer(inputBufferIndex, 0, sampleSize, extractor.sampleTime, 0)
                    extractor.advance()
                }
            }

            val outputBufferIndex = codec.dequeueOutputBuffer(bufferInfo, 10000)
            if (outputBufferIndex >= 0) {
                val outputBuffer = codec.getOutputBuffer(outputBufferIndex) ?: continue
                val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                bitmap.copyPixelsFromBuffer(outputBuffer)

                saveFrameAsImage(bitmap, frameIndex++)
                codec.releaseOutputBuffer(outputBufferIndex, false)
            }

            if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) break
        }

        codec.stop()
        codec.release()
        extractor.release()
        tempFile.delete()
    }

    private fun saveFrameAsImage(bitmap: Bitmap, frameIndex: Int) {
        val file = File(outputDirectory, "frame_$frameIndex.png")
        FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        Log.d("FaceScanActivity", "Saved frame: ${file.absolutePath}")
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }
}