package com.example.paketnik_app

import OpenBoxResponse
import UnlockRequest
import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.ActionBarDrawerToggle
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.drawerlayout.widget.DrawerLayout
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.navigation.NavigationView
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

@androidx.camera.core.ExperimentalGetImage
class MainActivity : AppCompatActivity() {

    private val CAMERA_PERMISSION_REQUEST_CODE = 1001
    private lateinit var drawerLayout: DrawerLayout
    private lateinit var navigationView: NavigationView
    private lateinit var toolbar: MaterialToolbar

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
        }

        println("App has opened") // Output to terminal when app is opened

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

        // Handle drawer menu item clicks
        navigationView.setNavigationItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_logout -> {
                    AuthManager.logout()
                    startActivity(Intent(this, AuthActivity::class.java))
                    finish()
                    true
                }

                else -> false
            }
        }

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
        val qrCode = intent.getStringExtra("SCANNED_QR_CODE")
        if (qrCode != null) {
            Log.d("MainActivity", "Received QR Code: $qrCode")
            println("Received QR Code: $qrCode") // Output to terminal

            // Extract the box ID from the QR code string
            val physicalId = extractBoxIdFromQrCode(qrCode)
            Log.d("MainActivity", "Extracted Physical ID: $physicalId")

            if (physicalId != null) {
                tryOpenBox(this, physicalId)
            } else {
                Toast.makeText(this, "Invalid QR code format", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun extractBoxIdFromQrCode(qrCode: String): Int? {
        // Assuming the QR code is in the format "https://b.direct4.me/02/000537/523/138/1747070163/1/53/00/"
        // Extract the ID which is the third segment when split by '/'
        val segments = qrCode.split("/")
        if (segments.size > 4) {
            val boxIdString = segments[4]
            return boxIdString.toIntOrNull()
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
                // Start CameraActivity after permission is granted
                val intent = Intent(this, CameraActivity::class.java)
                startActivity(intent)
            }
        }
    }

    private fun tryOpenBox(context: Context, physicalId: Int) {
        val body = mapOf("physicalId" to physicalId)
        val call = AuthRetrofitClient.instance.openBox(body)

        call.enqueue(object : Callback<OpenBoxResponse> {
            override fun onResponse(call: Call<OpenBoxResponse>, response: Response<OpenBoxResponse>) {
                if (response.isSuccessful && response.body()?.success == true) {
                    val boxId = response.body()?.boxId ?: return

                    TokenPlayerHelper.openBoxAndPlayToken(context, physicalId.toString())

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
                } else {
                    Toast.makeText(context, "Not authorized to open this box", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(call: Call<OpenBoxResponse>, t: Throwable) {
                Toast.makeText(context, "Failed to connect to server", Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun sendUnlockEvent(boxId: String, success: Boolean) {
        val request = UnlockRequest(boxId = boxId,  success = success)

        AuthRetrofitClient.instance.createUnlock(request)
            .enqueue(object : Callback<Void> {
                override fun onResponse(call: Call<Void>, response: Response<Void>) {
                    if (response.isSuccessful) {
                        Toast.makeText(this@MainActivity, "Unlock event saved!", Toast.LENGTH_SHORT)
                            .show()
                    } else {
                        Toast.makeText(
                            this@MainActivity,
                            "Failed: ${response.code()}",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }

                override fun onFailure(call: Call<Void>, t: Throwable) {
                    Toast.makeText(
                        this@MainActivity,
                        "Network error: ${t.message}",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            })
    }
}