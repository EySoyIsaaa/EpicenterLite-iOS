Pod::Spec.new do |s|
  s.name = 'EpicenterNativeIos'
  s.version = '1.0.0'
  s.summary = 'Epicenter native iOS Capacitor plugin'
  s.license = 'MIT'
  s.homepage = 'https://github.com/EySoyIsaaa/EpicenterIphone'
  s.author = { 'EySoyIsaaa' => 'https://github.com/EySoyIsaaa' }
  s.source = { :path => '.' }
  s.ios.deployment_target = '15.6'
  s.swift_version = '5.0'
  s.source_files = 'ios/Plugins/*.swift', 'ios/NativeAudio/*.swift', 'ios/DSP/*.{swift,h,hpp,mm,cpp}'
  s.public_header_files = 'ios/DSP/EpicenterDSPBridge.h'
  s.pod_target_xcconfig = { 'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17', 'CLANG_CXX_LIBRARY' => 'libc++', 'IPHONEOS_DEPLOYMENT_TARGET' => '15.6' }
  s.static_framework = true
  s.dependency 'Capacitor'
  # Keep the version-2 Swift symbols used by this Capacitor 6 bridge.
  s.dependency 'GoogleUserMessagingPlatform', '2.7.0'
  s.frameworks = 'AVFoundation', 'MediaPlayer', 'UIKit', 'UniformTypeIdentifiers', 'Accelerate'
  s.libraries = 'sqlite3'
end
