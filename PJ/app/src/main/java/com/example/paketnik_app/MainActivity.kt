package com.example.paketnik_app

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.ActionBarDrawerToggle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.drawerlayout.widget.DrawerLayout
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.navigation.NavigationView
import retrofit2.Call

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
        val physicialId = intent.getStringExtra("SCANNED_QR_CODE")
        if (physicialId != null) {
            Log.d("MainActivity", "Received QR Code: $physicialId")
            println("Received QR Code: $physicialId") // Output to terminal

            val physicalIdInt = physicialId.toIntOrNull()
            if (physicalIdInt != null) {
                tryOpenBox(this, physicalIdInt)
            } else {
                Toast.makeText(this, "Invalid QR code", Toast.LENGTH_SHORT).show()
            }
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

    private fun tryOpenBox(context: Context, physicalId: Int) {
        val body = mapOf("physicalId" to physicalId)
        val call = RetrofitClient.instance.openBox(body)

        call.enqueue(object : retrofit2.Callback<Void> {
            override fun onResponse(call: Call<Void>, response: retrofit2.Response<Void>) {
                if (response.isSuccessful) {
                    TokenPlayerHelper.openBoxAndPlayToken(context, physicalId.toString())
                } else {
                    Toast.makeText(context, "Not authorized to open this box", Toast.LENGTH_SHORT)
                        .show()
                }
            }

            override fun onFailure(call: Call<Void>, t: Throwable) {
                Toast.makeText(context, "Failed to connect to server", Toast.LENGTH_SHORT).show()
            }
        })
    }
}