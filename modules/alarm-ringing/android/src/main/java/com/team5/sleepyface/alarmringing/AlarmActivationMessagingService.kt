package com.team5.sleepyface.alarmringing

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.delegates.FirebaseMessagingDelegate
import org.json.JSONObject
import java.time.Instant
import java.util.UUID

private const val ALARM_ACTIVATION_DATA_TYPE = "alarm-activation"

// The sole FirebaseMessagingService for this app: expo-notifications registers its own
// receiving service at intent-filter priority -1 (see its AndroidManifest.xml), so a
// service declared here at the default priority (0) is the one FCM actually delivers to
// -- only one FirebaseMessagingService ever receives a given message, and only one gets
// onNewToken/onDeletedMessages callbacks. That means this class is responsible for both
// jobs: starting Alarm Ringing directly for an Alarm Activation payload (so it works even
// with the JS/React Native process fully killed), and otherwise behaving exactly like
// expo-notifications' own ExpoFirebaseMessagingService -- by delegating to the same
// FirebaseMessagingDelegate it uses internally -- so existing push behavior (channel
// config, tap handling, JS-side listeners, token refresh) isn't lost by taking over here.
class AlarmActivationMessagingService : FirebaseMessagingService() {
  private val firebaseMessagingDelegate: FirebaseMessagingDelegate by lazy {
    FirebaseMessagingDelegate(this)
  }

  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    super.onMessageReceived(remoteMessage)

    val customData = parseCustomData(remoteMessage)

    if (customData?.optString("type") == ALARM_ACTIVATION_DATA_TYPE) {
      startAlarmActivation(customData)
      return
    }

    firebaseMessagingDelegate.onMessageReceived(remoteMessage)
  }

  override fun onNewToken(token: String) {
    super.onNewToken(token)
    firebaseMessagingDelegate.onNewToken(token)
  }

  override fun onDeletedMessages() {
    super.onDeletedMessages()
    firebaseMessagingDelegate.onDeletedMessages()
  }

  // Expo's Android push payload format (see expo-notifications' own NotificationData.kt)
  // does NOT put the caller's `data` object at a top-level RemoteMessage.data["<key>"] --
  // it JSON-encodes the whole `data` object into the single data["body"] key. data["title"]
  // and data["message"] carry the notification title/body text instead.
  private fun parseCustomData(remoteMessage: RemoteMessage): JSONObject? {
    return try {
      remoteMessage.data["body"]?.let { JSONObject(it) }
    } catch (error: Exception) {
      null
    }
  }

  // Deliberately does NOT call startForegroundService() directly: Android 12+ generally
  // blocks starting a foreground service from a background context (which an FCM handler
  // usually is, when the app is closed/backgrounded), so a direct call here would silently
  // fail exactly when this feature matters most. Routing through an immediate
  // AlarmManager.setAlarmClock() broadcast to AlarmRingingReceiver reuses the same
  // OS-granted exemption the local test/saved alarms already rely on to start ringing
  // reliably from a fully killed app state.
  private fun startAlarmActivation(customData: JSONObject) {
    val alarmId = "remote-activation-${UUID.randomUUID()}"
    val soundId = customData.optString("soundId").ifEmpty { null }
    val scheduledFor = Instant.now().toString()

    val intent = Intent(this, AlarmRingingReceiver::class.java).apply {
      action = ACTION_FIRE_REMOTE_ACTIVATION
      putExtra(EXTRA_ALARM_ID, alarmId)
      putExtra(EXTRA_SCHEDULED_FOR, scheduledFor)
      soundId?.let { putExtra(EXTRA_SOUND_ID, it) }
    }

    val pendingIntent = PendingIntent.getBroadcast(
      this,
      REMOTE_ACTIVATION_REQUEST_CODE,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val alarmClockInfo = AlarmManager.AlarmClockInfo(
      System.currentTimeMillis(),
      pendingIntent,
    )

    alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
  }
}
