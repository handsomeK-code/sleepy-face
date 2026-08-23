package com.team5.sleepyface.alarmringing

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import expo.modules.interfaces.permissions.Permissions
import expo.modules.interfaces.permissions.PermissionsResponseListener
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.time.Instant
import java.util.UUID

class AlarmRingingModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AndroidAlarmMechanics")

    AsyncFunction("canScheduleExactAlarms") {
      canScheduleExactAlarms()
    }

    AsyncFunction("openExactAlarmSettings") {
      openExactAlarmSettings()
    }

    AsyncFunction("isIgnoringBatteryOptimizations") {
      isIgnoringBatteryOptimizations()
    }

    AsyncFunction("requestIgnoreBatteryOptimizations") {
      requestIgnoreBatteryOptimizations()
    }

    AsyncFunction("canUseFullScreenIntent") {
      canUseFullScreenIntent()
    }

    AsyncFunction("openFullScreenIntentSettings") {
      openFullScreenIntentSettings()
    }

    AsyncFunction("getNotificationPermissionStatus") {
      getNotificationPermissionStatus()
    }

    AsyncFunction("requestNotificationPermission") { promise: Promise ->
      requestNotificationPermission(promise)
    }

    AsyncFunction("scheduleTestAlarmAfterSeconds") { seconds: Int, soundId: String? ->
      scheduleTestAlarmAfterSeconds(seconds, soundId)
    }

    AsyncFunction("cancelScheduledTestAlarm") {
      cancelScheduledTestAlarm()
    }

    AsyncFunction("scheduleSavedAlarmOccurrence") {
        alarmId: String,
        triggerAtMillis: Long,
        soundId: String? ->
      scheduleSavedAlarmOccurrence(alarmId, triggerAtMillis, soundId)
    }

    AsyncFunction("cancelSavedAlarmOccurrence") { alarmId: String ->
      cancelSavedAlarmOccurrence(alarmId)
    }

    AsyncFunction("getRingingAlarmState") {
      getRingingAlarmState()
    }

    AsyncFunction("stopRingingAlarm") {
      stopRingingAlarm()
    }
  }

  private val context: Context
    get() = appContext.reactContext ?: throw NativeAlarmException("React context is unavailable.")

  private val alarmManager: AlarmManager
    get() = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  private fun canScheduleExactAlarms(): Boolean {
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
      alarmManager.canScheduleExactAlarms()
  }

  private fun openExactAlarmSettings() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      return
    }

    val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
      data = Uri.parse("package:${context.packageName}")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    context.startActivity(intent)
  }

  // setAlarmClock (used to schedule below) is documented to be exempt from Doze/App
  // Standby, but several OEM Android skins (this shipped on a Sharp AQUOS device) run
  // their own background-process killer on top of stock Android that can still swipe
  // the alarm away when the app is removed from Recents, regardless of that exemption.
  // Asking the user to whitelist the app from battery optimization is the standard,
  // Play-Store-compliant way to opt out of that OEM-level killing.
  private fun isIgnoringBatteryOptimizations(): Boolean {
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager

    return powerManager.isIgnoringBatteryOptimizations(context.packageName)
  }

  private fun requestIgnoreBatteryOptimizations() {
    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
      data = Uri.parse("package:${context.packageName}")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    context.startActivity(intent)
  }

  // USE_FULL_SCREEN_INTENT can't be requested via a runtime permission dialog -- it's a
  // "special app access" toggle the user grants (or was auto-granted on pre-14 devices).
  // Without it, a full-screen-intent notification just silently degrades to a normal
  // heads-up notification instead of launching the ringing screen.
  private fun canUseFullScreenIntent(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return true
    }

    val notificationManager =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    return notificationManager.canUseFullScreenIntent()
  }

  private fun openFullScreenIntentSettings() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return
    }

    val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
      data = Uri.parse("package:${context.packageName}")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    context.startActivity(intent)
  }

  private fun getNotificationPermissionStatus(): String {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      return "granted"
    }

    val activity = appContext.currentActivity

    return when {
      ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.POST_NOTIFICATIONS,
      ) == PackageManager.PERMISSION_GRANTED -> "granted"
      activity == null -> "undetermined"
      ActivityCompat.shouldShowRequestPermissionRationale(
        activity,
        Manifest.permission.POST_NOTIFICATIONS,
      ) -> "denied"
      else -> "undetermined"
    }
  }

  private fun requestNotificationPermission(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      promise.resolve("granted")
      return
    }

    if (ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.POST_NOTIFICATIONS,
      ) == PackageManager.PERMISSION_GRANTED
    ) {
      promise.resolve("granted")
      return
    }

    val permissions = appContext.legacyModuleRegistry.getModule(Permissions::class.java)
      ?: throw NativeAlarmException("Expo permissions service is unavailable.")

    permissions.askForPermissions(
      PermissionsResponseListener { result ->
        promise.resolve(
          result[Manifest.permission.POST_NOTIFICATIONS]?.status?.status
            ?: getNotificationPermissionStatus(),
        )
      },
      Manifest.permission.POST_NOTIFICATIONS,
    )
  }

  private fun scheduleTestAlarmAfterSeconds(
    seconds: Int,
    soundId: String?,
  ): Map<String, String> {
    if (AlarmRingingState.isRinging()) {
      throw AlreadyRingingException()
    }

    if (!canScheduleExactAlarms()) {
      throw ExactAlarmUnavailableException()
    }

    if (getNotificationPermissionStatus() != "granted") {
      throw NotificationPermissionDeniedException()
    }

    cancelScheduledTestAlarm()

    val triggerAtMillis = System.currentTimeMillis() + (seconds * 1000L)
    val scheduledFor = Instant.ofEpochMilli(triggerAtMillis).toString()
    val alarmId = UUID.randomUUID().toString()

    val pendingIntent = createTestAlarmPendingIntent(alarmId, scheduledFor, soundId)
    val alarmClockInfo = AlarmManager.AlarmClockInfo(
      triggerAtMillis,
      createShowIntent(alarmId, scheduledFor),
    )

    alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)

    return mapOf(
      "alarmId" to alarmId,
      "scheduledFor" to scheduledFor,
    )
  }

  private fun cancelScheduledTestAlarm() {
    alarmManager.cancel(createTestAlarmPendingIntent(null, null, null))
  }

  private fun scheduleSavedAlarmOccurrence(
    alarmId: String,
    triggerAtMillis: Long,
    soundId: String?,
  ): Map<String, String> {
    // Cancel any previously scheduled occurrence for this alarm ID first, before the
    // permission checks below. This way a failed reschedule (e.g. permission revoked)
    // never leaves a stale occurrence armed for the alarm's OLD time.
    cancelSavedAlarmOccurrence(alarmId)

    if (!canScheduleExactAlarms()) {
      throw ExactAlarmUnavailableException()
    }

    if (getNotificationPermissionStatus() != "granted") {
      throw NotificationPermissionDeniedException()
    }

    val scheduledFor = Instant.ofEpochMilli(triggerAtMillis).toString()
    val pendingIntent = createSavedAlarmPendingIntent(alarmId, scheduledFor, soundId)
    val alarmClockInfo = AlarmManager.AlarmClockInfo(
      triggerAtMillis,
      createSavedAlarmShowIntent(alarmId, scheduledFor),
    )

    alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)

    return mapOf(
      "alarmId" to alarmId,
      "scheduledFor" to scheduledFor,
    )
  }

  private fun cancelSavedAlarmOccurrence(alarmId: String) {
    alarmManager.cancel(createSavedAlarmPendingIntent(alarmId, null, null))
  }

  // hashCode() collisions would silently make two Saved Alarms share a PendingIntent.
  // Accepted here because the app enforces at most one Saved Alarm per weekday (7 max
  // concurrent alarms), making a 32-bit hash collision astronomically unlikely; a
  // persistent alarmId -> requestCode allocation table would be needed to fully rule
  // it out for an unbounded alarm count.
  private fun requestCodeForSavedAlarm(alarmId: String): Int = alarmId.hashCode()

  private fun createSavedAlarmPendingIntent(
    alarmId: String,
    scheduledFor: String?,
    soundId: String?,
  ): PendingIntent {
    val intent = Intent(context, AlarmRingingReceiver::class.java).apply {
      action = ACTION_FIRE_SAVED_ALARM
      putExtra(EXTRA_ALARM_ID, alarmId)
      scheduledFor?.let { putExtra(EXTRA_SCHEDULED_FOR, it) }
      soundId?.let { putExtra(EXTRA_SOUND_ID, it) }
    }

    return PendingIntent.getBroadcast(
      context,
      requestCodeForSavedAlarm(alarmId),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun createSavedAlarmShowIntent(alarmId: String, scheduledFor: String): PendingIntent {
    val ringingUri = Uri.parse("sleepyface:///ringing")
      .buildUpon()
      .appendQueryParameter(EXTRA_ALARM_ID, alarmId)
      .appendQueryParameter(EXTRA_SCHEDULED_FOR, scheduledFor)
      .build()

    val launchIntent = Intent(Intent.ACTION_VIEW, ringingUri).setPackage(context.packageName)

    launchIntent.apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }

    return PendingIntent.getActivity(
      context,
      requestCodeForSavedAlarm(alarmId),
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun getRingingAlarmState(): Map<String, String>? {
    val alarmId = AlarmRingingState.ringingAlarmId ?: return null
    val startedAt = AlarmRingingState.ringingStartedAt ?: return null

    return mapOf(
      "alarmId" to alarmId,
      "startedAt" to startedAt,
    )
  }

  private fun stopRingingAlarm() {
    val intent = Intent(context, AlarmRingingService::class.java).apply {
      action = ACTION_STOP_RINGING
    }

    context.startService(intent)
  }

  private fun createTestAlarmPendingIntent(
    alarmId: String?,
    scheduledFor: String?,
    soundId: String?,
  ): PendingIntent {
    val intent = Intent(context, AlarmRingingReceiver::class.java).apply {
      action = ACTION_FIRE_TEST_ALARM
      alarmId?.let { putExtra(EXTRA_ALARM_ID, it) }
      scheduledFor?.let { putExtra(EXTRA_SCHEDULED_FOR, it) }
      soundId?.let { putExtra(EXTRA_SOUND_ID, it) }
    }

    return PendingIntent.getBroadcast(
      context,
      TEST_ALARM_REQUEST_CODE,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun createShowIntent(alarmId: String, scheduledFor: String): PendingIntent {
    val ringingUri = Uri.parse("sleepyface:///ringing")
      .buildUpon()
      .appendQueryParameter(EXTRA_ALARM_ID, alarmId)
      .appendQueryParameter(EXTRA_SCHEDULED_FOR, scheduledFor)
      .build()

    val launchIntent = Intent(Intent.ACTION_VIEW, ringingUri).setPackage(context.packageName)

    launchIntent.apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }

    return PendingIntent.getActivity(
      context,
      FULL_SCREEN_REQUEST_CODE,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
