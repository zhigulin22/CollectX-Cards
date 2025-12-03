// Database module using sql.js
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { schema } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data.db');

let db = null;

export async function initDB() {
    const SQL = await initSqlJs();
    
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }
    
    db.run(schema);
    save();
    console.log('✅ Database ready');
    return db;
}

export function save() {
    if (!db) return;
    fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

export function run(sql, params = []) {
    db.run(sql, params);
    save();
}

export function get(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const result = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return result;
}

export function all(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
    return results;
}

export function genId() {
    return Math.random().toString(36).substr(2, 16);
}

