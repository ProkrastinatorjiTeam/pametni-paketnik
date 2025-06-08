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
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import java.io.File

@androidx.camera.core.ExperimentalGetImage
class MainActivity : AppCompatActivity() {

    private val CAMERA_PERMISSION_REQUEST_CODE = 1001
    private lateinit var drawerLayout: DrawerLayout
    private lateinit var navigationView: NavigationView
    private lateinit var toolbar: MaterialToolbar

    //Launch FaceScanActivity to record a video of the user's face
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

    // Launcher for FaceVerifyActivity
    private val faceVerifyLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val physicalIdFromResult = result.data?.getIntExtra("PHYSICAL_ID", -1) ?: -1
        Log.d("MainActivity", "FaceVerifyLauncher result: resultCode=${result.resultCode}, physicalIdFromResult=$physicalIdFromResult, hasData=${result.data != null}")

        if (result.resultCode == Activity.RESULT_OK) {
            val isMatch = result.data?.getBooleanExtra("IS_MATCH", false) ?: false
            Log.d("MainActivity", "FaceVerifyLauncher: RESULT_OK, isMatch=$isMatch")
            if (isMatch && physicalIdFromResult != -1) {
                Toast.makeText(this, "Face verification successful. Opening box...", Toast.LENGTH_SHORT).show()
                tryOpenBox(this, physicalIdFromResult) // Call tryOpenBox on successful verification
            } else {
                val message = if (physicalIdFromResult != -1 && !isMatch) {
                    "Face verification failed (no match). Cannot open box."
                } else if (physicalIdFromResult == -1) {
                    "Face verification process error: Box ID not returned from verify activity."
                } else {
                    "Face verification failed."
                }
                Log.w("MainActivity", "FaceVerifyLauncher: RESULT_OK but verification failed or ID missing. Message: $message")
                Toast.makeText(this, message, Toast.LENGTH_LONG).show()
            }
        } else { // Activity.RESULT_CANCELED or other non-OK result
            val message = if (physicalIdFromResult != -1) {
                "Face verification was cancelled or an error occurred (Box ID: $physicalIdFromResult)."
            } else {
                "Face verification process error or cancelled (Box ID not available)."
            }
            Log.w("MainActivity", "FaceVerifyLauncher: Result not OK (cancelled/error). Message: $message")
            Toast.makeText(this, message, Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        Log.d("MainActivity", "onCreate called.")

        drawerLayout = findViewById(R.id.drawer_layout)
        navigationView = findViewById(R.id.nav_view)
        toolbar = findViewById(R.id.toolbar)

        if (!AuthManager.isLoggedIn()) {
            Log.i("MainActivity", "User not logged in. Redirecting to AuthActivity.")
            val intent = Intent(this, AuthActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
            return
        }

        Log.d("MainActivity", "User is logged in. User ID: ${AuthManager.getUserId()}")

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
                    Log.i("MainActivity", "Logout selected.")
                    AuthManager.logout()
                    val intent = Intent(this, AuthActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    startActivity(intent)
                    finish()
                    true
                }
                R.id.nav_update_face -> {
                    Log.i("MainActivity", "Update Face selected.")
                    val intent = Intent(this, FaceScanActivity::class.java)
                    faceScanLauncher.launch(intent)
                    true
                }
                else -> false
            }
        }

        val openButton: Button = findViewById(R.id.Open_button)
        openButton.setOnClickListener {
            Log.d("MainActivity", "Open_button clicked.")
            if (isCameraPermissionGranted()) {
                Log.i("MainActivity", "Camera permission granted. Launching CameraActivity.")
                val intent = Intent(this, CameraActivity::class.java)
                startActivity(intent)
            } else {
                Log.w("MainActivity", "Camera permission not granted. Requesting permission.")
                requestCameraPermission()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        Log.d("MainActivity", "onNewIntent: Received new intent. Action: ${intent.action}, Data: ${intent.dataString}")
        Log.d("MainActivity", "onNewIntent: Intent extras: ${intentToString(intent)}")
        setIntent(intent) // Update the activity's intent
        val qrCode = intent.getStringExtra("SCANNED_QR_CODE")
        Log.d("MainActivity", "onNewIntent: Extracted SCANNED_QR_CODE: '$qrCode'")

        if (qrCode != null) {
            handleScannedQrCode(qrCode)
            // Consume the extra from the new intent that is now set as the activity's intent
            getIntent().removeExtra("SCANNED_QR_CODE")
            Log.d("MainActivity", "onNewIntent: SCANNED_QR_CODE processed and removed.")
        } else {
            Log.w("MainActivity", "onNewIntent: SCANNED_QR_CODE is null in the new intent.")
        }
    }

    override fun onResume() {
        super.onResume()
        Log.d("MainActivity", "onResume called.")
        // Check the current intent (which might have been updated by onNewIntent)
        val currentIntent = getIntent()
        Log.d("MainActivity", "onResume: Current intent extras: ${intentToString(currentIntent)}")
        val qrCode = currentIntent.getStringExtra("SCANNED_QR_CODE")
        Log.d("MainActivity", "onResume: Extracted SCANNED_QR_CODE from current intent: '$qrCode'")

        if (qrCode != null) {
            Log.i("MainActivity", "onResume: Found SCANNED_QR_CODE. Processing...")
            handleScannedQrCode(qrCode)
            currentIntent.removeExtra("SCANNED_QR_CODE") // Consume the extra
            Log.d("MainActivity", "onResume: SCANNED_QR_CODE processed and removed.")
        } else {
            Log.i("MainActivity", "onResume: SCANNED_QR_CODE is null in current intent (may have been processed by onNewIntent or was not present).")
        }
    }

    private fun handleScannedQrCode(qrCode: String) {
        Log.i("MainActivity", "handleScannedQrCode: Processing QR Code: '$qrCode'")
        val physicalId = extractBoxIdFromQrCode(qrCode)
        Log.d("MainActivity", "handleScannedQrCode: Extracted Physical ID: $physicalId")

        if (physicalId != null) {
            Log.i("MainActivity", "handleScannedQrCode: Valid physicalId ($physicalId). Launching FaceVerifyActivity.")
            val verifyIntent = Intent(this, FaceVerifyActivity::class.java)
            verifyIntent.putExtra("PHYSICAL_ID", physicalId)
            faceVerifyLauncher.launch(verifyIntent)
        } else {
            Log.w("MainActivity", "handleScannedQrCode: Invalid QR code format. QR: '$qrCode'")
            Toast.makeText(this, "Invalid QR code format", Toast.LENGTH_SHORT).show()
        }
    }

    private fun extractBoxIdFromQrCode(qrCode: String): Int? {
        val segments = qrCode.split("/")

        if (segments.size > 4) {
            val idStr = segments[4]
            Log.d("MainActivity", "extractBoxIdFromQrCode: segment[4] is '$idStr'")
            return idStr.toIntOrNull()
        }
        Log.w("MainActivity", "extractBoxIdFromQrCode: Not enough segments in QR code '$qrCode' to extract ID at index 4.")
        return null
    }

    private fun isCameraPermissionGranted(): Boolean {
        val granted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
        Log.d("MainActivity", "isCameraPermissionGranted: $granted")
        return granted
    }

    private fun requestCameraPermission() {
        Log.i("MainActivity", "requestCameraPermission: Requesting camera permission.")
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
        Log.d("MainActivity", "onRequestPermissionsResult: requestCode=$requestCode")
        if (requestCode == CAMERA_PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.i("MainActivity", "onRequestPermissionsResult: Camera permission granted.")
                Toast.makeText(this, "Camera permission granted.", Toast.LENGTH_SHORT).show()
            } else {
                Log.w("MainActivity", "onRequestPermissionsResult: Camera permission denied.")
                Toast.makeText(this, "Camera permission is required to scan QR codes.", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun tryOpenBox(context: Context, physicalId: Int) {
        Log.i("MainActivity", "tryOpenBox: Attempting to open box with physicalId: $physicalId")
        val body = mapOf("physicalId" to physicalId)
        val call = AuthRetrofitClient.instance.openBox(body)

        call.enqueue(object : Callback<com.example.paketnik_app.OpenBoxResponse> {
            override fun onResponse(call: Call<com.example.paketnik_app.OpenBoxResponse>, response: Response<com.example.paketnik_app.OpenBoxResponse>) {
                if (response.isSuccessful && response.body()?.success == true) {
                    val boxId = response.body()?.boxId
                    Log.i("MainActivity", "tryOpenBox: Successfully opened box. PhysicalId: $physicalId, Server BoxId: $boxId")
                    if (boxId == null) {
                        Log.e("MainActivity", "tryOpenBox: Box ID null in successful openBox response.")
                        Toast.makeText(context, "Box ID not found in response.", Toast.LENGTH_SHORT).show()
                        return
                    }

                    TokenPlayerHelper.openBoxAndPlayToken(context, physicalId.toString())

                    AlertDialog.Builder(this@MainActivity)
                        .setTitle("Box Unlock")
                        .setMessage("Was the box successfully opened?")
                        .setPositiveButton("Yes") { _, _ -> sendUnlockEvent(boxId, true) }
                        .setNegativeButton("No") { _, _ -> sendUnlockEvent(boxId, false) }
                        .setCancelable(false)
                        .show()
                } else {
                    val errorBody = response.errorBody()?.string()
                    Log.e("MainActivity", "tryOpenBox failed: ${response.code()} - $errorBody. PhysicalId: $physicalId")
                    Toast.makeText(context, "Not authorized to open this box. Error: ${response.code()}", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(call: Call<com.example.paketnik_app.OpenBoxResponse>, t: Throwable) {
                Log.e("MainActivity", "tryOpenBox network failure: ${t.message}. PhysicalId: $physicalId", t)
                Toast.makeText(context, "Failed to connect to server: ${t.message}", Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun sendUnlockEvent(boxId: String, success: Boolean) {
        Log.i("MainActivity", "sendUnlockEvent: BoxId: $boxId, Success: $success")
        val request = com.example.paketnik_app.UnlockRequest(boxId = boxId,  success = success)

        AuthRetrofitClient.instance.createUnlock(request)
            .enqueue(object : Callback<Void> {
                override fun onResponse(call: Call<Void>, response: Response<Void>) {
                    if (response.isSuccessful) {
                        Log.d("MainActivity", "Unlock event sent successfully for Box ID: $boxId")
                        Toast.makeText(this@MainActivity, "Unlock event saved!", Toast.LENGTH_SHORT).show()
                    } else {
                        Log.e("MainActivity", "Failed to send unlock event: ${response.code()} for Box ID: $boxId")
                        Toast.makeText(this@MainActivity, "Failed to save unlock event: ${response.code()}", Toast.LENGTH_SHORT).show()
                    }
                }
                override fun onFailure(call: Call<Void>, t: Throwable) {
                    Log.e("MainActivity", "Network error sending unlock event for Box ID: $boxId : ${t.message}", t)
                    Toast.makeText(this@MainActivity, "Network error saving unlock event: ${t.message}", Toast.LENGTH_SHORT).show()
                }
            })
    }

    //Upload extracted frames to the Two-Factor server
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

        // Prepare images for upload
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

        // Send images to the server
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
        val faceScanImagesDir = File(cacheDir, "FaceScanImages")
        if (faceScanImagesDir.exists() && faceScanImagesDir.isDirectory && faceScanImagesDir.listFiles()?.isEmpty() == true) {
            if (faceScanImagesDir.delete()) {
                Log.d("MainActivity", "Cleaned up empty FaceScanImages directory.")
            } else {
                Log.w("MainActivity", "Failed to delete empty FaceScanImages directory.")
            }
        }
    }

    // Helper function to log intent extras
    private fun intentToString(intent: Intent?): String {
        if (intent == null) return "null intent"
        val extras = intent.extras
        if (extras == null || extras.isEmpty) return "no extras"
        val stringBuilder = StringBuilder()
        for (key in extras.keySet()) {
            stringBuilder.append(key).append("=").append(extras.get(key)).append("; ")
        }
        return stringBuilder.toString()
    }
}