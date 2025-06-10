package com.example.paketnik_app

import android.os.Bundle
import android.util.Log
import android.view.MenuItem
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class UnlockHistoryActivity : AppCompatActivity() {

    private lateinit var recyclerViewUnlockHistory: RecyclerView
    private lateinit var unlockHistoryAdapter: UnlockHistoryAdapter
    private lateinit var textViewNoHistory: TextView
    private lateinit var progressBarHistory: ProgressBar

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_unlock_history)

        supportActionBar?.title = "Unlock History"
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        recyclerViewUnlockHistory = findViewById(R.id.recyclerViewUnlockHistory)
        textViewNoHistory = findViewById(R.id.textViewNoHistory)
        progressBarHistory = findViewById(R.id.progressBarHistory)

        recyclerViewUnlockHistory.layoutManager = LinearLayoutManager(this)
        unlockHistoryAdapter = UnlockHistoryAdapter(emptyList())
        recyclerViewUnlockHistory.adapter = unlockHistoryAdapter

        fetchUnlockHistory()
    }

    private fun fetchUnlockHistory() {
        progressBarHistory.visibility = View.VISIBLE
        textViewNoHistory.visibility = View.GONE
        recyclerViewUnlockHistory.visibility = View.GONE

        AuthRetrofitClient.instance.getUnlockHistory().enqueue(object : Callback<UnlockHistoryResponse> {
            override fun onResponse(call: Call<UnlockHistoryResponse>, response: Response<UnlockHistoryResponse>) {
                progressBarHistory.visibility = View.GONE
                if (response.isSuccessful) {
                    val historyResponse = response.body()
                    if (historyResponse != null && historyResponse.unlockEvents.isNotEmpty()) {
                        unlockHistoryAdapter.updateData(historyResponse.unlockEvents)
                        recyclerViewUnlockHistory.visibility = View.VISIBLE
                    } else {
                        textViewNoHistory.visibility = View.VISIBLE
                        Toast.makeText(this@UnlockHistoryActivity, "No unlock history found.", Toast.LENGTH_SHORT).show()
                    }
                } else {
                    textViewNoHistory.visibility = View.VISIBLE
                    Log.e("UnlockHistoryActivity", "Failed to fetch unlock history: ${response.code()} - ${response.errorBody()?.string()}")
                    Toast.makeText(this@UnlockHistoryActivity, "Failed to load history: ${response.message()}", Toast.LENGTH_LONG).show()
                }
            }

            override fun onFailure(call: Call<UnlockHistoryResponse>, t: Throwable) {
                progressBarHistory.visibility = View.GONE
                textViewNoHistory.visibility = View.VISIBLE
                Log.e("UnlockHistoryActivity", "Network error fetching unlock history: ${t.message}", t)
                Toast.makeText(this@UnlockHistoryActivity, "Network error: ${t.message}", Toast.LENGTH_LONG).show()
            }
        })
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (item.itemId == android.R.id.home) {
            finish() // Go back to the previous activity
            return true
        }
        return super.onOptionsItemSelected(item)
    }
}