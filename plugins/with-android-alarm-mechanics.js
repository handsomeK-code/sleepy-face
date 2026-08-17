const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

function withAndroidAlarmMechanics(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(
      configWithManifest.modResults,
    );

    mainActivity.$['android:showWhenLocked'] = 'true';
    mainActivity.$['android:turnScreenOn'] = 'true';

    return configWithManifest;
  });
}

module.exports = withAndroidAlarmMechanics;
