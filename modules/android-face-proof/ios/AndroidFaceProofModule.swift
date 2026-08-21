import ExpoModulesCore
import Foundation
import UIKit
import Vision

public final class AndroidFaceProofModule: Module {
  public func definition() -> ModuleDefinition {
    // Keep the JS-facing name aligned with the existing Android module so
    // src/services/face-proof.ts can use one native API on both platforms.
    Name("AndroidFaceProof")

    AsyncFunction("checkFaceProof") { (localPhotoUri: String) async -> [String: Any] in
      return await FaceProofVisionBridge.checkFaceProof(localPhotoUri: localPhotoUri)
    }
  }
}

private enum FaceProofVisionBridge {
  static func checkFaceProof(localPhotoUri: String) async -> [String: Any] {
    guard let imageURL = parseLocalFileURL(localPhotoUri) else {
      return invalidPhotoResult()
    }

    guard let image = UIImage(contentsOfFile: imageURL.path),
          let cgImage = image.cgImage
    else {
      return invalidPhotoResult()
    }

    let request = VNDetectFaceRectanglesRequest()
    let handler = VNImageRequestHandler(
      cgImage: cgImage,
      orientation: cgImageOrientation(for: image.imageOrientation),
      options: [:]
    )

    do {
      try handler.perform([request])
    } catch {
      return detectorErrorResult()
    }

    let faceCount = request.results?.count ?? 0

    if faceCount == 0 {
      return noFaceDetectedResult()
    }

    return [
      "faceCount": faceCount,
      "status": "passed"
    ]
  }

  private static func parseLocalFileURL(_ localPhotoUri: String) -> URL? {
    guard !localPhotoUri.isEmpty,
          let url = URL(string: localPhotoUri),
          url.isFileURL
    else {
      return nil
    }

    return url
  }

  private static func cgImageOrientation(
    for orientation: UIImage.Orientation
  ) -> CGImagePropertyOrientation {
    switch orientation {
    case .up:
      return .up
    case .down:
      return .down
    case .left:
      return .left
    case .right:
      return .right
    case .upMirrored:
      return .upMirrored
    case .downMirrored:
      return .downMirrored
    case .leftMirrored:
      return .leftMirrored
    case .rightMirrored:
      return .rightMirrored
    @unknown default:
      return .up
    }
  }

  private static func invalidPhotoResult() -> [String: Any] {
    return [
      "reason": "invalid-photo",
      "status": "failed"
    ]
  }

  private static func detectorErrorResult() -> [String: Any] {
    return [
      "reason": "detector-error",
      "status": "failed"
    ]
  }

  private static func noFaceDetectedResult() -> [String: Any] {
    return [
      "faceCount": 0,
      "reason": "no-face-detected",
      "status": "failed"
    ]
  }
}
