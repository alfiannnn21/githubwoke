const assert = require("node:assert/strict");
const { test } = require("node:test");
const sessionHandler = require("../api/session");
const {
    SESSION_TTL_SECONDS,
    createSessionToken,
    verifySessionToken,
    sessionCookie,
    clearSessionCookie
} = require("../lib/session");

const previousSecret = process.env.SESSION_SECRET;
process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-bytes";

test("signed sessions round-trip and reject altered or expired tokens", () => {
    const now = 1_800_000_000_000;
    const token = createSessionToken({
        id: 7,
        email: "operator@example.com",
        role: "operator"
    }, now);

    assert.deepEqual(verifySessionToken(token, now), {
        id: "7",
        email: "operator@example.com",
        role: "operator"
    });
    assert.equal(verifySessionToken(token + "x", now), null);
    assert.equal(verifySessionToken(token, now + (SESSION_TTL_SECONDS + 1) * 1000), null);
});

test("session cookies are HTTP-only and can be cleared", () => {
    const cookie = sessionCookie("signed-token", true);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(clearSessionCookie(true), /Max-Age=0/);
});

test("session API accepts operator tokens and clears non-operator tokens", () => {
    function response() {
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

    const operatorToken = createSessionToken({
        id: 8,
        email: "operator@example.com",
        role: "operator"
    });
    const operatorResponse = response();
    sessionHandler({
        method: "GET",
        headers: { cookie: `santap_session=${operatorToken}` }
    }, operatorResponse);
    assert.equal(operatorResponse.statusCode, 200);
    assert.equal(operatorResponse.body.user.role, "operator");

    const customerToken = createSessionToken({
        id: 9,
        email: "customer@example.com",
        role: "customer"
    });
    const customerResponse = response();
    sessionHandler({
        method: "GET",
        headers: { cookie: `santap_session=${customerToken}` }
    }, customerResponse);
    assert.equal(customerResponse.statusCode, 401);
    assert.match(customerResponse.headers["set-cookie"], /Max-Age=0/);
});

test.after(() => {
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
});
