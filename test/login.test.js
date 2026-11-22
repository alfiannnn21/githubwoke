const assert = require("node:assert/strict");
const { test } = require("node:test");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const login = require("../api/login");

function createResponse() {
    return {
        headers: {},
        statusCode: 0,
        setHeader(name, value) {
            this.headers[name.toLowerCase()] = value;
        },
        end(value) {
            this.body = value ? JSON.parse(value) : null;
        }
    };
}

test("login rejects unsupported methods", async () => {
    const response = createResponse();
    await login({ method: "GET", headers: {} }, response);
    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.allow, "POST");
});

test("login rejects malformed credentials before querying MySQL", async () => {
    const response = createResponse();
    await login({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: { email: "not-an-email", password: "example-password" }
    }, response);
    assert.equal(response.statusCode, 400);
});

test("login reports missing MySQL configuration without accepting credentials", async () => {
    const names = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"];
    const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    names.forEach((name) => delete process.env[name]);

    try {
        const response = createResponse();
        await login({
            method: "POST",
            headers: { "content-type": "application/json" },
            body: { email: "operator@example.com", password: "not-a-real-password" }
        }, response);
        assert.equal(response.statusCode, 503);
        assert.match(response.body.error, /belum dikonfigurasi/);
    } finally {
        names.forEach((name) => {
            if (previous[name] === undefined) delete process.env[name];
            else process.env[name] = previous[name];
        });
    }
});

test("login accepts streamed JSON requests before reporting unconfigured MySQL", async () => {
    const names = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"];
    const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    names.forEach((name) => delete process.env[name]);

    try {
        const response = createResponse();
        await login({
            method: "POST",
            headers: { "content-type": "application/json" },
            async *[Symbol.asyncIterator]() {
                yield Buffer.from(JSON.stringify({
                    email: "operator@example.com",
                    password: "preview-only-password"
                }));
            }
        }, response);
        assert.equal(response.statusCode, 503);
        assert.match(response.body.error, /belum dikonfigurasi/);
    } finally {
        names.forEach((name) => {
            if (previous[name] === undefined) delete process.env[name];
            else process.env[name] = previous[name];
        });
    }
});

test("login issues sessions only to active operator accounts", async () => {
    const names = [
        "MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE",
        "SESSION_SECRET"
    ];
    const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    const originalCreatePool = mysql.createPool;
    const password = "correct-horse-battery-staple";
    const passwordHash = bcrypt.hashSync(password, 4);
    names.forEach((name) => {
        process.env[name] = name === "SESSION_SECRET"
            ? "test-login-session-secret-with-more-than-32-bytes"
            : "test-value";
    });
    mysql.createPool = () => ({
        execute: async (query, values) => [[{
            id: 5,
            email: values[0],
            password_hash: passwordHash,
            role: values[0] === "operator@example.com" ? "operator" : "customer",
            is_active: 1
        }]]
    });

    try {
        const customerResponse = createResponse();
        await login({
            method: "POST",
            headers: { "content-type": "application/json" },
            body: { email: "customer@example.com", password }
        }, customerResponse);
        assert.equal(customerResponse.statusCode, 401);
        assert.equal(customerResponse.headers["set-cookie"], undefined);

        const operatorResponse = createResponse();
        await login({
            method: "POST",
            headers: { "content-type": "application/json" },
            body: { email: "operator@example.com", password }
        }, operatorResponse);
        assert.equal(operatorResponse.statusCode, 200);
        assert.match(operatorResponse.headers["set-cookie"], /HttpOnly/);
        assert.equal(operatorResponse.body.user.role, "operator");
    } finally {
        mysql.createPool = originalCreatePool;
        names.forEach((name) => {
            if (previous[name] === undefined) delete process.env[name];
            else process.env[name] = previous[name];
        });
    }
});
