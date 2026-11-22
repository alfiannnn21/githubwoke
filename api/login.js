const bcrypt = require("bcryptjs");
const { getPool } = require("../lib/db");
const { sendJson, readJsonBody, methodNotAllowed } = require("../lib/http");
const { createSessionToken, sessionCookie, isSecureRequest } = require("../lib/session");

const DUMMY_HASH = bcrypt.hashSync("not-a-real-account-password", 12);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(req, res) {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

    try {
        const contentType = req.headers["content-type"] || "";
        if (!contentType.toLowerCase().includes("application/json")) {
            return sendJson(res, 415, { error: "Permintaan login harus menggunakan JSON." });
        }

        const body = await readJsonBody(req);
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body.password === "string" ? body.password : "";

        if (email.length > 254 || !EMAIL_PATTERN.test(email) ||
            !password || Buffer.byteLength(password, "utf8") > 72) {
            return sendJson(res, 400, { error: "Masukkan email dan kata sandi yang valid." });
        }

        const [rows] = await getPool().execute(
            "SELECT id, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1",
            [email]
        );
        const user = rows[0];
        const passwordMatches = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
        if (!user || !user.is_active || user.role !== "operator" || !passwordMatches) {
            return sendJson(res, 401, { error: "Email atau kata sandi salah." });
        }

        const token = createSessionToken(user);
        res.setHeader("Set-Cookie", sessionCookie(token, isSecureRequest(req)));
        return sendJson(res, 200, {
            ok: true,
            user: { email: user.email, role: user.role }
        });
    } catch (error) {
        if (error.message && error.message.startsWith("Missing MySQL configuration:")) {
            return sendJson(res, 503, { error: "Login belum dikonfigurasi di Vercel." });
        }
        if (error.message && error.message.startsWith("SESSION_SECRET")) {
            return sendJson(res, 503, { error: "SESSION_SECRET belum dikonfigurasi dengan benar di Vercel." });
        }
        if (error.message === "Expected a JSON request body" ||
            error.message === "Invalid JSON request body" ||
            error.message === "Request body too large") {
            return sendJson(res, 400, { error: "Permintaan login tidak valid." });
        }
        console.error("Login API error:", error.code || error.name || "unknown");
        return sendJson(res, 503, { error: "Layanan login sedang tidak tersedia." });
    }
};
