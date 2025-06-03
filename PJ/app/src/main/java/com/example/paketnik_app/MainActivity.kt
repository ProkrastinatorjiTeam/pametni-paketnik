package com.example.paketnik_app

// Ensure these are the correct imports for your project structure
// import OpenBoxResponse // This seems to be a local class, ensure it's defined or imported correctly
// import UnlockRequest // Same as above

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.ActionBarDrawerToggle
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.drawerlayout.widget.DrawerLayout
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.navigation.NavigationView
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import java.io.File

@androidx.camera.core.ExperimentalGetImage
class MainActivity : AppCompatActivity() {

    private val CAMERA_PERMISSION_REQUEST_CODE = 1001
    // private val FACE_SCAN_REQUEST_CODE = 1002 // Replaced by ActivityResultLauncher

    private lateinit var drawerLayout: DrawerLayout
    private lateinit var navigationView: NavigationView
    private lateinit var toolbar: MaterialToolbar

    // ActivityResultLauncher for FaceScanActivity
    private val faceScanLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val framePaths = result.data?.getStringArrayListExtra("FRAME_PATHS")
            if (framePaths != null && framePaths.isNotEmpty()) {
                sendImagesToTwoFactorServer(framePaths)
            } else {
                Toast.makeText(this, "No frames were captured.", Toast.LENGTH_SHORT).show()
            }
        } else {
            Toast.makeText(this, "Face scan was cancelled or failed.", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        drawerLayout = findViewById(R.id.drawer_layout)
        navigationView = findViewById(R.id.nav_view)
        toolbar = findViewById(R.id.toolbar)

        if (!AuthManager.isLoggedIn()) {
            val intent = Intent(this, AuthActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
            return // Important to return to prevent rest of onCreate from executing
        }

        Log.d("MainActivity", "App has opened, user is logged in.")

        setSupportActionBar(toolbar)
        val toggle = ActionBarDrawerToggle(
            this,
            drawerLayout,
            toolbar,
            R.string.navigation_drawer_open,
            R.string.navigation_drawer_close
        )
        drawerLayout.addDrawerListener(toggle)
        toggle.syncState()

        navigationView.setNavigationItemSelectedListener { item ->
            drawerLayout.closeDrawers() // Close drawer when an item is tapped
            when (item.itemId) {
                R.id.nav_logout -> {
                    AuthManager.logout()
                    val intent = Intent(this, AuthActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    startActivity(intent)
                    finish()
                    true
                }
                R.id.nav_update_face -> {
                    // Start FaceScanActivity to capture frames
                    val intent = Intent(this, FaceScanActivity::class.java)
                    faceScanLauncher.launch(intent)
                    true
                }
                else -> false
            }
        }

        val openButton: Button = findViewById(R.id.Open_button)
        openButton.setOnClickListener {
            if (isCameraPermissionGranted()) {
                // Launch CameraActivity to scan QR code
                val intent = Intent(this, CameraActivity::class.java)
                startActivity(intent)
            } else {
                requestCameraPermission()
            }
        }
    }

    override fun onNewIntent(intent: Intent) { // Changed Intent? to Intent
        super.onNewIntent(intent)
        setIntent(intent) // Update the activity's intent, now intent is non-nullable
        // Process QR code if the activity is re-launched with new intent
        val qrCode = intent.getStringExtra("SCANNED_QR_CODE") // No need for ?. as intent is non-nullable
        if (qrCode != null) {
            handleScannedQrCode(qrCode)
            // Clear the extra to prevent reprocessing on configuration change or simple resume
            getIntent().removeExtra("SCANNED_QR_CODE")
        }
    }


    override fun onResume() {
        super.onResume()
        // Check for QR code when activity resumes (e.g., returning from CameraActivity)
        val qrCode = intent.getStringExtra("SCANNED_QR_CODE")
        if (qrCode != null) {
            Log.d("MainActivity", "onResume: Received QR Code: $qrCode")
            handleScannedQrCode(qrCode)
            // Clear the QR code from the intent to prevent reprocessing
            intent.removeExtra("SCANNED_QR_CODE")
        }
    }

    private fun handleScannedQrCode(qrCode: String) {
        Log.d("MainActivity", "Handling QR Code: $qrCode")
        // Extract the box ID from the QR code string
        val physicalId = extractBoxIdFromQrCode(qrCode)
        Log.d("MainActivity", "Extracted Physical ID: $physicalId")

        if (physicalId != null) {
            tryOpenBox(this, physicalId)
        } else {
            Toast.makeText(this, "Invalid QR code format", Toast.LENGTH_SHORT).show()
            Log.w("MainActivity", "Invalid QR code format: $qrCode")
        }
    }


    private fun extractBoxIdFromQrCode(qrCode: String): Int? {
        val segments = qrCode.split("/")
        // Example QR: "https://b.direct4.me/02/000537/523/138/1747070163/1/53/00/"
        // Assuming physicalId is at index 5 (the 6th element, e.g., "138")
        // Your previous code used segments[4]. If that was correct, adjust index accordingly.
        // For "138" to be segments[5], segments.size must be > 5.
        // If "138" is segments[4], segments.size must be > 4.
        // Sticking to segments[4] as per your original logic.
        if (segments.size > 4) {
            return segments[4].toIntOrNull()
        }
        return null
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
                // Permission granted, launch CameraActivity
                val intent = Intent(this, CameraActivity::class.java)
                startActivity(intent)
            } else {
                Toast.makeText(this, "Camera permission is required to scan QR codes.", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun tryOpenBox(context: Context, physicalId: Int) {
        val body = mapOf("physicalId" to physicalId)
        val call = AuthRetrofitClient.instance.openBox(body)

        call.enqueue(object : Callback<com.example.paketnik_app.OpenBoxResponse> {
            override fun onResponse(call: Call<com.example.paketnik_app.OpenBoxResponse>, response: Response<com.example.paketnik_app.OpenBoxResponse>) {
                if (response.isSuccessful && response.body()?.success == true) {
                    val boxId = response.body()?.boxId
                    if (boxId != null) {
                        Toast.makeText(context, "Box opened successfully! Box ID: $boxId", Toast.LENGTH_LONG).show()
                        Log.d("MainActivity", "Box opened: $boxId")
                        // Call your TokenPlayerHelper here if needed, e.g.:
                        // TokenPlayerHelper.openBoxAndPlayToken(context, boxId)
                        // For now, just logging and sending unlock event
                        sendUnlockEvent(boxId, true) // Send success event
                    } else {
                        Toast.makeText(context, "Box ID not found in response.", Toast.LENGTH_SHORT).show()
                        Log.e("MainActivity", "Box ID null in successful response.")
                        sendUnlockEvent("UNKNOWN_BOX_ID_SUCCESS_NO_ID", false) // Or handle appropriately
                    }
                } else {
                    val errorBody = response.errorBody()?.string()
                    Log.e("MainActivity", "tryOpenBox failed: ${response.code()} - $errorBody")
                    Toast.makeText(context, "Not authorized or error opening box: ${response.code()}", Toast.LENGTH_SHORT).show()
                    sendUnlockEvent(physicalId.toString(), false) // Send failure event with physicalId as fallback
                }
            }

            override fun onFailure(call: Call<com.example.paketnik_app.OpenBoxResponse>, t: Throwable) {
                Log.e("MainActivity", "tryOpenBox network failure: ${t.message}", t)
                Toast.makeText(context, "Failed to connect to server: ${t.message}", Toast.LENGTH_SHORT).show()
                sendUnlockEvent(physicalId.toString(), false) // Send failure event
            }
        })
    }

    private fun sendUnlockEvent(boxId: String, success: Boolean) {
        val request = com.example.paketnik_app.UnlockRequest(boxId = boxId,  success = success)

        AuthRetrofitClient.instance.createUnlock(request)
            .enqueue(object : Callback<Void> {
                override fun onResponse(call: Call<Void>, response: Response<Void>) {
                    if (response.isSuccessful) {
                        Log.d("MainActivity", "Unlock event sent successfully for Box ID: $boxId, Success: $success")
                    } else {
                        Log.e("MainActivity", "Failed to send unlock event: ${response.code()} for Box ID: $boxId")
                    }
                }

                override fun onFailure(call: Call<Void>, t: Throwable) {
                    Log.e("MainActivity", "Network error sending unlock event for Box ID: $boxId : ${t.message}", t)
                }
            })
    }

    private fun sendImagesToTwoFactorServer(framePaths: List<String>) {
        if (framePaths.isEmpty()) {
            Toast.makeText(this, "No frames to send.", Toast.LENGTH_SHORT).show()
            return
        }

        val imageParts = mutableListOf<MultipartBody.Part>()
        var allFilesValid = true

        for (path in framePaths) {
            val file = File(path)
            if (file.exists() && file.isFile) {
                val requestFile = file.asRequestBody("image/jpeg".toMediaTypeOrNull())
                // "images" is the part name the server expects for each file
                val bodyPart = MultipartBody.Part.createFormData("images", file.name, requestFile)
                imageParts.add(bodyPart)
            } else {
                Log.e("MainActivity", "File not found or invalid: $path")
                allFilesValid = false
                break // Stop if any file is invalid
            }
        }

        if (!allFilesValid || imageParts.isEmpty()) {
            Toast.makeText(this, "Error preparing images for upload.", Toast.LENGTH_SHORT).show()
            cleanupCachedFrames(framePaths) // Clean up even if upload fails here
            return
        }

        Toast.makeText(this, "Uploading ${imageParts.size} images...", Toast.LENGTH_SHORT).show()

        TwoFactorRetrofitClient.instance.updateImages(imageParts).enqueue(object : Callback<ResponseBody> {
            override fun onResponse(call: Call<ResponseBody>, response: Response<ResponseBody>) {
                if (response.isSuccessful) {
                    Toast.makeText(this@MainActivity, "Face images updated successfully!", Toast.LENGTH_LONG).show()
                    Log.d("MainActivity", "Images uploaded successfully. Server response: ${response.body()?.string()}")
                } else {
                    Toast.makeText(this@MainActivity, "Failed to update images: ${response.code()}", Toast.LENGTH_LONG).show()
                    Log.e("MainActivity", "Image upload failed. Code: ${response.code()}, Message: ${response.errorBody()?.string()}")
                }
                cleanupCachedFrames(framePaths) // Clean up frames after attempt
            }

            override fun onFailure(call: Call<ResponseBody>, t: Throwable) {
                Toast.makeText(this@MainActivity, "Network error updating images: ${t.message}", Toast.LENGTH_LONG).show()
                Log.e("MainActivity", "Image upload network error: ${t.message}", t)
                cleanupCachedFrames(framePaths) // Clean up frames after attempt
            }
        })
    }

    private fun cleanupCachedFrames(framePaths: List<String>) {
        var allDeleted = true
        for (path in framePaths) {
            try {
                val file = File(path)
                if (file.exists()) {
                    if (!file.delete()) {
                        Log.w("MainActivity", "Failed to delete frame: $path")
                        allDeleted = false
                    }
                }
            } catch (e: SecurityException) {
                Log.e("MainActivity", "SecurityException while deleting frame: $path", e)
                allDeleted = false
            } catch (e: Exception) {
                Log.e("MainActivity", "Error deleting frame: $path", e)
                allDeleted = false
            }
        }
        if (allDeleted) {
            Log.d("MainActivity", "All cached frames cleaned up successfully.")
        } else {
            Log.w("MainActivity", "Some cached frames could not be deleted.")
        }
        // Optionally, delete the "FaceScanImages" directory if it's empty
        val cacheDir = File(cacheDir, "FaceScanImages")
        if (cacheDir.exists() && cacheDir.isDirectory && cacheDir.listFiles()?.isEmpty() == true) {
            if (cacheDir.delete()) {
                Log.d("MainActivity", "Cleaned up empty FaceScanImages directory.")
            } else {
                Log.w("MainActivity", "Failed to delete empty FaceScanImages directory.")
            }
        }
    }
}