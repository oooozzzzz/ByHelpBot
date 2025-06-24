// src/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../checkpointer/checkpoints.db');

let dbInstance = null;
let dbReadyPromise = null;

// --- Вспомогательные функции (runAsync, getAsync, allAsync остаются без изменений) ---

/**
 * Вспомогательная функция для выполнения SQL-запросов с использованием Promise.
 * Использует параметризованные запросы для предотвращения SQL-инъекций.
 * @param {string} sql - SQL-запрос.
 * @param {Array<any>} [params=[]] - Параметры для запроса.
 * @param {sqlite3.Database} [dbRef=dbInstance] - Опциональная ссылка на экземпляр БД, полезно для транзакций.
 * @returns {Promise<any>} Промис, который разрешается результатом запроса.
 */
function runAsync(sql, params = [], dbRef = dbInstance) {
    if (!dbRef) {
        return Promise.reject(new Error("База данных не инициализирована. Вызовите initializeDb() перед использованием."));
    }
    return new Promise((resolve, reject) => {
        dbRef.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

/**
 * Вспомогательная функция для получения одной строки результата.
 * @param {string} sql - SQL-запрос.
 * @param {Array<any>} [params=[]] - Параметры для запроса.
 * @param {sqlite3.Database} [dbRef=dbInstance]
 * @returns {Promise<object | undefined>} Промис, разрешающийся одной строкой или undefined.
 */
function getAsync(sql, params = [], dbRef = dbInstance) {
    if (!dbRef) {
        return Promise.reject(new Error("База данных не инициализирована. Вызовите initializeDb() перед использованием."));
    }
    return new Promise((resolve, reject) => {
        dbRef.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

/**
 * Вспомогательная функция для получения всех строк результата.
 * @param {string} sql - SQL-запрос.
 * @param {Array<any>} [params=[]] - Параметры для запроса.
 * @param {sqlite3.Database} [dbRef=dbInstance]
 * @returns {Promise<Array<object>>} Промис, разрешающийся массивом строк.
 */
function allAsync(sql, params = [], dbRef = dbInstance) {
    if (!dbRef) {
        return Promise.reject(new Error("База данных не инициализирована. Вызовите initializeDb() перед использованием."));
    }
    return new Promise((resolve, reject) => {
        dbRef.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

/**
 * Правильная вспомогательная функция для выполнения PRAGMA запросов.
 * PRAGMA запросы выполняются как обычные SQL-запросы через db.run().
 * @param {string} pragmaStatement - Полный PRAGMA запрос (например, "journal_mode = WAL;").
 * @param {sqlite3.Database} [dbRef=dbInstance]
 * @returns {Promise<void>} Промис, который разрешается после успешного выполнения PRAGMA.
 */
function runPragmaAsync(pragmaStatement, dbRef = dbInstance) {
    if (!dbRef) {
        return Promise.reject(new Error("База данных не инициализирована. Вызовите initializeDb() перед использованием."));
    }
    return new Promise((resolve, reject) => {
        // !!! Использование db.run() для PRAGMA !!!
        dbRef.run(pragmaStatement, (err) => {
            if (err) reject(err);
            else resolve(); // PRAGMA обычно не возвращает lastID/changes, просто успешное выполнение
        });
    });
}


/**
 * Инициализирует соединение с базой данных SQLite и выполняет все начальные настройки.
 * Возвращает Promise, который разрешается экземпляром базы данных, когда она полностью готова.
 * @returns {Promise<sqlite3.Database>} Экземпляр базы данных.
 */
function initializeDb() {
    if (dbReadyPromise) {
        return dbReadyPromise;
    }

    dbReadyPromise = new Promise((resolve, reject) => {
        dbInstance = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
                console.error('Ошибка при открытии базы данных:', err.message);
                dbReadyPromise = null;
                return reject(err);
            }
            console.log(`Подключено к базе данных SQLite: ${DB_PATH}`);

            // Цепочка асинхронных операций настройки:
            // 1. Установка журнального режима WAL
            // !!! Используем runPragmaAsync с полным PRAGMA-запросом !!!
            runPragmaAsync("PRAGMA journal_mode=WAL;", dbInstance)
                .then(() => {
                    console.log('Журнальный режим установлен в WAL.');
                    // 2. Создание таблицы checkpoints
                    return runAsync(`
                        CREATE TABLE IF NOT EXISTS checkpoints (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            thread_id TEXT NOT NULL,
                            data TEXT,
                            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                        );
                    `, [], dbInstance);
                })
                .then(() => {
                    console.log('Таблица checkpoints проверена/создана.');
                    // 3. Создание индекса для thread_id
                    return runAsync(`
                        CREATE INDEX IF NOT EXISTS idx_checkpoints_thread_id ON checkpoints (thread_id);
                    `, [], dbInstance);
                })
                .then(() => {
                    console.log('Индекс idx_checkpoints_thread_id проверен/создан.');
                    resolve(dbInstance);
                })
                .catch(setupErr => {
                    console.error('Ошибка во время инициализации или настройки БД:', setupErr.message);
                    if (dbInstance) {
                        dbInstance.close((closeErr) => {
                            if (closeErr) console.error('Ошибка при закрытии БД после ошибки настройки:', closeErr.message);
                            else console.log('Соединение с БД закрыто из-за ошибки настройки.');
                        });
                    }
                    dbReadyPromise = null;
                    reject(setupErr);
                });
        });
    });

    return dbReadyPromise;
}

/**
 * Возвращает Promise, который разрешается экземпляром базы данных.
 * Если БД еще не инициализирована, он вызовет initializeDb().
 * @returns {Promise<sqlite3.Database>} Promise, разрешающийся экземпляром БД.
 */
function getDbInstance() {
    if (!dbReadyPromise) {
        console.warn("getDbInstance() вызвана до явного initializeDb(). Инициирую.");
        return initializeDb();
    }
    return dbReadyPromise;
}

/**
 * Закрывает соединение с базой данных.
 * @returns {Promise<void>}
 */
function closeDb() {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            dbInstance.close((err) => {
                if (err) {
                    console.error('Ошибка при закрытии базы данных:', err.message);
                    reject(err);
                } else {
                    console.log('Соединение с базой данных закрыто.');
                    dbInstance = null;
                    dbReadyPromise = null;
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}

module.exports = {
    initializeDb,
    getDbInstance,
    runAsync,
    getAsync,
    allAsync,
    closeDb
};
