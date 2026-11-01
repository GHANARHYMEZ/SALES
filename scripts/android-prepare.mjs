// Creates (first time) and prepares the Android project in android/.
// Safe to run again: it re-applies the small native pieces and re-syncs www/.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const run = cmd => execSync(cmd, { stdio: 'inherit', cwd: root });
const cfg = JSON.parse(readFileSync(join(root, 'capacitor.config.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

if (!existsSync(join(root, 'android'))) run('npx cap add android');

// Native pieces: Android's WebView cannot print by itself, so a tiny plugin hands the page to
// Android's print service. Printing then works the same as on the other versions.
const pkgName = cfg.appId;
const dir = join(root, 'android', 'app', 'src', 'main', 'java', ...pkgName.split('.'));
mkdirSync(dir, { recursive: true });

writeFileSync(join(dir, 'PrintPlugin.java'), `package ${pkgName};

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PrintPage")
public class PrintPlugin extends Plugin {
    @PluginMethod
    public void print(final PluginCall call) {
        final String job = call.getString("name", "ShopDesk Ghana");
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    WebView webView = getBridge().getWebView();
                    PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                    PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(job);
                    pm.print(job, adapter, new PrintAttributes.Builder().build());
                    call.resolve();
                } catch (Exception e) {
                    call.reject(e.getMessage());
                }
            }
        });
    }
}
`);

writeFileSync(join(dir, 'MainActivity.java'), `package ${pkgName};

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PrintPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`);

// Version numbers: name from package.json, code from the CI run number (or VERSION_CODE).
const gradlePath = join(root, 'android', 'app', 'build.gradle');
let gradle = readFileSync(gradlePath, 'utf8');
const code = process.env.VERSION_CODE || process.env.GITHUB_RUN_NUMBER || '1';
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${code}`).replace(/versionName\s+"[^"]*"/, `versionName "${pkg.version}"`);
writeFileSync(gradlePath, gradle);

run('npx capacitor-assets generate --android');
run('npx cap sync android');
console.log('Android project ready.');
