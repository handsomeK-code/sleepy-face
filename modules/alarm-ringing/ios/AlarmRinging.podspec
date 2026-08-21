Pod::Spec.new do |s|
  s.name           = 'AlarmRinging'
  s.version        = '1.0.0'
  s.summary        = 'Native alarm scheduling for Sleepy Face.'
  s.description    = 'Native alarm scheduling for Sleepy Face using Android AlarmManager and iOS AlarmKit.'
  s.license        = 'UNLICENSED'
  s.author         = 'Team 5'
  s.homepage       = 'https://github.com/handsomeK-code/sleepy-face'
  s.platforms      = {
    :ios => '26.0'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/handsomeK-code/sleepy-face.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
