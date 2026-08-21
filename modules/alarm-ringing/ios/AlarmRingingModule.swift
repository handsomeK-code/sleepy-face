import ExpoModulesCore
import Foundation

#if canImport(AlarmKit)
import AppIntents
import AlarmKit
import SwiftUI
#endif

public final class AlarmRingingModule: Module {
  public func definition() -> ModuleDefinition {
    // Keep the existing JS-facing module name so Android and iOS can share
    // src/services/android-alarm-mechanics.ts for now.
    Name("AndroidAlarmMechanics")

    AsyncFunction("canScheduleExactAlarms") { () async throws -> Bool in
      return try await AlarmKitBridge.canScheduleAlarms()
    }

    AsyncFunction("openExactAlarmSettings") { () async throws -> Void in
      try await AlarmKitBridge.requestAuthorization()
    }

    AsyncFunction("getNotificationPermissionStatus") { () async throws -> String in
      return try await AlarmKitBridge.authorizationStatus()
    }

    AsyncFunction("requestNotificationPermission") { () async throws -> String in
      return try await AlarmKitBridge.requestAuthorizationStatus()
    }

    AsyncFunction("scheduleTestAlarmAfterSeconds") { (seconds: Int) async throws -> [String: String] in
      let alarmID = "test-alarm"
      let triggerAtMillis = Int64(Date().timeIntervalSince1970 * 1000) + Int64(seconds * 1000)

      return try await AlarmKitBridge.scheduleAlarm(
        alarmID: alarmID,
        triggerAtMillis: triggerAtMillis
      )
    }

    AsyncFunction("cancelScheduledTestAlarm") { () async throws -> Void in
      try await AlarmKitBridge.cancelAlarm(alarmID: "test-alarm")
    }

    AsyncFunction("scheduleSavedAlarmOccurrence") { (alarmID: String, triggerAtMillis: Int64) async throws -> [String: String] in
      return try await AlarmKitBridge.scheduleAlarm(
        alarmID: alarmID,
        triggerAtMillis: triggerAtMillis
      )
    }

    AsyncFunction("cancelSavedAlarmOccurrence") { (alarmID: String) async throws -> Void in
      try await AlarmKitBridge.cancelAlarm(alarmID: alarmID)
    }

    AsyncFunction("getRingingAlarmState") { () -> [String: String]? in
      // AlarmKit owns the lock-screen alert state. The React Native ringing
      // screen can be opened from the app after the alert brings the user back.
      return nil
    }

    AsyncFunction("stopRingingAlarm") { () async throws -> Void in
      // No-op until the iOS wake flow stores the currently alerting AlarmKit ID.
    }

    AsyncFunction("consumePendingWakeChallengeRoute") { () -> [String: String]? in
      return AlarmKitBridge.consumePendingWakeChallengeRoute()
    }
  }
}

private enum AlarmKitBridge {
  private static let pendingWakeChallengeAlarmIDKey =
    "sleepy-face:pending-wake-challenge:alarm-id"
  private static let pendingWakeChallengeStartedAtKey =
    "sleepy-face:pending-wake-challenge:started-at"

  static func canScheduleAlarms() async throws -> Bool {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      return try await requestAuthorization()
    }
    #endif

