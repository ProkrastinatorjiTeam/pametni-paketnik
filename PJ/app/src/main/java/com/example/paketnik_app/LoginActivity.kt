package com.example.paketnik_app

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.annotation.OptIn
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.ExperimentalGetImage
import com.google.gson.annotations.SerializedName // Import SerializedName
import retrofit2.Call
import retrofit2.Response
import retrofit2.Callback

class LoginActivity : AppCompatActivity() {
    private lateinit var usernameEditText: EditText
    private lateinit var passwordEditText: EditText
    private lateinit var loginButton: Button

    @OptIn(ExperimentalGetImage::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        if (AuthManager.isLoggedIn()) {
            val intent = Intent(this, MainActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
            return // Ensure no further execution if already logged in and redirected
        }

        usernameEditText = findViewById(R.id.editTextUsername)
        passwordEditText = findViewById(R.id.editTextPassword)
        loginButton = findViewById(R.id.buttonLogin)

        loginButton.setOnClickListener {
            val username = usernameEditText.text.toString()
            val password = passwordEditText.text.toString()
            loginUser(username, password)
        }
    }

    @OptIn(ExperimentalGetImage::class) // Add OptIn here
    private fun loginUser(username: String, password: String) {
        val request = LoginRequest(username, password)

        AuthRetrofitClient.instance.loginUser(request).enqueue(object : Callback<LoginResponse> {
            override fun onResponse(call: Call<LoginResponse>, response: Response<LoginResponse>) {
                if (response.isSuccessful) {
                    val loginResponse = response.body()
                    Toast.makeText(
                        this@LoginActivity,
                        "Login successful! Welcome back ${loginResponse?.user?.username}!",
                        Toast.LENGTH_LONG
                    ).show()

                    loginResponse?.token?.let { AuthManager.setToken(it) }
                    loginResponse?.user?.id?.let { AuthManager.setUserId(it) }

                    if (loginResponse?.token != null && loginResponse.user?.id != null) {
                        val intent = Intent(this@LoginActivity, MainActivity::class.java) // This usage is now covered
                        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        startActivity(intent)
                        finish()
                    } else {
                        android.util.Log.e("LoginActivity", "Token: ${loginResponse?.token}, User ID: ${loginResponse?.user?.id}")
                        Toast.makeText(
                            this@LoginActivity,
                            "Login successful, but missing token or user ID.",
                            Toast.LENGTH_LONG
                        ).show()
                    }

                } else {
                    Toast.makeText(
                        this@LoginActivity,
                        "Login failed: ${response.code()} - ${response.errorBody()?.string()}",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }

            override fun onFailure(call: Call<LoginResponse>, t: Throwable) {
                Toast.makeText(
                    this@LoginActivity,
                    "Network error: ${t.message}",
                    Toast.LENGTH_SHORT
                ).show()
            }
        })
    }
}

data class LoginRequest(
    val username: String,
    val password: String
)

data class User(
    @SerializedName("_id")
    val id: String,
    val username: String,
    val role: String
)

data class LoginResponse(
    val token: String,
    val user: User,
    val message: String?
)