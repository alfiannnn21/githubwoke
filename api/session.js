const { sendJson, methodNotAllowed } = require("../lib/http");
const {
    verifySessionToken,
    getSessionToken,
    clearSessionCookie,
    isSecureRequest
} = require("../lib/session");

module.exports = function handler(req, res) {
    if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

    try {
        const token = getSessionToken(req);
        const user = token ? verifySessionToken(token) : null;
        if (!user || user.role !== "operator") {
            if (token) res.setHeader("Set-Cookie", clearSessionCookie(isSecureRequest(req)));
            return sendJson(res, 401, { authenticated: false });
        }
        return sendJson(res, 200, {
            authenticated: true,
            user: { email: user.email, role: user.role }
        });
    } catch (error) {
        if (error.message && error.message.startsWith("SESSION_SECRET")) {
            return sendJson(res, 503, { error: "SESSION_SECRET belum dikonfigurasi dengan benar di Vercel." });
        }
        console.error("Session API error:", error.code || error.name || "unknown");
        return sendJson(res, 503, { error: "Layanan login sedang tidak tersedia." });
    }
};
