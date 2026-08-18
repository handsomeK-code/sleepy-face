package com.team5.sleepyface.faceproof

import android.content.Context
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.IOException

class AndroidFaceProofModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AndroidFaceProof")

    AsyncFunction("checkFaceProof") { localPhotoUri: String, promise: Promise ->
      checkFaceProof(localPhotoUri, promise)
    }
  }

  private val context: Context?
    get() = appContext.reactContext ?: appContext.currentActivity

  private fun checkFaceProof(localPhotoUri: String, promise: Promise) {
    val imageUri = parseLocalFileUri(localPhotoUri)

    if (imageUri == null) {
      promise.resolve(invalidPhotoResult())
      return
    }

    val appContext = context

    if (appContext == null) {
      promise.resolve(detectorErrorResult())
      return
    }

    val image = try {
      InputImage.fromFilePath(appContext, imageUri)
    } catch (_: IOException) {
      promise.resolve(invalidPhotoResult())
      return
    } catch (_: RuntimeException) {
      promise.resolve(invalidPhotoResult())
      return
    }

    val detector = FaceDetection.getClient(
      FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
        .build(),
    )

    detector.process(image)
      .addOnSuccessListener { faces ->
        if (faces.isEmpty()) {
          promise.resolve(noFaceDetectedResult())
        } else {
          promise.resolve(
            mapOf(
              "faceCount" to faces.size,
              "status" to "passed",
            ),
          )
        }
      }
      .addOnFailureListener {
        promise.resolve(detectorErrorResult())
      }
      .addOnCompleteListener {
        detector.close()
      }
  }

  private fun parseLocalFileUri(localPhotoUri: String): Uri? {
    if (localPhotoUri.isBlank()) {
      return null
    }

    val uri = Uri.parse(localPhotoUri)

    if (uri.scheme != "file" || uri.path.isNullOrBlank()) {
      return null
    }

    return uri
  }

  private fun invalidPhotoResult() = mapOf(
    "reason" to "invalid-photo",
    "status" to "failed",
  )

  private fun detectorErrorResult() = mapOf(
    "reason" to "detector-error",
    "status" to "failed",
  )

  private fun noFaceDetectedResult() = mapOf(
    "faceCount" to 0,
    "reason" to "no-face-detected",
    "status" to "failed",
  )
}
