package com.team5.sleepyface.alarmringing

internal object AlarmRingingState {
  @Volatile
  var ringingAlarmId: String? = null

  @Volatile
  var ringingStartedAt: String? = null

  fun start(alarmId: String, startedAt: String) {
    ringingAlarmId = alarmId
    ringingStartedAt = startedAt
  }

  fun stop() {
    ringingAlarmId = null
    ringingStartedAt = null
  }

  fun isRinging(): Boolean = ringingAlarmId != null
}
