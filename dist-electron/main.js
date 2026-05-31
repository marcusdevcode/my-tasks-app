import { app as d, ipcMain as l, dialog as j, BrowserWindow as f, protocol as A } from "electron";
import { fileURLToPath as S } from "node:url";
import p from "node:fs";
import i from "node:path";
import D from "sqlite3";
const w = i.join(d.getPath("userData"), "tasks.db"), n = new D.Database(w), O = () => {
  n.serialize(() => {
    n.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      image_path TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )`), n.run(`CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT
          )`), n.all("PRAGMA table_info(tasks)", (s, e) => {
      if (s) {
        console.error("Error checking table info:", s);
        return;
      }
      e.some((o) => o.name === "project_id") || n.run("ALTER TABLE tasks ADD COLUMN project_id INTEGER", (o) => {
        o ? console.error("Failed to add project_id column:", o.message) : console.log("Migration Successful: project_id column added to tasks.");
      });
    });
  });
}, m = i.dirname(S(import.meta.url));
process.env.APP_ROOT = i.join(m, "..");
const u = process.env.VITE_DEV_SERVER_URL, C = i.join(process.env.APP_ROOT, "dist-electron"), g = i.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = u ? i.join(process.env.APP_ROOT, "public") : g;
let c;
O();
l.handle("get-tasks", async () => new Promise((s) => {
  n.all("SELECT * FROM tasks ORDER BY created_at DESC", (e, t) => {
    s(e ? [] : t);
  });
}));
l.handle("update-project", async (s, e) => new Promise((t) => {
  n.run(
    "UPDATE projects SET name = ? WHERE id = ?",
    [e.name, e.id],
    (o) => {
      o ? (console.error("Error updating project:", o), t(!1)) : t(!0);
    }
  );
}));
l.handle("add-task", async (s, e) => new Promise((t) => {
  console.log(e);
  const { title: o, description: a, image_path: r, status: E, project_id: T } = e;
  n.run(
    "INSERT INTO tasks (title, description,project_id, image_path, status) VALUES (?, ?, ?, ?, ?)",
    [o, a, T, r, E],
    function() {
      t({ id: this.lastID });
    }
  );
}));
l.handle("update-task", async (s, e) => new Promise((t) => {
  const { id: o, title: a, description: r, image_path: E, status: T, completed_at: I, project_id: P } = e;
  n.run(`
      UPDATE tasks
      SET title = ?, description = ?,project_id = ?, image_path = ?, status = ?, completed_at = ?
      WHERE id = ?
    `, [a, r, P, E, T, I, o], function(R) {
    t(R ? { error: R.message } : { updated: !0 });
  });
}));
l.handle("get-projects", () => new Promise((s) => n.all("SELECT * FROM projects", (e, t) => {
  s(t), console.log(e);
})));
l.handle("add-project", (s, e) => new Promise((t) => {
  n.run("INSERT INTO projects (name, color) VALUES (?, ?)", [e.name, e.color], function() {
    t({ id: this.lastID });
  });
}));
l.handle("delete-project", (s, e) => new Promise((t) => n.run("DELETE FROM projects WHERE id = ?", [e], () => t(!0))));
l.handle("delete-task", async (s, e) => new Promise((t) => {
  n.get("SELECT image_path FROM tasks WHERE id = ?", [e], (o, a) => {
    if (o) {
      t({ error: o.message });
      return;
    }
    a && a.image_path && p.unlink(a.image_path, (r) => {
      r ? console.error("Failed to delete physical file:", r) : console.log("Successfully deleted file:", a.image_path);
    }), n.run("DELETE FROM tasks WHERE id = ?", [e], function(r) {
      t(r ? { error: r.message } : { deleted: !0 });
    });
  });
}));
const _ = i.join(d.getPath("userData"), "task_images");
p.existsSync(_) || p.mkdirSync(_);
l.handle("select-file", async () => {
  const { canceled: s, filePaths: e } = await j.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "png", "gif", "webp"] }]
  });
  if (s || e.length === 0) return null;
  const t = e[0], o = `${Date.now()}-${i.basename(t)}`, a = i.join(_, o);
  return p.copyFileSync(t, a), a;
});
function h() {
  A.registerFileProtocol("local-resource", (s, e) => {
    const t = s.url.replace(/^local-resource:\/\//, "");
    try {
      return e(decodeURIComponent(t));
    } catch (o) {
      console.error(o);
    }
  }), c = new f({
    icon: i.join(process.env.VITE_PUBLIC, "icons/appstore.png"),
    title: "My Tasks",
    webPreferences: {
      preload: i.join(m, "preload.mjs")
    }
  }), c.maximize(), c.webContents.on("did-finish-load", () => {
    c == null || c.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), u ? c.loadURL(u) : c.loadFile(i.join(g, "index.html")), process.platform === "darwin" && (d.dock.setIcon(i.join(m, "../public/icons/Assets.xcassets/AppIcon.appiconset/1024.png")), d.name = "My Tasks");
}
d.on("window-all-closed", () => {
  process.platform !== "darwin" && (d.quit(), c = null);
});
d.on("activate", () => {
  f.getAllWindows().length === 0 && h();
});
d.whenReady().then(h);
export {
  C as MAIN_DIST,
  g as RENDERER_DIST,
  u as VITE_DEV_SERVER_URL
};
