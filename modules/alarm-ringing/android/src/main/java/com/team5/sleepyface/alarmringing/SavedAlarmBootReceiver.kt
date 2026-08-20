package com.team5.sleepyface.alarmringing

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.HeadlessJsTaskService

class SavedAlarmBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) {
      return
    }

    val serviceIntent = Intent(context, SavedAlarmResyncTaskService::class.java)
    context.startService(serviceIntent)
    HeadlessJsTaskService.acquireWakeLockNow(context)
  }
}
