// Builds the Android installer (.apk) into dist/.
//  - Default: a debug-signed APK. It installs fine on any phone (allow "install unknown apps").
//  - With ANDROID_KEYSTORE, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD set:
//    a release APK signed with your own key (needed for Play Store style updates).
import { existsSync, readFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const win = process.platform === 'win32';
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const androidDir = join(root, 'android');
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });
const gradlew = join(androidDir, win ? 'gradlew.bat' : 'gradlew');
const gradle = task => execFileSync(gradlew, [task], { cwd: androidDir, stdio: 'inherit', shell: win });
const outName = join(dist, `ShopDesk-Ghana-${pkg.version}.apk`);

if (!process.env.ANDROID_KEYSTORE) {
  gradle('assembleDebug');
  copyFileSync(join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'), outName);
  console.log('Built (debug-signed):', outName);
} else {
  gradle('assembleRelease');
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  const btRoot = join(sdk, 'build-tools');
  const bt = join(btRoot, readdirSync(btRoot).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop());
  const tool = n => join(bt, win ? n + '.bat' : n);
  const rel = join(androidDir, 'app', 'build', 'outputs', 'apk', 'release');
  const unsigned = join(rel, existsSync(join(rel, 'app-release-unsigned.apk')) ? 'app-release-unsigned.apk' : 'app-release.apk');
  const aligned = join(rel, 'aligned.apk');
  execFileSync(join(bt, win ? 'zipalign.exe' : 'zipalign'), ['-f', '-p', '4', unsigned, aligned], { stdio: 'inherit' });
  execFileSync(tool('apksigner'), ['sign', '--ks', process.env.ANDROID_KEYSTORE,
    '--ks-pass', 'pass:' + process.env.ANDROID_KEYSTORE_PASSWORD,
    '--ks-key-alias', process.env.ANDROID_KEY_ALIAS,
    '--key-pass', 'pass:' + (process.env.ANDROID_KEY_PASSWORD || process.env.ANDROID_KEYSTORE_PASSWORD),
    '--out', outName, aligned], { stdio: 'inherit', shell: win });
  console.log('Built (release-signed):', outName);
}
