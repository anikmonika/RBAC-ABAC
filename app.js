const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");

// Tambahkan atribut clearance dan seniority pada users
const users = [
  { username: "user1", password: "pass", role: "admin", department: "HR", clearance: 3, seniority: 5 },
  { username: "user2", password: "pass", role: "staff", department: "finance", clearance: 1, seniority: 2 },
  { username: "user3", password: "pass", role: "manager", department: "finance", clearance: 2, seniority: 7 },
  { username: "user4", password: "pass", role: "staff", department: "hr", clearance: 1, seniority: 3 },
  { username: "user5", password: "pass", role: "manager", department: "hr", clearance: 2, seniority: 8 },
  { username: "user6", password: "pass", role: "staff", department: "marketing", clearance: 1, seniority: 1 },
  { username: "user7", password: "pass", role: "manager", department: "marketing", clearance: 2, seniority: 4 }
];

function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
}

/**
 * Authorize RBAC
 * @param {array} roles
 * @returns
 */
function authorizeRBAC(roles) {
  return (req, res, next) => {
    if (roles.includes(req.session.user.role)) {
      return next();
    } else {
      res.status(403).send("Forbidden");
    }
  };
}

/**
 * Authorize ABAC
 * @param {function} condition
 * @returns
 */
function authorizeABAC(condition) {
  return (req, res, next) => {
    console.log(req.session.user);
    if (condition(req.session.user)) {
      return next();
    } else {
      res.status(403).send("Forbidden");
    }
  };
}

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "my-secret",
    resave: false,
    saveUninitialized: true
  })
);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body; // inputan dari form user
  const user = users.find(
    (u) => u.username === username && u.password === password
  ); // cari dalam folder users global
  if (user) {
    req.session.user = user; // menyimpan session user
    res.redirect("/dashboard");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(); // hapus session
  res.redirect("/login");
});

app.get("/dashboard", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "dashboard.html"));
});

app.get("/admin", isAuthenticated, authorizeRBAC(["admin"]), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin.html"));
});

app.get(
  "/hr",
  isAuthenticated,
  authorizeABAC((user) => user.department === "hr"),
  (req, res) => {
    res.sendFile(path.join(__dirname, "views", "hr.html"));
  }
);

// Rute Manager Finance (/finance-manager)
app.get(
  "/finance-manager",
  isAuthenticated,
  authorizeABAC((user) => user.role === "manager" && user.department === "finance" && user.seniority >= 5),
  (req, res) => {
    res.send("Welcome to the Finance Manager route!");
  }
);

// Rute IT dengan Tingkat Keamanan (/it-clearance-2)
app.get(
  "/it-clearance-2",
  isAuthenticated,
  authorizeABAC((user) => user.department === "IT" && user.clearance >= 2),
  (req, res) => {
    res.send("Welcome to the IT Clearance Level 2 route!");
  }
);

// Rute Director Legal (/legal-director)
app.get(
  "/legal-director",
  isAuthenticated,
  authorizeABAC((user) => user.role === "director" && user.department === "Legal" && user.clearance === 3),
  (req, res) => {
    res.send("Welcome to the Legal Director route!");
  }
);

// Rute Ops dengan Kontrol Akses Gabungan (/ops-combined)
app.get(
  "/ops-combined",
  isAuthenticated,
  authorizeABAC((user) => user.role === "staff" && user.department === "Operations" && user.clearance === 1 && user.seniority < 3),
  (req, res) => {
    res.send("Welcome to the Operations Combined route!");
  }
);

// Rute Eksekutif dengan Tingkat Keamanan Tinggi (/exec-clearance-3)
app.get(
  "/exec-clearance-3",
  isAuthenticated,
  authorizeABAC((user) => (user.role === "manager" || user.role === "director") && user.clearance === 3 && user.seniority >= 7),
  (req, res) => {
    res.send("Welcome to the Executive Clearance Level 3 route!");
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
