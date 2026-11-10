// Android アプリに同梱する Web ファイルを www/ にコピーする
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const item of ['index.html', 'style.css', 'game.js', 'ads.js']) {
  const src = path.join(root, item);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(out, item), { recursive: true });
}
// Web 版だけの部分（Google Play へのリンクなど）を、アプリに同梱するファイルから取り除く。
// JS は // web-only:start 〜 // web-only:end、HTML は <!-- web-only --> 〜 <!-- /web-only --> で囲む。
// アプリのバンドルに他社ストアへのリンクや、それを隠す処理を残さないため（iOS 審査 Guideline 5.6 の対策）
for (const file of ['index.html', 'game.js', 'style.css']) {
  const p = path.join(out, file);
  let text = fs.readFileSync(p, 'utf8');
  text = text
    .replace(/[ \t]*\/\/ web-only:start[\s\S]*?\/\/ web-only:end[^\n]*\n?/g, '')
    .replace(/[ \t]*<!-- web-only -->[\s\S]*?<!-- \/web-only -->[^\n]*\n?/g, '');
  fs.writeFileSync(p, text);
}
for (const file of fs.readdirSync(out)) {
  const text = fs.readFileSync(path.join(out, file), 'utf8');
  if (/play\.google\.com|web-only/.test(text)) {
    console.error(`Web 版だけの部分が ${file} に残っています（web-only の目印を確認してください）`);
    process.exit(1);
  }
}

// Google Play 用のビルドでは本番の広告を使う
const mode = process.env.ADMOB_MODE === 'production' ? 'production' : 'test';
fs.writeFileSync(path.join(out, 'ads-config.js'), `// ビルド時に生成\nwindow.AD_MODE = '${mode}';\n`);
// タイトル画面に出すバージョン（CI では VERSION_NAME / VERSION_CODE を使う）
const version = process.env.VERSION_CODE
  ? `v${process.env.VERSION_NAME || require('../package.json').version} (build ${process.env.VERSION_CODE})`
  : 'dev';
fs.writeFileSync(path.join(out, 'build-info.js'), `// ビルド時に生成\nwindow.APP_VERSION = '${version}';\n`);
console.log(`built web assets into www/ (ads: ${mode}, version: ${version})`);
