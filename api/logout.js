const { sendJson, methodNotAllowed } = require("../lib/http");
const { clearSessionCookie, isSecureRequest } = require("../lib/session");

module.exports = function handler(req, res) {
    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
    res.setHeader("Set-Cookie", clearSessionCookie(isSecureRequest(req)));
    return sendJson(res, 200, { ok: true });
};
