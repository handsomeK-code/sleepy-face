package com.team5.sleepyface.alarmringing

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

private const val SAVED_ALARM_BOOT_RESYNC_TASK_NAME = "SavedAlarmBootResync"
private const val TASK_TIMEOUT_MS = 30_000L

class SavedAlarmResyncTaskService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig {
    return HeadlessJsTaskConfig(
      SAVED_ALARM_BOOT_RESYNC_TASK_NAME,
      Arguments.createMap(),
      TASK_TIMEOUT_MS,
      true,
    )
  }
}
