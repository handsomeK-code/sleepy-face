package com.team5.sleepyface.alarmringing

import android.Manifest
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
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

    AsyncFunction("getNotificationPermissionStatus") {
      getNotificationPermissionStatus()
    }

    AsyncFunction("requestNotificationPermission") { promise: Promise ->
      requestNotificationPermission(promise)
    }

    AsyncFunction("scheduleTestAlarmAfterSeconds") { seconds: Int ->
      scheduleTestAlarmAfterSeconds(seconds)
    }

    AsyncFunction("cancelScheduledTestAlarm") {
      cancelScheduledTestAlarm()
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

  private fun scheduleTestAlarmAfterSeconds(seconds: Int): Map<String, String> {
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

    val pendingIntent = createTestAlarmPendingIntent(alarmId, scheduledFor)
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
    alarmManager.cancel(createTestAlarmPendingIntent(null, null))
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
  ): PendingIntent {
    val intent = Intent(context, AlarmRingingReceiver::class.java).apply {
      action = ACTION_FIRE_TEST_ALARM
      alarmId?.let { putExtra(EXTRA_ALARM_ID, it) }
      scheduledFor?.let { putExtra(EXTRA_SCHEDULED_FOR, it) }
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
