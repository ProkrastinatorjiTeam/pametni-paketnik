package com.example.paketnik_app

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

class UnlockHistoryAdapter(private var events: List<UnlockEvent>) :
    RecyclerView.Adapter<UnlockHistoryAdapter.UnlockEventViewHolder>() {

    private val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    private val outputFormat = SimpleDateFormat("dd MMM yyyy, HH:mm:ss", Locale.getDefault())

    init {
        inputFormat.timeZone = TimeZone.getTimeZone("UTC") // Ensure input is parsed as UTC
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): UnlockEventViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_unlock_event, parent, false)
        return UnlockEventViewHolder(view)
    }

    override fun onBindViewHolder(holder: UnlockEventViewHolder, position: Int) {
        val event = events[position]
        holder.bind(event)
    }

    override fun getItemCount(): Int = events.size

    fun updateData(newEvents: List<UnlockEvent>) {
        events = newEvents.sortedByDescending { it.timestamp } // Sort by newest first
        notifyDataSetChanged()
    }

    inner class UnlockEventViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val boxIdTextView: TextView = itemView.findViewById(R.id.textViewBoxId)
        private val timestampTextView: TextView = itemView.findViewById(R.id.textViewTimestamp)
        private val successTextView: TextView = itemView.findViewById(R.id.textViewSuccess)

        fun bind(event: UnlockEvent) {
            boxIdTextView.text = "Box ID: ${event.box}"
            try {
                val date = inputFormat.parse(event.timestamp)
                timestampTextView.text = if (date != null) "Time: ${outputFormat.format(date)}" else "Time: Invalid date"
            } catch (e: Exception) {
                timestampTextView.text = "Time: ${event.timestamp}" // Fallback
            }
            successTextView.text = "Status: ${if (event.success) "Successful Unlock" else "Unlock Failed"}"
        }
    }
}