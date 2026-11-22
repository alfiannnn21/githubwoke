const crypto = require("node:crypto");

const COOKIE_NAME = "santap_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function getSecret() {
    const secret = process.env.SESSION_SECRET;
    if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
        throw new Error("SESSION_SECRET must contain at least 32 bytes");
    }
    return secret;
}

function sign(value, secret) {
    return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function createSessionToken(user, now = Date.now()) {
    const payload = Buffer.from(JSON.stringify({
        sub: String(user.id),
        email: user.email,
        role: user.role,
        exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS
    })).toString("base64url");
    return `${payload}.${sign(payload, getSecret())}`;
}

function verifySessionToken(token, now = Date.now()) {
    if (typeof token !== "string" || token.length > 4096) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;
    const expected = sign(payload, getSecret());
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
        return null;
    }

    try {
        const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (!session.sub || !session.email || !session.role ||
            !Number.isInteger(session.exp) || session.exp <= Math.floor(now / 1000)) {
            return null;
        }
        return { id: session.sub, email: session.email, role: session.role };
    } catch (error) {
        return null;
    }
}

function getSessionToken(req) {
    const cookieHeader = req.headers.cookie || "";
    const pair = cookieHeader.split(";").map((part) => part.trim())
        .find((part) => part.startsWith(`${COOKIE_NAME}=`));
    return pair ? pair.slice(COOKIE_NAME.length + 1) : null;
}

function sessionCookie(token, secure) {
    return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure ? "; Secure" : ""}`;
}

function clearSessionCookie(secure) {
    return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

function isSecureRequest(req) {
    return process.env.NODE_ENV === "production" || req.headers["x-forwarded-proto"] === "https";
}

module.exports = {
    SESSION_TTL_SECONDS,
    createSessionToken,
    verifySessionToken,
    getSessionToken,
    sessionCookie,
    clearSessionCookie,
    isSecureRequest
};