    throw AlarmKitUnavailableException()
  }

  static func authorizationStatus() async throws -> String {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      switch AlarmManager.shared.authorizationState {
      case .authorized:
        return "granted"
      case .denied:
        return "denied"
      default:
        return "undetermined"
      }
    }
    #endif

    throw AlarmKitUnavailableException()
  }

  @discardableResult
  static func requestAuthorization() async throws -> Bool {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      let state = try await AlarmManager.shared.requestAuthorization()
      return state == .authorized
    }
    #endif

    throw AlarmKitUnavailableException()
  }

  static func requestAuthorizationStatus() async throws -> String {
    return try await requestAuthorization() ? "granted" : "denied"
  }

  static func scheduleAlarm(
    alarmID: String,
    triggerAtMillis: Int64
  ) async throws -> [String: String] {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      guard try await requestAuthorization() else {
        throw AlarmKitAuthorizationDeniedException()
      }

      let id = stableUUID(from: alarmID)
      let date = Date(timeIntervalSince1970: TimeInterval(triggerAtMillis) / 1000)
      let schedule = Alarm.Schedule.fixed(date)
      let wakeChallengeIntent = OpenWakeChallengeIntent(
        alarmID: alarmID,
        startedAt: date.ISO8601Format()
      )

      // AlarmKit provides the stop control automatically. We connect both the
      // stop action and the secondary action to Sleepy Face so stopping the
      // system alarm still returns the user to the wake challenge flow.
      // iOS 26.0 still needs the deprecated stopButton initializer. The newer
      // initializer without stopButton is only available from iOS 26.1.
      let alert = AlarmPresentation.Alert(
        title: "眠そうな顔",
        stopButton: AlarmButton(
          text: "停止",
          textColor: .white,
          systemImageName: "stop.fill"
        ),
        secondaryButton: AlarmButton(
          text: "起床確認",
          textColor: .white,
          systemImageName: "camera.fill"
        ),
        secondaryButtonBehavior: .custom
      )
      let presentation = AlarmPresentation(alert: alert)
      let attributes = AlarmAttributes(
        presentation: presentation,
        metadata: SleepyFaceAlarmMetadata(alarmID: alarmID),
        tintColor: Color.black
      )
      let configuration = AlarmManager.AlarmConfiguration.alarm(
        schedule: schedule,
        attributes: attributes,
        stopIntent: wakeChallengeIntent,
        secondaryIntent: wakeChallengeIntent
      )

      try? await AlarmManager.shared.cancel(id: id)
      _ = try await AlarmManager.shared.schedule(
        id: id,
        configuration: configuration
      )

      return [
        "alarmId": alarmID,
        "scheduledFor": date.ISO8601Format()
      ]
    }
    #endif

    throw AlarmKitUnavailableException()
  }

  static func cancelAlarm(alarmID: String) async throws {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      try await AlarmManager.shared.cancel(id: stableUUID(from: alarmID))
      return
    }
    #endif

    throw AlarmKitUnavailableException()
  }

  static func stopAlarm(alarmID: String) {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      try? AlarmManager.shared.stop(id: stableUUID(from: alarmID))
    }
    #endif
  }

  static func storePendingWakeChallengeRoute(alarmID: String, startedAt: String) {
    let defaults = UserDefaults.standard
    defaults.set(alarmID, forKey: pendingWakeChallengeAlarmIDKey)
    defaults.set(startedAt, forKey: pendingWakeChallengeStartedAtKey)
  }

  static func consumePendingWakeChallengeRoute() -> [String: String]? {
    let defaults = UserDefaults.standard
    guard let alarmID = defaults.string(forKey: pendingWakeChallengeAlarmIDKey) else {
      return nil
    }

    let startedAt = defaults.string(forKey: pendingWakeChallengeStartedAtKey)
      ?? Date().ISO8601Format()

    defaults.removeObject(forKey: pendingWakeChallengeAlarmIDKey)
    defaults.removeObject(forKey: pendingWakeChallengeStartedAtKey)

    return [
      "alarmId": alarmID,
      "startedAt": startedAt
    ]
  }

  private static func stableUUID(from value: String) -> UUID {
    let bytes = Array(value.utf8)
    var uuidBytes = [UInt8](repeating: 0, count: 16)

    for (index, byte) in bytes.enumerated() {
      uuidBytes[index % 16] = uuidBytes[index % 16] &+ byte &+ UInt8(index & 0xff)
    }

    // Mark as UUIDv5-like and RFC 4122 variant so the string is stable and valid.
    uuidBytes[6] = (uuidBytes[6] & 0x0f) | 0x50
    uuidBytes[8] = (uuidBytes[8] & 0x3f) | 0x80

    return UUID(uuid: (
      uuidBytes[0],
      uuidBytes[1],
      uuidBytes[2],
      uuidBytes[3],
      uuidBytes[4],
      uuidBytes[5],
      uuidBytes[6],
      uuidBytes[7],
      uuidBytes[8],
      uuidBytes[9],
      uuidBytes[10],
      uuidBytes[11],
      uuidBytes[12],
      uuidBytes[13],
      uuidBytes[14],
      uuidBytes[15]
    ))
  }
}

#if canImport(AlarmKit)
@available(iOS 26.0, *)
private struct SleepyFaceAlarmMetadata: AlarmMetadata {
  let alarmID: String
}

@available(iOS 26.0, *)
public struct OpenWakeChallengeIntent: LiveActivityIntent {
  public static var title: LocalizedStringResource = "起床確認を開く"
  public static var supportedModes: IntentModes = .foreground(.immediate)

  @Parameter(title: "Alarm ID")
  var alarmID: String

  @Parameter(title: "Started At")
  var startedAt: String

  public init() {
    alarmID = ""
    startedAt = ""
  }

  public init(alarmID: String, startedAt: String) {
    self.alarmID = alarmID
    self.startedAt = startedAt
  }

  public func perform() async throws -> some IntentResult & OpensIntent {
    let wakeChallengeStartedAt = startedAt.isEmpty ? Date().ISO8601Format() : startedAt

    AlarmKitBridge.stopAlarm(alarmID: alarmID)
    AlarmKitBridge.storePendingWakeChallengeRoute(
      alarmID: alarmID,
      startedAt: wakeChallengeStartedAt
    )

    var components = URLComponents(string: "sleepyface:///face-check")
    components?.queryItems = [
      URLQueryItem(name: "alarmId", value: alarmID),
      URLQueryItem(name: "badPhotoAttempts", value: "0"),
      URLQueryItem(name: "startedAt", value: wakeChallengeStartedAt)
    ]

    guard let url = components?.url else {
      return .result()
    }

    return .result(opensIntent: OpenURLIntent(url))
  }
}
#endif

private final class AlarmKitUnavailableException: Exception {
  override var reason: String {
    "AlarmKit is available only on iOS 26.0 or newer."
  }
}

private final class AlarmKitAuthorizationDeniedException: Exception {
  override var reason: String {
    "AlarmKit authorization was denied."
  }
}
