const mysql = require("mysql2/promise");

let pool;

function getMysqlOptions() {
    const required = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"];
    const missing = required.filter((name) => !process.env[name]);
    if (missing.length) {
        throw new Error(`Missing MySQL configuration: ${missing.join(", ")}`);
    }

    const options = {
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 3,
        queueLimit: 0,
        charset: "utf8mb4"
    };

    if (process.env.MYSQL_SSL_CA) {
        options.ssl = { ca: process.env.MYSQL_SSL_CA };
    } else if (process.env.MYSQL_SSL === "true") {
        options.ssl = { rejectUnauthorized: true };
    }

    if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
        throw new Error("MYSQL_PORT must be a valid TCP port");
    }

    return options;
}

function getPool() {
    if (!pool) pool = mysql.createPool(getMysqlOptions());
    return pool;
}

module.exports = { getPool, getMysqlOptions };
