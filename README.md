
<p align="center">
  <img src="https://c.termai.cc/i180/7u1.jpg" alt="Chat Global Banner" width="100%" style="border-radius:12px"/>
</p>

<h1 align="center">
  ✦  &nbsp;CHAT GLOBAL ✦
</h1>

<p align="center">
  <b>Real-time multi-user chat — CLI</b><br/>
  <i>Typing indicators · @Mention · Multi-room · Private messages</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Socket.IO-Realtime-010101?style=for-the-badge&logo=socketdotio&logoColor=white"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Express-Framework-000000?style=for-the-badge&logo=express&logoColor=white"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Termux-CLI%20Ready-1A1A2E?style=for-the-badge&logo=gnometerminal&logoColor=white"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Author-NexaDev-ff6b6b?style=for-the-badge&logo=github&logoColor=white"/>
  &nbsp;
  <img src="https://img.shields.io/badge/License-MIT-4ecdc4?style=for-the-badge"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Status-Active-00b894?style=for-the-badge"/>
</p>

---

## 📦 Fitur Unggulan

| Icon | Fitur | Deskripsi |
|:----:|-------|-----------|
| ✍️ | **Typing Indicator** | Notifikasi real-time saat user sedang mengetik |
| @ | **Mention** | Tag user lain dengan `@username` |
| 🏠 | **Multi-Room** | Buat & pindah room dengan `/join nama` |
| 💬 | **Private Message** | Chat pribadi dengan `/pm user pesan` |
| 🎨 | **ASCII Logo** | Tampilan cantik dengan simbol Unicode |
| 🌐 | **Web + CLI** | Support browser (Socket.IO) & terminal (TCP) |
| 🔔 | **Notifikasi** | Alert otomatis saat di-mention |
| 🎭 | **Aksi Emote** | Ekspresi dengan `/me aksi` |

---

## 🚀 Instalasi di Termux

### 1️⃣ Update & Install Package

```bash
# Update package list
pkg update && pkg upgrade -y

# Install Node.js, Git, dan tools
pkg install nodejs git -y

# Opsional tapi recommended
pkg install nano vim curl wget -y
```

### 2️⃣ Clone Repository

```bash
# Buat folder project
mkdir -p ~/projects
cd ~/projects

# Clone repo
git clone https://github.com/nexadev/chat-global.git

# Masuk ke folder
cd chat-global
```

### 3️⃣ Install Dependencies

```bash
# Install semua package dari package.json
npm install

# Atau install manual
npm install chalk express socket.io
```

### 4️⃣ Jalankan Server

```bash
# Mode Server TCP/CLI
node chat.js server

# Mode Web Server (Express + Socket.IO)
node app.js
```

---

## 🖥️ Cara Pakai

```bash
# Terminal 1 — Jalankan server
node chat.js server
# → Akan tampil IP seperti: 192.168.1.5:3000

# Terminal 2 — Join ke server lokal
node chat.js 192.168.1.5

# Join ke Server Admin (publik)
node chat.js 195.88.211.140
```

> 💡 **Tips:** Bagikan IP lokal kamu ke teman, mereka tinggal ketik perintah join di atas!

---

## 📋 Daftar Perintah

| Perintah | Fungsi |
|----------|--------|
| `/help` | 📖 Lihat daftar semua perintah |
| `/users` | 👥 Lihat user yang sedang online |
| `/pm <user> <pesan>` | 💬 Kirim pesan pribadi |
| `/nick <nama>` | ✏️ Ganti username |
| `/me <aksi>` | 🎭 Kirim aksi (contoh: `/me sedang makan`) |
| `/clear` | 🧹 Bersihkan layar terminal |
| `/rooms` | 🏠 Lihat daftar room yang tersedia |
| `/join <nama>` | 🚪 Pindah atau buat room baru |
| `/room` | 📍 Cek room kamu saat ini |
| `/mention <user>` | 🔔 Mention user tertentu |
| `/about` | ℹ️ Tentang aplikasi |
| `/quit` | 👋 Keluar dari chat |

---

## 🌐 Server Publik

Kamu bisa langsung gabung ke server admin tanpa setup apapun:

```bash
node chat.js 195.88.211.140
```

---

## 🗂️ Struktur Project

```
chat-global/
├── 📄 chat.js          # Entry point CLI/TCP server
├── 📄 package.json     # Dependencies
└── 📄 README.md        # Dokumentasi ini
```

---

## 🛠️ Teknologi

<p>
  <img src="https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat-square&logo=javascript&logoColor=black"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Node.js-Runtime-339933?style=flat-square&logo=nodedotjs&logoColor=white"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Socket.IO-WebSocket-010101?style=flat-square&logo=socketdotio&logoColor=white"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Express.js-Server-000000?style=flat-square&logo=express&logoColor=white"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Chalk-CLI%20Colors-ff6b6b?style=flat-square"/>
</p>

---

## 👤 Author

<p align="center">
  <b>NexaDev</b><br/>
  <a href="https://github.com/nexadev">
    <img src="https://img.shields.io/badge/GitHub-NexaDev-181717?style=for-the-badge&logo=github&logoColor=white"/>
  </a>
</p>

---

<p align="center">
  Made with ♡ by <b>NexaDev</b> &nbsp;·&nbsp; ✦ Chat Global ✦
</p>
