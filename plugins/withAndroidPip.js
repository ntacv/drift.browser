const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin that sets android:supportsPictureInPicture="true" on
 * the main activity so the OS allows the app to enter Android PiP mode and
 * so that the embedded WebView can use the W3C Picture-in-Picture API.
 */
module.exports = function withAndroidPip(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];
    if (!application?.activity) {
      return config;
    }

    application.activity.forEach((activity) => {
      if (activity.$['android:name'] === '.MainActivity') {
        activity.$['android:supportsPictureInPicture'] = 'true';
      }
    });

    return config;
  });
};
