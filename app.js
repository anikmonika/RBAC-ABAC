const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");

// Tambahkan atribut clearance dan seniority pada users
const users = [
  // Data pengguna hardcoded dengan atribut username, password, role, department, clearance, dan seniority
  { username: "user1", password: "pass", role: "admin", department: "HR", clearance: 3, seniority: 5 },
  { username: "user2", password: "pass", role: "staff", department: "finance", clearance: 1, seniority: 2 },
  { username: "user3", password: "pass", role: "manager", department: "finance", clearance: 2, seniority: 7 },
  { username: "user4", password: "pass", role: "staff", department: "hr", clearance: 1, seniority: 3 },
  { username: "user5", password: "pass", role: "manager", department: "hr", clearance: 2, seniority: 8 },
  { username: "user6", password: "pass", role: "staff", department: "marketing", clearance: 1, seniority: 1 },
  { username: "user7", password: "pass", role: "manager", department: "marketing", clearance: 2, seniority: 4 }
];

// Middleware untuk memeriksa apakah pengguna sudah login
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next(); // Jika pengguna sudah login, lanjutkan ke middleware berikutnya
  }
  res.redirect("/login"); // Jika belum login, arahkan ke halaman login
}

/**
 * Middleware untuk kontrol akses berbasis peran (RBAC)
 * @param {array} roles - Daftar peran yang diizinkan
 * @returns Middleware
 */
function authorizeRBAC(roles) {
  return (req, res, next) => {
    if (roles.includes(req.session.user.role)) {
      return next(); // Jika peran pengguna sesuai, lanjutkan ke middleware berikutnya
    } else {
      res.status(403).send("Forbidden"); // Jika tidak sesuai, kirimkan respons 403
    }
  };
}

/**
 * Middleware untuk kontrol akses berbasis atribut (ABAC)
 * @param {function} condition - Fungsi untuk memeriksa atribut pengguna
 * @returns Middleware
 */
function authorizeABAC(condition) {
  return (req, res, next) => {
    if (condition(req.session.user)) {
      return next(); // Jika kondisi terpenuhi, lanjutkan ke middleware berikutnya
    } else {
      res.status(403).send("Forbidden"); // Jika tidak terpenuhi, kirimkan respons 403
    }
  };
}

const app = express();
app.use(bodyParser.urlencoded({ extended: true })); // Middleware untuk mem-parsing data dari form
app.use(
  session({
    secret: "my-secret", // Kunci rahasia untuk mengenkripsi sesi
    resave: false, // Jangan menyimpan ulang sesi jika tidak ada perubahan
    saveUninitialized: true // Simpan sesi meskipun belum diinisialisasi
  })
);

// Rute untuk halaman utama
app.get("/", (req, res) => {
  res.send("Hello, World!"); // Kirimkan respons sederhana
});

// Rute untuk halaman login
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html")); // Kirimkan file HTML login
});

// Rute untuk memproses login
app.post("/login", (req, res) => {
  const { username, password } = req.body; // Ambil data dari form
  const user = users.find(
    (u) => u.username === username && u.password === password
  ); // Cari pengguna berdasarkan username dan password
  if (user) {
    req.session.user = user; // Simpan data pengguna ke sesi
    res.redirect("/dashboard"); // Arahkan ke dashboard
  } else {
    res.redirect("/login"); // Jika gagal, kembali ke halaman login
  }
});

// Rute untuk logout
app.get("/logout", (req, res) => {
  req.session.destroy(); // Hapus sesi pengguna
  res.redirect("/login"); // Arahkan ke halaman login
});

// Rute untuk dashboard
app.get("/dashboard", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "dashboard.html")); // Kirimkan file HTML dashboard
});

// Rute Admin-Only
app.get("/admin", isAuthenticated, authorizeRBAC(["admin"]), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin.html")); // Kirimkan file HTML admin
});

// Rute Departemen HR
app.get(
  "/hr",
  isAuthenticated,
  authorizeABAC((user) => user.department === "hr"), // Hanya pengguna dari departemen HR
  (req, res) => {
    res.sendFile(path.join(__dirname, "views", "hr.html")); // Kirimkan file HTML HR
  }
);

// Rute Manager Finance
app.get(
  "/finance-manager",
  isAuthenticated,
  authorizeABAC((user) => user.role === "manager" && user.department === "finance" && user.seniority >= 5), // Hanya manager Finance dengan masa kerja >= 5 tahun
  (req, res) => {
    res.send("Welcome to the Finance Manager route!"); // Kirimkan pesan selamat datang
  }
);

// Rute IT dengan Tingkat Keamanan
app.get(
  "/it-clearance-2",
  isAuthenticated,
  authorizeABAC((user) => user.department === "IT" && user.clearance >= 2), // Hanya pengguna IT dengan clearance >= 2
  (req, res) => {
    res.send("Welcome to the IT Clearance Level 2 route!"); // Kirimkan pesan selamat datang
  }
);

// Rute Director Legal
app.get(
  "/legal-director",
  isAuthenticated,
  authorizeABAC((user) => user.role === "director" && user.department === "Legal" && user.clearance === 3), // Hanya director Legal dengan clearance 3
  (req, res) => {
    res.send("Welcome to the Legal Director route!"); // Kirimkan pesan selamat datang
  }
);

// Rute Ops dengan Kontrol Akses Gabungan
app.get(
  "/ops-combined",
  isAuthenticated,
  authorizeABAC((user) => user.role === "staff" && user.department === "Operations" && user.clearance === 1 && user.seniority < 3), // Hanya staff Operations dengan clearance 1 dan masa kerja < 3 tahun
  (req, res) => {
    res.send("Welcome to the Operations Combined route!"); // Kirimkan pesan selamat datang
  }
);

// Rute Eksekutif dengan Tingkat Keamanan Tinggi
app.get(
  "/exec-clearance-3",
  isAuthenticated,
  authorizeABAC((user) => (user.role === "manager" || user.role === "director") && user.clearance === 3 && user.seniority >= 7), // Hanya manager/director dengan clearance 3 dan masa kerja >= 7 tahun
  (req, res) => {
    res.send("Welcome to the Executive Clearance Level 3 route!"); // Kirimkan pesan selamat datang
  }
);

// Menjalankan server
const PORT = process.env.PORT || 3000; // Gunakan port dari environment variable atau default ke 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); // Log bahwa server berjalan
});
