'use strict';
const net      = require('net');
const readline = require('readline');
const chalk    = require('chalk');
const os       = require('os');

// cPanel/hosting: force color support
const chk = new chalk.Instance({ level: process.env.COLORTERM ? 3 : 1 });

const PORT = process.env.CHAT_PORT || 3000;
const HOST = process.env.CHAT_HOST || '0.0.0.0';
const args = process.argv.slice(2);
const mode = args[0] || 'auto';

// ─── WARNA ────────────────────────────────
const C = {
  ww: t => chk.bold.whiteBright(t),   // putih bold  (judul, nama)
  w:  t => chk.whiteBright(t),        // putih       (nilai penting)
  g1: t => chk.hex('#CCCCCC')(t),     // abu terang  (teks biasa)
  g2: t => chk.hex('#888888')(t),     // abu tengah  (label, sub)
  g3: t => chk.hex('#555555')(t),     // abu gelap   (dekorasi, dim)
  b:  t => chk.bold(t),
  dm: t => chk.dim(t),
};

// ─── SIMBOL ───────────────────────────────
const S = {
  ok:   '[OK]',  err:  '[!] ',  info: ' i  ',
  join: ' >> ',  leave:' << ',  pm:   '[PM]',
  user: ' >  ',  room: ' #  ',  cmd:  ' /  ',
  quit: ' <- ',  clock:' ~  ',  dot:  '  * ',
  sep:  ' :: ',  arr:  ' > ',   typing: '...',
};

// Lebar kolom standar
const COL = { label: 10, cmd: 20 };

// Padding teks (tanpa ANSI)
const pad  = (s, n) => String(s) + ' '.repeat(Math.max(0, n - String(s).length));
const lpad = (s, n) => ' '.repeat(Math.max(0, n - String(s).length)) + String(s);

const PROMPT = C.g3(' | ') + C.g2('> ');
const LINE   = C.g3('  ' + '─'.repeat(32));

function getLocalIP() {
  const ifs = os.networkInterfaces();
  for (const n of Object.keys(ifs))
    for (const i of ifs[n])
      if (i.family === 'IPv4' && !i.internal) return i.address;
  return '127.0.0.1';
}
const LOCAL_IP = getLocalIP();

function now() {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function elapsed(ms) {
  const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60);
  if (h > 0) return `${h}j${m%60}m`;
  if (m > 0) return `${m}m${s%60}d`;
  return `${s}d`;
}

// ─── LOGO ─────────────────────────────────
function logo(sub = 'RUANG PUBLIK') {
  const title = 'CHAT GLOBAL';
  const w = 32;
  const tpad = Math.floor((w - title.length) / 2);
  const spad = Math.floor((w - sub.length)   / 2);
  return [
    '',
    '  ' + C.ww(' '.repeat(tpad) + title),
    '  ' + C.g2(' '.repeat(spad) + sub),
    '  ' + C.g3('━'.repeat(w)),
    '',
  ].join('\n');
}

// ─── ROW sejajar ──────────────────────────
function row(label, value, labelW = COL.label) {
  return '  ' + C.g2(pad(label, labelW)) + C.g3(':') + '  ' + value + '\n';
}

