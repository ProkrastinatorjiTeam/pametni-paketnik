package com.example.paketnik_app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

@androidx.camera.core.ExperimentalGetImage
class CameraActivity : AppCompatActivity() {

    private lateinit var cameraExecutor: ExecutorService
    private var scannedQrCode: String? = null // Variable to store the scanned QR code


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_camera)

        val previewView: PreviewView = findViewById(R.id.previewView)

        cameraExecutor = Executors.newSingleThreadExecutor()
        startCamera(previewView)
    }

    private fun startCamera(previewView: PreviewView) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)

        cameraProviderFuture.addListener({
            try {
                val cameraProvider = cameraProviderFuture.get()
                val preview = androidx.camera.core.Preview.Builder().build()
                val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                preview.setSurfaceProvider(previewView.surfaceProvider)

                val imageAnalyzer = ImageAnalysis.Builder().build().also {
                    it.setAnalyzer(cameraExecutor) { imageProxy ->
                        processImageProxy(imageProxy)
                    }
                }

                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageAnalyzer)
            } catch (e: Exception) {
                Log.e("CameraX", "Failed to bind camera use cases", e)
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private var isTransitioning = false // Flag to prevent multiple transitions

    private fun processImageProxy(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
            val scanner = BarcodeScanning.getClient()

            scanner.process(image)
                .addOnSuccessListener { barcodes ->
                    for (barcode in barcodes) {
                        if (!isTransitioning && (barcode.valueType == Barcode.TYPE_TEXT || barcode.valueType == Barcode.TYPE_URL)) {
                            isTransitioning = true // Set the flag to true
                            scannedQrCode = barcode.rawValue // Save the scanned QR code
                            Log.d("QR Code", "Scanned QR Code: $scannedQrCode")
                            Toast.makeText(this, "Scanned QR Code: $scannedQrCode", Toast.LENGTH_SHORT).show() // Show toast

                            // Return to MainActivity
                            val intent = Intent(this, MainActivity::class.java)
                            intent.putExtra("SCANNED_QR_CODE", scannedQrCode)
                            startActivity(intent)
                            finish() // Close CameraActivity
                            break
                        }
                    }
                }
                .addOnFailureListener { e ->
                    Log.e("QR Code", "Failed to scan QR code", e)
                }
                .addOnCompleteListener {
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }
}