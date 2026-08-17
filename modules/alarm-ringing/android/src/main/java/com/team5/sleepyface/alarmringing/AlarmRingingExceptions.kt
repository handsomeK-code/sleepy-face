package com.team5.sleepyface.alarmringing

import expo.modules.kotlin.exception.CodedException

internal class AlreadyRingingException :
  CodedException("already_ringing", "An alarm is already ringing.", null)

internal class ExactAlarmUnavailableException :
  CodedException("exact_alarm_unavailable", "Exact alarm access is unavailable.", null)

internal class NotificationPermissionDeniedException :
  CodedException("notification_permission_denied", "Notification permission is not granted.", null)

internal class NativeAlarmException(message: String, cause: Throwable? = null) :
  CodedException("native_alarm_error", message, cause)