// ════════════════════════════════════════════
//  SERVER
// ════════════════════════════════════════════
if (mode === 'server' || mode === 's') {
  const clients     = new Map();
  const rooms       = new Map([['general', new Set()]]);
  const typingUsers = new Map();
  let   idSeq = 0;

  function printBanner() {
    console.log(logo('SERVER MODE'));
    process.stdout.write(row('Alamat', C.ww(LOCAL_IP) + C.g3(':' + PORT)));
    process.stdout.write(row('Akses',  C.g1(`node chat.js ${LOCAL_IP} ${PORT}`)));
    process.stdout.write(row('Port',   C.g1(String(PORT))));
    console.log(LINE);
    console.log(C.g3('  ' + S.info) + C.dm('Ctrl+C untuk matikan'));
    console.log();
  }
  printBanner();

  function roomOf(id) {
    for (const [name, set] of rooms) if (set.has(id)) return name;
    return 'general';
  }

  // Format pesan chat — sejajar timestamp | nama | pesan
  function fmtMsg(ts, sender, msg, isMe = false) {
    const tsStr  = C.g3(ts);
    const nameStr = isMe
      ? C.ww(pad('kamu', 12))
      : C.w(pad(sender, 12));
    return '  ' + tsStr + '  ' + nameStr + C.g3(' | ') + C.g1(msg) + '\n';
  }

  function broadcast(roomName, msg, senderKey, exclude = null, ts = null) {
    const t   = ts || now();
    const set = rooms.get(roomName) || new Set();
    for (const id of set) {
      const cl = clients.get(id);
      if (!cl?.socket.writable) continue;
      let out;
      if (senderKey === 'system') {
        out = LINE + '\n' + '  ' + C.g3(S.info) + C.g2(msg) + '\n' + LINE + '\n';
      } else if (id === exclude) {
        out = fmtMsg(t, 'kamu', msg, true);
      } else {
        out = fmtMsg(t, senderKey, msg, false);
      }
      cl.socket.write(out + PROMPT);
    }
  }

  function notifyTyping(senderId, room) {
    const s = clients.get(senderId);
    if (!s) return;
    for (const id of (rooms.get(room) || new Set())) {
      if (id === senderId) continue;
      const cl = clients.get(id);
      if (cl?.socket.writable)
        cl.socket.write(C.g3(`\r  ${S.typing} ${s.username} mengetik\n`) + PROMPT);
    }
  }

  function clearTyping(id) { clearTimeout(typingUsers.get(id)); typingUsers.delete(id); }

  function setTyping(id, room) {
    clearTyping(id);
    notifyTyping(id, room);
    typingUsers.set(id, setTimeout(() => typingUsers.delete(id), 3000));
  }

  function parseMentions(msg, senderId, room) {
    const re = /@([a-zA-Z0-9_-]+)/g;
    const out = new Set(); let m;
    while ((m = re.exec(msg)) !== null)
      for (const [id, cl] of clients)
        if (cl.username === m[1] && id !== senderId) out.add(id);
    return out;
  }

  function alertMentions(ids, senderName, room) {
    for (const id of ids) {
      const cl = clients.get(id);
      if (cl?.socket.writable) {
        cl.socket.write('\n' + row('Mention', C.ww(senderName) + C.g2(` di #${room}`)));
        cl.socket.write(PROMPT);
      }
    }
  }

  // ── COMMAND HANDLER ──────────────────────
  function handle(cmd, id, sock) {
    const parts = cmd.trim().split(' ');
    const cl    = clients.get(id);
    const room  = roomOf(id);
    const W = t  => sock.write(t);
    const R = (l, v) => W(row(l, v));
    const P = () => W(PROMPT);

    switch (parts[0]) {

      case '/help':
        W('\n' + C.ww('  PERINTAH') + '\n' + LINE + '\n');
        [
          ['/users',        'Daftar user online'],
          ['/pm user msg',  'Pesan pribadi'],
          ['/nick nama',    'Ganti nama'],
          ['/me aksi',      'Kirim aksi'],
          ['/rooms',        'Daftar room'],
          ['/join room',    'Pindah room'],
          ['/room',         'Room aktif'],
          ['/mention user', 'Mention user'],
          ['/clear',        'Bersihkan layar'],
          ['/about',        'Info app'],
          ['/quit',         'Keluar'],
        ].forEach(([c, d]) =>
          W('  ' + C.g1(pad(c, COL.cmd)) + C.g3(' : ') + C.g2(d) + '\n')
        );
        W(LINE + '\n');
        W('  ' + C.g3(S.info) + C.dm('Gunakan @username untuk mention') + '\n\n');
        P(); break;

      case '/users':
        W('\n' + C.ww('  USER ONLINE') + C.g3(`  (${clients.size})`) + '\n' + LINE + '\n');
        W('  ' + C.g2(pad('Nama', 14)) + C.g3(' : ') + C.g2(pad('Online', 8)) + C.g3(' : ') + C.g2('Room') + '\n');
        W('  ' + C.g3('─'.repeat(32)) + '\n');
        for (const [, u] of clients) {
          const me   = u.socket === sock ? C.g3(' *') : '  ';
          const rn   = roomOf([...clients.entries()].find(([,v]) => v === u)?.[0]);
          W('  ' + C.w(pad(u.username, 14)) + C.g3(' : ') +
            C.g2(pad(elapsed(Date.now() - u.joinTime), 8)) + C.g3(' : ') +
            C.g2('#' + (rn || 'general')) + me + '\n');
        }
        W(LINE + '\n\n');
        P(); break;

      case '/pm': {
        if (parts.length < 3) { W('  ' + C.g2(S.err) + C.g2('Penggunaan: /pm user pesan\n')); P(); return; }
        const [, tgt, ...pp] = parts;
        const pmMsg = pp.join(' ');
        let found = false;
        for (const [, u] of clients) {
          if (u.username === tgt && u.socket !== sock) {
            const t = now();
            u.socket.write('\n' + row('PM dari', C.ww(cl.username)) + row('Waktu', C.g2(t)) + row('Pesan', C.g1(pmMsg)) + LINE + '\n');
            u.socket.write(PROMPT);
            W('  ' + C.g2(S.ok) + C.g2(' PM terkirim ke ') + C.ww(tgt) + '\n');
            found = true; break;
          }
        }
        if (!found) W('  ' + C.g2(S.err) + C.g2(`User "${tgt}" tidak ditemukan\n`));
        P(); break;
      }

      case '/nick': {
        if (parts.length < 2) { W('  ' + C.g2(S.err) + C.g2('/nick nama_baru\n')); P(); return; }
        const nn = parts[1].replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 15);
        if (nn.length < 2) { W('  ' + C.g2(S.err) + C.g2('Min 2 karakter\n')); P(); return; }
        if ([...clients.values()].some(u => u.username === nn && u.socket !== sock)) {
          W('  ' + C.g2(S.err) + C.g2('Nama sudah dipakai\n')); P(); return;
        }
        const old = cl.username; cl.username = nn;
        W('  ' + C.g2(S.ok) + C.g2(' ') + C.g3(old) + C.g3(' > ') + C.ww(nn) + '\n');
        broadcast(room, `${old} berganti nama jadi ${nn}`, 'system', id);
        P(); break;
      }

      case '/me': {
        if (parts.length < 2) { P(); return; }
        const act = parts.slice(1).join(' ');
        const t   = now();
        const out = '  ' + C.g3(t) + '  ' + C.g2(pad('* ' + cl.username, 14)) + C.g3(' | ') + C.g2(act) + '\n';
        for (const cid of (rooms.get(room) || new Set())) {
          const u = clients.get(cid);
          if (u?.socket.writable) { u.socket.write(out); u.socket.write(PROMPT); }
        }
        break;
      }

      case '/clear': W('\x1Bc'); W(logo('RUANG PUBLIK')); P(); break;

      case '/about':
        W('\n' + C.ww('  TENTANG') + '\n' + LINE + '\n');
        [
          ['Nama',    'Chat Global'],
          ['Versi',   '2.3.0'],
          ['Runtime', 'Node.js TCP CLI'],
          ['Fitur',   'Multi-room, PM, Mention'],
          ['Hosting', 'cPanel / Termux / VPS'],
        ].forEach(([k, v]) => W('  ' + C.g2(pad(k, COL.label)) + C.g3(' : ') + C.g1(v) + '\n'));
        W(LINE + '\n\n'); P(); break;

      case '/rooms':
        W('\n' + C.ww('  ROOM') + '\n' + LINE + '\n');
        W('  ' + C.g2(pad('Nama', 16)) + C.g3(' : ') + C.g2('User') + '\n');
        W('  ' + C.g3('─'.repeat(24)) + '\n');
        for (const [rn, rs] of rooms) {
          const active = rn === room ? C.g3(' *') : '  ';
          W('  ' + C.w(pad('#' + rn, 16)) + C.g3(' : ') + C.g2(String(rs.size)) + active + '\n');
        }
        W(LINE + '\n\n'); P(); break;

      case '/join': {
        if (parts.length < 2) { W('  ' + C.g2(S.err) + C.g2('/join nama_room\n')); P(); return; }
        const rNew = parts[1].replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 20);
        if (!rNew) { W('  ' + C.g2(S.err) + C.g2('Nama tidak valid\n')); P(); return; }
        rooms.get(room).delete(id);
        broadcast(room, `${cl.username} meninggalkan room`, 'system', id);
        if (!rooms.has(rNew)) rooms.set(rNew, new Set());
        rooms.get(rNew).add(id);
        W('  ' + C.g2(S.ok) + C.g2(' Bergabung ke ') + C.ww('#' + rNew) + '\n'); P();
        broadcast(rNew, `${cl.username} bergabung`, 'system', id);
        break;
      }

      case '/room':
        W(row('Room aktif', C.ww('#' + room))); P(); break;

      case '/mention': {
        if (parts.length < 2) { W('  ' + C.g2(S.err) + C.g2('/mention username\n')); P(); return; }
        const tu = parts[1];
        let ok = false;
        for (const [, u] of clients) {
          if (u.username === tu && u.socket !== sock) {
            u.socket.write('\n' + row('Mention', C.ww(cl.username) + C.g2(' menyebut kamu')));
            u.socket.write(PROMPT);
            W('  ' + C.g2(S.ok) + C.g2(' Mention terkirim ke ') + C.ww(tu) + '\n');
            ok = true; break;
          }
        }
        if (!ok) W('  ' + C.g2(S.err) + C.g2(`User "${tu}" tidak ditemukan\n`));
        P(); break;
      }

      case '/quit':
        W('  ' + C.g2(S.quit) + C.g2('Sampai jumpa, ') + C.ww(cl.username) + '\n');
        sock.end(); break;

      default:
        W('  ' + C.g2(S.err) + C.g3('Tidak dikenal -- ketik /help\n')); P();
    }
  }

  // ── TCP SERVER ───────────────────────────
  const server = net.createServer((socket) => {
    const id   = ++idSeq;
    const addr = socket.remoteAddress;
    let username = null, joinTime = null, buf = '', curRoom = 'general';

    socket.write(logo('RUANG PUBLIK'));
    socket.write('  ' + C.g2('Nama kamu : '));

    socket.on('data', (data) => {
      buf += data.toString();
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const raw of lines) {
        const msg = raw.replace(/\r/g, '').trim();
        if (!msg) continue;

        if (!username) {
          const name = msg.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 15);
          if (name.length < 2) {
            socket.write('  ' + C.g3(S.err) + C.g3('Min 2 karakter\n') + '  ' + C.g2('Nama kamu : '));
            continue;
          }
          if ([...clients.values()].some(c => c.username === name)) {
            socket.write('  ' + C.g3(S.err) + C.g3('Nama sudah dipakai\n') + '  ' + C.g2('Nama kamu : '));
            continue;
          }
          username = name; joinTime = Date.now();
          clients.set(id, { socket, username, addr, joinTime });
          rooms.get('general').add(id);
          curRoom = 'general';

          socket.write('\n');
          socket.write(row('Selamat datang', C.ww(username)));
          socket.write(row('Room',           C.g1('#general')));
          socket.write(row('Waktu',          C.g1(now())));
          socket.write(LINE + '\n');
          socket.write('  ' + C.g3(S.info) + C.dm('/help untuk daftar perintah') + '\n\n');
          socket.write(PROMPT);

          broadcast('general', `${username} bergabung ke room`, 'system', id);
          console.log(row('Join', C.ww(username) + C.g3('  ' + addr)));
          continue;
        }

        if (msg.startsWith('/')) { handle(msg, id, socket); continue; }

        setTyping(id, curRoom);
        const ts  = now();
        const men = parseMentions(msg, id, curRoom);
        if (men.size > 0) alertMentions(men, username, curRoom);

        let display = msg;
        for (const [, u] of clients)
          if (msg.includes('@' + u.username))
            display = display.replace(new RegExp('@' + u.username, 'g'), C.w('@' + u.username));

        broadcast(curRoom, display, username, id, ts);
        console.log(fmtMsg(ts, username, msg));
      }
    });

    const cleanup = () => {
      clearTyping(id);
      for (const [, s] of rooms) s.delete(id);
      clients.delete(id);
      if (username) {
        broadcast(curRoom, `${username} keluar`, 'system');
        console.log(row('Keluar', C.g2(username)));
      }
    };
    socket.on('end',   cleanup);
    socket.on('error', cleanup);
  });

  server.listen(PORT, HOST, () => {
    console.log(row('Status', C.ww('Aktif') + C.g3('  ' + HOST + ':' + PORT)));
    console.log();
  });

  server.on('error', (e) => {
    console.log('  ' + C.g2(S.err) + (
      e.code === 'EADDRINUSE'
        ? C.g2(`Port ${PORT} dipakai -- coba CHAT_PORT=3001`)
        : C.g2('Error: ' + e.message)
    ));
    process.exit(1);
  });

  process.on('SIGINT', () => {
    console.log('\n' + row('Status', C.g2('Mematikan server...')));
    for (const [, c] of clients) {
      c.socket.write('\n  ' + C.g2(S.err) + C.g2('Server dimatikan\n'));
      c.socket.end();
    }
    server.close(() => {
      console.log(row('Status', C.ww('Server dimatikan')));
      process.exit(0);
    });
  });

