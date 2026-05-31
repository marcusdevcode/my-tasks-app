import sqlite3 from 'sqlite3';
import { app } from 'electron';
import path from 'node:path';


// Store database in the user data folder to ensure write permissions
const dbPath = path.join(app.getPath('userData'), 'tasks.db');

const db = new sqlite3.Database(dbPath);

export const initDb = () => {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      image_path TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )`);
        db.run(`CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT
          )`);

        db.all("PRAGMA table_info(tasks)", (err, rows: any[]) => {
            if (err) {
                console.error("Error checking table info:", err);
                return;
            }

            const hasProjectId = rows.some(row => row.name === 'project_id');

            if (!hasProjectId) {
                db.run(`ALTER TABLE tasks ADD COLUMN project_id INTEGER`, (alterErr) => {
                    if (alterErr) {
                        console.error("Failed to add project_id column:", alterErr.message);
                    } else {
                        console.log("Migration Successful: project_id column added to tasks.");
                    }
                });
            }
        });
    });
};

export default db;