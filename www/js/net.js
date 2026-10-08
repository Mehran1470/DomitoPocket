// اتصال مستقیم دو گوشی با WebRTC، بدون سرور و بدون اینترنت.
// رد و بدل کردن کد (آفر/آنسر) دستی انجام می‌شود (کپی/پیست؛ بعداً QR).

const RTC_CFG = { iceServers: [] }; // فقط شبکهٔ محلی

// اگر مجوز دوربین داده شده باشد، مرورگر آدرس واقعی شبکه را نشان می‌دهد
// (نه آدرس‌های .local که روی هات‌اسپات گاهی کار نمی‌کنند).
async function unlockLocalIPs() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    const s = await navigator.mediaDevices.getUserMedia({ video: true });
    s.getTracks().forEach(t => t.stop());
  } catch (e) { /* مجوز داده نشد؛ ادامه می‌دهیم */ }
}

function waitIce(pc, ms = 2500) {
  return new Promise(resolve => {
    if (pc.iceGatheringState === 'complete') return resolve();
    let t;
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', chk);
      clearTimeout(t);
      resolve();
    };
    const chk = () => { if (pc.iceGatheringState === 'complete') done(); };
    pc.addEventListener('icegatheringstatechange', chk);
    t = setTimeout(done, ms);
  });
}

function toB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

function fromB64(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pack(desc) {
  let bytes = new TextEncoder().encode(JSON.stringify({ t: desc.type, s: desc.sdp }));
  let flag = '0';
  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('deflate-raw');
    const w = cs.writable.getWriter();
    w.write(bytes); w.close();
    bytes = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    flag = '1';
  }
  return 'DP' + flag + toB64(bytes);
}

async function unpack(code) {
  code = (code || '').replace(/\s+/g, '');
  if (!code.startsWith('DP')) throw new Error('کد معتبر نیست');
  const flag = code[2];
  let bytes = fromB64(code.slice(3));
  if (flag === '1') {
    const ds = new DecompressionStream('deflate-raw');
    const w = ds.writable.getWriter();
    w.write(bytes); w.close();
    bytes = new Uint8Array(await new Response(ds.readable).arrayBuffer());
  }
  const o = JSON.parse(new TextDecoder().decode(bytes));
  return { type: o.t, sdp: o.s };
}

export class Link {
  constructor() {
    this.pc = new RTCPeerConnection(RTC_CFG);
    this.ch = null;
    this.onopen = () => {};
    this.onmessage = () => {};
    this.onclose = () => {};
    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState;
      if (s === 'failed' || s === 'disconnected' || s === 'closed') this.onclose(s);
    };
  }
  _wire(ch) {
    this.ch = ch;
    ch.onopen = () => this.onopen();
    ch.onclose = () => this.onclose('closed');
    ch.onmessage = e => {
      let m;
      try { m = JSON.parse(e.data); } catch (_) { m = e.data; }
      this.onmessage(m);
    };
  }
  send(obj) {
    if (this.ch && this.ch.readyState === 'open') {
      this.ch.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }
  close() { try { this.pc.close(); } catch (_) {} }
}

// آدرس‌های پیدا شده را برای عیب‌یابی خلاصه می‌کند
export function describeCandidates(pc) {
  const sdp = (pc.localDescription && pc.localDescription.sdp) || '';
  const lines = sdp.match(/a=candidate:.*/g) || [];
  return {
    count: lines.length,
    mdns: lines.some(l => l.includes('.local')),
    ips: lines.map(l => l.split(' ')[4]).filter(Boolean)
  };
}

// میزبان: یک دعوت‌نامه می‌سازد (برای هر بازیکن یکی)
export async function hostInvite() {
  await unlockLocalIPs();
  const link = new Link();
  link._wire(link.pc.createDataChannel('d'));
  await link.pc.setLocalDescription(await link.pc.createOffer());
  await waitIce(link.pc);
  return { link, code: await pack(link.pc.localDescription) };
}

// میزبان: جواب مهمان را می‌پذیرد
export async function hostAccept(link, code) {
  const d = await unpack(code);
  if (d.type !== 'answer') throw new Error('این کد «جواب» نیست');
  await link.pc.setRemoteDescription(d);
}

// مهمان: دعوت‌نامه را می‌گیرد و جواب می‌سازد
export async function guestJoin(code) {
  await unlockLocalIPs();
  const d = await unpack(code);
  if (d.type !== 'offer') throw new Error('این کد «دعوت» نیست');
  const link = new Link();
  link.pc.ondatachannel = e => link._wire(e.channel);
  await link.pc.setRemoteDescription(d);
  await link.pc.setLocalDescription(await link.pc.createAnswer());
  await waitIce(link.pc);
  return { link, code: await pack(link.pc.localDescription) };
}
