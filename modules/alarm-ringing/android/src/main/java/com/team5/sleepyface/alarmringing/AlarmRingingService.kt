package com.team5.sleepyface.alarmringing

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import java.time.Instant

class AlarmRingingService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var mediaPlayer: MediaPlayer? = null

  private val safetyStop = Runnable {
    stopRinging()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_FIRE_TEST_ALARM, ACTION_FIRE_SAVED_ALARM -> {
        val alarmId = intent.getStringExtra(EXTRA_ALARM_ID) ?: return START_NOT_STICKY
        startRinging(alarmId)
      }
      ACTION_STOP_RINGING -> stopRinging()
    }

    return START_NOT_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(safetyStop)
    stopDefaultAlarmTone()
    AlarmRingingState.stop()
    super.onDestroy()
  }

  private fun startRinging(alarmId: String) {
    val startedAt = Instant.now().toString()
    AlarmRingingState.start(alarmId, startedAt)
    createNotificationChannel()

    startForeground(
      NOTIFICATION_ID,
      buildNotification(alarmId, startedAt),
    )

    playDefaultAlarmTone()
    handler.removeCallbacks(safetyStop)
    handler.postDelayed(safetyStop, SAFETY_TIMEOUT_MS)
  }

  private fun stopRinging() {
    handler.removeCallbacks(safetyStop)
    stopDefaultAlarmTone()
    AlarmRingingState.stop()
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun playDefaultAlarmTone() {
    stopDefaultAlarmTone()

    val alarmToneUri: Uri =
      RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

    mediaPlayer = MediaPlayer().apply {
      setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
      setDataSource(applicationContext, alarmToneUri)
      isLooping = true
      prepare()
      start()
    }
  }

  private fun stopDefaultAlarmTone() {
    mediaPlayer?.apply {
      if (isPlaying) {
        stop()
      }
      release()
    }
    mediaPlayer = null
  }

  private fun buildNotification(alarmId: String, startedAt: String) =
    NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("Alarm ringing")
      .setContentText("Alarm is ringing.")
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setOngoing(true)
      .setAutoCancel(false)
      .setFullScreenIntent(createRingingPendingIntent(alarmId, startedAt), true)
      .setContentIntent(createRingingPendingIntent(alarmId, startedAt))
      .build()
  private fun createRingingPendingIntent(alarmId: String, startedAt: String): PendingIntent {
    val ringingUri = Uri.parse("sleepyface:///ringing")
      .buildUpon()
      .appendQueryParameter(EXTRA_ALARM_ID, alarmId)
      .appendQueryParameter(EXTRA_STARTED_AT, startedAt)
      .build()

    val launchIntent = Intent(Intent.ACTION_VIEW, ringingUri).setPackage(packageName)

    launchIntent.apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      putExtra(EXTRA_ALARM_ID, alarmId)
      putExtra(EXTRA_STARTED_AT, startedAt)
    }

    return PendingIntent.getActivity(
      this,
      FULL_SCREEN_REQUEST_CODE,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val channel = NotificationChannel(
      NOTIFICATION_CHANNEL_ID,
      "Android Alarm Mechanics",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "Test alarm ringing alerts."
      setSound(null, null)
      enableVibration(false)
      lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
    }

    val notificationManager =
      getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    notificationManager.createNotificationChannel(channel)
  }
}
