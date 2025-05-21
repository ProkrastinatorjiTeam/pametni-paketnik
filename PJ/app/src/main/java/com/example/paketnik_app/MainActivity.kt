package com.example.paketnik_app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

@androidx.camera.core.ExperimentalGetImage
class MainActivity : AppCompatActivity() {

    private val CAMERA_PERMISSION_REQUEST_CODE = 1001

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        println("App has opened") // Output to terminal when app is opened

        val openButton: Button = findViewById(R.id.Open_button)

        openButton.setOnClickListener {
            if (isCameraPermissionGranted()) {
                // Start CameraActivity
                val intent = Intent(this, CameraActivity::class.java)
                startActivity(intent)
            } else {
                requestCameraPermission()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        val scannedQrCode = intent.getStringExtra("SCANNED_QR_CODE")
        if (scannedQrCode != null) {
            Log.d("MainActivity", "Received QR Code: $scannedQrCode")
            println("Received QR Code: $scannedQrCode") // Output to terminal
            // Handle the scanned QR code as needed
        }
    }

    private fun isCameraPermissionGranted(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestCameraPermission() {
        ActivityCompat.requestPermissions(
            this,
            arrayOf(Manifest.permission.CAMERA),
            CAMERA_PERMISSION_REQUEST_CODE
        )
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == CAMERA_PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Start CameraActivity after permission is granted
                val intent = Intent(this, CameraActivity::class.java)
                startActivity(intent)
            }
        }
    }
}