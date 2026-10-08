// مجوزهای لازم را بعد از ساخت پروژهٔ اندروید به Manifest اضافه می‌کند
const fs = require('fs');
const p = 'android/app/src/main/AndroidManifest.xml';
let x = fs.readFileSync(p, 'utf8');
const perms = [
  'android.permission.CAMERA',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.ACCESS_WIFI_STATE',
  'android.permission.CHANGE_WIFI_MULTICAST_STATE'
];
for (const q of perms) {
  if (!x.includes(q)) {
    x = x.replace('</manifest>', '    <uses-permission android:name="' + q + '" />\n</manifest>');
  }
}
if (!x.includes('android.hardware.camera')) {
  x = x.replace('</manifest>', '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n</manifest>');
}
fs.writeFileSync(p, x);
console.log('Manifest patched');
