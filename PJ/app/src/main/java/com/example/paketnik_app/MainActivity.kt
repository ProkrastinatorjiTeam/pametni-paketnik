package com.example.paketnik_app

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
import androidx.appcompat.app.AlertDialog // Ensure this import is present
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.drawerlayout.widget.DrawerLayout
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.navigation.NavigationView
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import java.io.File
// Assuming TokenPlayerHelper is in this package or imported correctly
// import com.example.paketnik_app.TokenPlayerHelper

@androidx.camera.core.ExperimentalGetImage
class MainActivity : AppCompatActivity() {

    private val CAMERA_PERMISSION_REQUEST_CODE = 1001
    private lateinit var drawerLayout: DrawerLayout
    private lateinit var navigationView: NavigationView
    private lateinit var toolbar: MaterialToolbar

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
            return
        }

        Log.d("MainActivity", "App has opened, user is logged in. User ID: ${AuthManager.getUserId()}")


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
            drawerLayout.closeDrawers()
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
                val intent = Intent(this, CameraActivity::class.java)
                startActivity(intent)
            } else {
                requestCameraPermission()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val qrCode = intent.getStringExtra("SCANNED_QR_CODE")
        if (qrCode != null) {
            handleScannedQrCode(qrCode)
            getIntent().removeExtra("SCANNED_QR_CODE")
        }
    }


    override fun onResume() {
        super.onResume()
        val qrCode = intent.getStringExtra("SCANNED_QR_CODE")
        if (qrCode != null) {
            Log.d("MainActivity", "onResume: Received QR Code: $qrCode")
            handleScannedQrCode(qrCode)
            intent.removeExtra("SCANNED_QR_CODE")
        }
    }

    private fun handleScannedQrCode(qrCode: String) {
        Log.d("MainActivity", "Handling QR Code: $qrCode")
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
        if (segments.size > 4) { // Assuming physicalId is at index 4 (0-based)
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
                    if (boxId == null) {
                        Toast.makeText(context, "Box ID not found in response.", Toast.LENGTH_SHORT).show()
                        Log.e("MainActivity", "Box ID null in successful openBox response.")
                        return // Exit if boxId is null
                    }

                    // Call TokenPlayerHelper as in the working version
                    TokenPlayerHelper.openBoxAndPlayToken(context, physicalId.toString())

                    // Show AlertDialog as in the working version
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle("Box Unlock")
                        .setMessage("Was the box successfully opened?")
                        .setPositiveButton("Yes") { _, _ ->
                            sendUnlockEvent(boxId, true)
                        }
                        .setNegativeButton("No") { _, _ ->
                            sendUnlockEvent(boxId, false)
                        }
                        .setCancelable(false)
                        .show()
                    Log.d("MainActivity", "Box open request successful for physical ID: $physicalId, server returned box ID: $boxId. Awaiting user confirmation.")

                } else {
                    val errorBody = response.errorBody()?.string()
                    Log.e("MainActivity", "tryOpenBox failed: ${response.code()} - $errorBody")
                    // Toast message from the working version
                    Toast.makeText(context, "Not authorized to open this box", Toast.LENGTH_SHORT).show()
                    // Removed sendUnlockEvent(physicalId.toString(), false) from here to match working version
                }
            }

            override fun onFailure(call: Call<com.example.paketnik_app.OpenBoxResponse>, t: Throwable) {
                Log.e("MainActivity", "tryOpenBox network failure: ${t.message}", t)
                // Toast message from the working version
                Toast.makeText(context, "Failed to connect to server", Toast.LENGTH_SHORT).show()
                // Removed sendUnlockEvent(physicalId.toString(), false) from here to match working version
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
                        // Toast message from the working version
                        Toast.makeText(this@MainActivity, "Unlock event saved!", Toast.LENGTH_SHORT).show()
                    } else {
                        Log.e("MainActivity", "Failed to send unlock event: ${response.code()} for Box ID: $boxId")
                        // Toast message from the working version
                        Toast.makeText(this@MainActivity, "Failed: ${response.code()}", Toast.LENGTH_SHORT).show()
                    }
                }

                override fun onFailure(call: Call<Void>, t: Throwable) {
                    Log.e("MainActivity", "Network error sending unlock event for Box ID: $boxId : ${t.message}", t)
                    // Toast message from the working version
                    Toast.makeText(this@MainActivity, "Network error: ${t.message}", Toast.LENGTH_SHORT).show()
                }
            })
    }

    private fun sendImagesToTwoFactorServer(framePaths: List<String>) {
        if (framePaths.isEmpty()) {
            Toast.makeText(this, "No frames to send.", Toast.LENGTH_SHORT).show()
            return
        }

        val userId = AuthManager.getUserId()
        if (userId == null) {
            Toast.makeText(this, "User ID not found. Please log in again.", Toast.LENGTH_LONG).show()
            cleanupCachedFrames(framePaths)
            return
        }
        val userIdRequestBody = userId.toRequestBody("text/plain".toMediaTypeOrNull())

        val imageParts = mutableListOf<MultipartBody.Part>()
        var allFilesValid = true

        for (path in framePaths) {
            val file = File(path)
            if (file.exists() && file.isFile) {
                val requestFile = file.asRequestBody("image/jpeg".toMediaTypeOrNull())
                val bodyPart = MultipartBody.Part.createFormData("images", file.name, requestFile)
                imageParts.add(bodyPart)
            } else {
                Log.e("MainActivity", "File not found or invalid: $path")
                allFilesValid = false
                break
            }
        }

        if (!allFilesValid || imageParts.isEmpty()) {
            Toast.makeText(this, "Error preparing images for upload.", Toast.LENGTH_SHORT).show()
            cleanupCachedFrames(framePaths)
            return
        }

        Toast.makeText(this, "Uploading ${imageParts.size} images for user $userId...", Toast.LENGTH_SHORT).show()
        Log.d("MainActivity", "Attempting to upload ${imageParts.size} images for user $userId to 2FA server.")

        TwoFactorRetrofitClient.instance.updateImages(userIdRequestBody, imageParts).enqueue(object : Callback<ResponseBody> {
            override fun onResponse(call: Call<ResponseBody>, response: Response<ResponseBody>) {
                if (response.isSuccessful) {
                    Toast.makeText(this@MainActivity, "Face images updated successfully!", Toast.LENGTH_LONG).show()
                    Log.d("MainActivity", "Images uploaded successfully. Server response: ${response.body()?.string()}")
                } else {
                    val errorBody = response.errorBody()?.string() ?: "Unknown error"
                    Toast.makeText(this@MainActivity, "Failed to update images: ${response.code()} - $errorBody", Toast.LENGTH_LONG).show()
                    Log.e("MainActivity", "Image upload failed. Code: ${response.code()}, Message: $errorBody")
                }
                cleanupCachedFrames(framePaths)
            }

            override fun onFailure(call: Call<ResponseBody>, t: Throwable) {
                Toast.makeText(this@MainActivity, "Network error updating images: ${t.message}", Toast.LENGTH_LONG).show()
                Log.e("MainActivity", "Image upload network error. Exception: ${t::class.java.simpleName}, Message: ${t.message}", t)
                cleanupCachedFrames(framePaths)
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
        // Corrected cacheDir usage:
        val faceScanImagesDir = File(cacheDir, "FaceScanImages")
        if (faceScanImagesDir.exists() && faceScanImagesDir.isDirectory && faceScanImagesDir.listFiles()?.isEmpty() == true) {
            if (faceScanImagesDir.delete()) {
                Log.d("MainActivity", "Cleaned up empty FaceScanImages directory.")
            } else {
                Log.w("MainActivity", "Failed to delete empty FaceScanImages directory.")
            }
        }
    }
}