// ════════════════════════════════════════════
//  CLIENT
// ════════════════════════════════════════════
} else {
  const serverAddr = mode === 'auto' ? 'localhost' : mode;
  const serverPort = args[1] || PORT;

  console.log(logo('CLIENT MODE'));
  process.stdout.write(row('Server', C.ww(`${serverAddr}:${serverPort}`)));
  console.log();

  const socket = new net.Socket();
  let rl = null, authed = false;

  socket.connect(serverPort, serverAddr, () => {
    process.stdout.write(row('Status', C.ww('Terhubung')));
    console.log();
  });

  socket.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('Nama kamu') && !rl) {
      process.stdout.write(msg);
      rl = readline.createInterface({
        input: process.stdin, output: process.stdout, prompt: PROMPT,
      });
      rl.on('line', (line) => {
        const inp = line.trim();
        if (!inp) { rl.prompt(); return; }
        socket.write(inp + '\n');
        if (inp === '/quit') { rl.close(); socket.end(); }
      });
      return;
    }
    if (msg.includes('Selamat datang')) authed = true;
    if (rl) { process.stdout.clearLine(0); process.stdout.cursorTo(0); }
    process.stdout.write(msg);
    if (rl && authed && !msg.endsWith('> ')) rl.prompt(true);
  });

  socket.on('close', () => {
    console.log('\n' + row('Status', C.g2('Terputus dari server')));
    rl?.close(); process.exit(0);
  });

  socket.on('error', (e) => {
    const msgs = {
      ECONNREFUSED: `Server ${serverAddr}:${serverPort} tidak aktif`,
      ETIMEDOUT:    'Timeout -- periksa IP & port',
    };
    console.log('\n  ' + C.g2(S.err) + C.g2(msgs[e.code] || 'Error: ' + e.message));
    process.exit(1);
  });

  process.on('SIGINT', () => {
    console.log('\n' + row('Status', C.g2('Keluar...')));
    socket.end(); rl?.close();
  });
}

// Helper untuk fmtMsg di scope global (dipakai server console.log)
function fmtMsg(ts, sender, msg) {
  const C2 = {
    ww: t => chalk.bold.whiteBright(t),
    w:  t => chalk.whiteBright(t),
    g1: t => chalk.hex('#CCCCCC')(t),
    g2: t => chalk.hex('#888888')(t),
    g3: t => chalk.hex('#555555')(t),
  };
  const pad2 = (s, n) => String(s) + ' '.repeat(Math.max(0, n - String(s).length));
  return '  ' + C2.g3(ts) + '  ' + C2.w(pad2(sender, 12)) + C2.g3(' | ') + C2.g1(msg) + '\n';
}
