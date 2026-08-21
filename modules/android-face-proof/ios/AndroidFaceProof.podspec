Pod::Spec.new do |s|
  s.name           = 'AndroidFaceProof'
  s.version        = '1.0.0'
  s.summary        = 'Native face proof detection for Sleepy Face.'
  s.description    = 'Native face proof detection for Sleepy Face using ML Kit on Android and Vision on iOS.'
  s.author         = 'sleepy-face'
  s.homepage       = 'https://github.com/handsomeK-code/sleepy-face'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: 'https://github.com/handsomeK-code/sleepy-face.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift}"
end
