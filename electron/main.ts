import { app,  BrowserWindow, ipcMain,dialog,protocol } from 'electron'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs';
import path from 'node:path';
import db, {initDb} from "../src/main/db.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
initDb();
ipcMain.handle('get-tasks', async () => {
  return new Promise((resolve) => {
    db.all("SELECT * FROM tasks ORDER BY created_at DESC", (err, rows) => {
      resolve(err ? [] : rows);
    });
  });
});
ipcMain.handle('update-project', async (_, project) => {
  return new Promise((resolve) => {
    db.run(
        'UPDATE projects SET name = ? WHERE id = ?',
        [project.name, project.id],
        (err) => {
          if (err) {
            console.error("Error updating project:", err);
            resolve(false);
          } else {
            resolve(true);
          }
        }
    );
  });
});
ipcMain.handle('add-task', async (_, task) => {
  return new Promise((resolve) => {
    console.log(task);
    const { title, description, image_path, status,project_id } = task;
    db.run(
        "INSERT INTO tasks (title, description,project_id, image_path, status) VALUES (?, ?, ?, ?, ?)",
        [title, description,project_id, image_path, status],
        function() { resolve({ id: this.lastID }); }
    );
  });
});
ipcMain.handle('update-task', async (_, task) => {
  return new Promise((resolve) => {
    const { id, title, description, image_path, status, completed_at,project_id } = task;
    // We update all fields, including the new completed_at timestamp
    const query = `
      UPDATE tasks
      SET title = ?, description = ?,project_id = ?, image_path = ?, status = ?, completed_at = ?
      WHERE id = ?
    `;
    db.run(query, [title, description, project_id, image_path, status, completed_at, id], function(err) {
      if (err) resolve({ error: err.message });
      else resolve({ updated: true });
    });
  });
});

ipcMain.handle('get-projects', () => {
  return new Promise((res) => db.all('SELECT * FROM projects', (err, rows) => {
    res(rows)
    console.log(err);
  }));
});

ipcMain.handle('add-project', (_, project) => {
  return new Promise((res) => {
    db.run('INSERT INTO projects (name, color) VALUES (?, ?)', [project.name, project.color], function() {
      res({ id: this.lastID });
    });
  });
});

ipcMain.handle('delete-project', (_, id) => {
  return new Promise((res) => db.run('DELETE FROM projects WHERE id = ?', [id], () => res(true)));
});
ipcMain.handle('delete-task', async (_, id: number) => {
  return new Promise((resolve) => {
    // 1. First, get the task to find the file path
    db.get('SELECT image_path FROM tasks WHERE id = ?', [id], (err, row: any) => {
      if (err) {
        resolve({ error: err.message });
        return;
      }

      // 2. If a file path exists, try to delete the physical file
      if (row && row.image_path) {
        fs.unlink(row.image_path, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Failed to delete physical file:', unlinkErr);
            // We continue anyway to ensure the DB record is cleaned up
          } else {
            console.log('Successfully deleted file:', row.image_path);
          }
        });
      }

      // 3. Delete the record from the database
      db.run('DELETE FROM tasks WHERE id = ?', [id], function(dbErr) {
        if (dbErr) resolve({ error: dbErr.message });
        else resolve({ deleted: true });
      });
    });
  });
});

const TASKS_DIR = path.join(app.getPath('userData'), 'task_images');
if (!fs.existsSync(TASKS_DIR)) fs.mkdirSync(TASKS_DIR);

ipcMain.handle('select-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp'] }]
  });

  if (canceled || filePaths.length === 0) return null;

  const sourcePath = filePaths[0];
  const fileName = `${Date.now()}-${path.basename(sourcePath)}`;
  const destinationPath = path.join(TASKS_DIR, fileName);

  fs.copyFileSync(sourcePath, destinationPath);
  return destinationPath; // Return the new local path to save in DB
});
function createWindow() {
  protocol.registerFileProtocol('local-resource', (request, callback) => {
    const url = request.url.replace(/^local-resource:\/\//, '');
    try {
      return callback(decodeURIComponent(url));
    } catch (error) {
      console.error(error);
    }
  });
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'icons/appstore.png'),
    title: "My Tasks",
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })
  win.maximize();
  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, '../public/icons/Assets.xcassets/AppIcon.appiconset/1024.png'));
    app.name = "My Tasks";
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
