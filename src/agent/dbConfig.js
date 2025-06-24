// src/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к файлу базы данных, лучше брать из конфигурации или переменных окружения
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../checkpointer/checkpoints.db');
// console.log(DB_PATH)
let db; // Переменная для хранения единственного экземпляра базы данных

/**
 * Инициализирует соединение с базой данных SQLite.
 * Если соединение уже открыто, возвращает его.
 * @returns {sqlite3.Database} Экземпляр базы данных.
 */
function getDbInstance() {
    if (!db) {
        // Открываем соединение только один раз
        db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
                console.error('Ошибка при открытии базы данных:', err.message);
                // В производственной среде здесь можно выйти из приложения или предпринять другие действия
                process.exit(1);
            } else {
                console.log(`Подключено к базе данных SQLite: ${DB_PATH}`);
                // Можно выполнить начальные миграции или создание таблиц здесь
                db.run(`
                    CREATE TABLE IF NOT EXISTS checkpoints (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        thread_id TEXT NOT NULL,
                        data TEXT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                `, (err) => {
                    if (err) {
                        console.error('Ошибка при создании таблицы checkpoints:', err.message);
                    } else {
                        console.log('Таблица checkpoints проверена/создана.');
                    }
                });
            }
        });
    }
    return db;
}

/**
 * Обертка для выполнения SQL-запросов с использованием Promise.
 * Использует параметризованные запросы для предотвращения SQL-инъекций.
 * @param {string} sql - SQL-запрос.
 * @param {Array<any>} [params=[]] - Параметры для запроса.
 * @returns {Promise<any>} Промис, который разрешается результатом запроса.
 */
function runAsync(sql, params = []) {
    const dbInstance = getDbInstance();
    return new Promise((resolve, reject) => {
        dbInstance.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                // Для INSERT/UPDATE/DELETE: this.lastID и this.changes
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

/**
 * Обертка для получения одной строки результата.
 * @param {string} sql - SQL-запрос.
 * @param {Array<any>} [params=[]] - Параметры для запроса.
 * @returns {Promise<object | undefined>} Промис, разрешающийся одной строкой или undefined.
 */
function getAsync(sql, params = []) {
    const dbInstance = getDbInstance();
    return new Promise((resolve, reject) => {
        dbInstance.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

/**
 * Обертка для получения всех строк результата.
 * @param {string} sql - SQL-запрос.
 * @param {Array<any>} [params=[]] - Параметры для запроса.
 * @returns {Promise<Array<object>>} Промис, разрешающийся массивом строк.
 */
function allAsync(sql, params = []) {
    const dbInstance = getDbInstance();
    return new Promise((resolve, reject) => {
        dbInstance.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

/**
 * Закрывает соединение с базой данных.
 * @returns {Promise<void>}
 */
function closeDb() {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error('Ошибка при закрытии базы данных:', err.message);
                    reject(err);
                } else {
                    console.log('Соединение с базой данных закрыто.');
                    db = null; // Обнуляем ссылку
                    resolve();
                }
            });
        } else {
            resolve(); // Соединение уже закрыто или не было открыто
        }
    });
}

module.exports = {
    getDbInstance,
    runAsync,
    getAsync,
    allAsync,
    closeDb
};
