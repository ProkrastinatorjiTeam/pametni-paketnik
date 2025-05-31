package com.example.paketnik_app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import android.graphics.Bitmap
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.util.Log
import java.io.File
import java.io.FileOutputStream

class RegisterActivity : AppCompatActivity() {

    private lateinit var firstNameEditText: EditText
    private lateinit var lastNameEditText: EditText
    private lateinit var emailEditText: EditText
    private lateinit var usernameEditText: EditText
    private lateinit var passwordEditText: EditText
    private lateinit var faceScanButton: Button
    private lateinit var registerButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register)

        firstNameEditText = findViewById(R.id.editTextFirstName)
        lastNameEditText = findViewById(R.id.editTextLastName)
        emailEditText = findViewById(R.id.editTextEmail)
        usernameEditText = findViewById(R.id.editTextUsername)
        passwordEditText = findViewById(R.id.editTextPassword)
        registerButton = findViewById(R.id.buttonRegister)

        registerButton.setOnClickListener {
            val firstName = firstNameEditText.text.toString()
            val lastName = lastNameEditText.text.toString()
            val email = emailEditText.text.toString()
            val username = usernameEditText.text.toString()
            val password = passwordEditText.text.toString()

            if (firstName.isBlank() || lastName.isBlank() || email.isBlank() || username.isBlank() || password.isBlank()) {
                Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            registerUser(RegisterRequest(firstName, lastName, email, username, password))
        }
    }

    private fun registerUser(request: RegisterRequest) {
        RetrofitClient.instance.registerUser(request).enqueue(object : Callback<RegisterResponse> {
            override fun onResponse(
                call: Call<RegisterResponse>,
                response: Response<RegisterResponse>
            ) {
                if (response.isSuccessful) {
                    Toast.makeText(
                        this@RegisterActivity,
                        "Registration successful! Starting face scan...",
                        Toast.LENGTH_LONG
                    ).show()

                    // Start FaceScanActivity
                    val intent = Intent(this@RegisterActivity, FaceScanActivity::class.java)
                    startActivity(intent)
                    finish()
                } else {
                    Toast.makeText(
                        this@RegisterActivity,
                        "Registration error: ${response.code()}",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }

            override fun onFailure(call: Call<RegisterResponse>, t: Throwable) {
                Toast.makeText(
                    this@RegisterActivity,
                    "Network error: ${t.message}",
                    Toast.LENGTH_SHORT
                ).show()
            }
        })
    }

    private fun extractFrames(videoUri: Uri) {
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
        val outputDirectory = File(getExternalFilesDir(null), "FaceScanImages").apply {
            if (!exists()) mkdirs()
        }
        val file = File(outputDirectory, "frame_$frameIndex.png")
        FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        Log.d("RegisterActivity", "Saved frame: ${file.absolutePath}")
    }

    companion object {
        private const val FACE_SCAN_REQUEST_CODE = 1002
    }
}

data class RegisterRequest(
    val firstName: String,
    val lastName: String,
    val email: String,
    val username: String,
    val password: String
)

data class RegisterResponse(
    val success: Boolean,
    val message: String
)