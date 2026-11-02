const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod, withMainApplication, withMainActivity } = require('expo/config-plugins');

const PACKAGE = 'com.ntacv.drift';
function insert(contents, anchor, addition) {
  if (contents.includes(addition.trim())) return contents;
  if (!contents.includes(anchor)) throw new Error(`PageTools: missing native integration anchor ${anchor}`);
  return contents.replace(anchor, `${anchor}\n${addition}`);
}
function withPageTools(config) {
  if (config.android?.package !== PACKAGE) throw new Error('PageTools requires the Drift Android package');
  config = withMainApplication(config, (mod) => {
    mod.modResults.contents = insert(mod.modResults.contents, 'PackageList(this).packages.apply {', '          add(PageToolsPackage())');
    return mod;
  });
  config = withMainActivity(config, (mod) => {
    mod.modResults.contents = insert(mod.modResults.contents, 'class MainActivity : ReactActivity() {', `
  override fun dispatchKeyEvent(event: android.view.KeyEvent): Boolean {
    if (PageToolsModule.handleKey(event)) return true
    return super.dispatchKeyEvent(event)
  }`);
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const destination = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', ...PACKAGE.split('.'));
    fs.mkdirSync(destination, { recursive: true });
    for (const name of ['PageToolsModule.kt', 'PageToolsPackage.kt', 'PageSource.kt']) {
      fs.copyFileSync(path.join(__dirname, 'android', name), path.join(destination, name));
    }
    return mod;
  }]);
}
module.exports = withPageTools;
module.exports.insert = insert;
