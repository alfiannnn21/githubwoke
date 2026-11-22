function sendJson(res, status, body) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(body));
}

function parseJson(value) {
    try {
        return JSON.parse(value);
    } catch (error) {
        throw new Error("Invalid JSON request body");
    }
}

async function readJsonBody(req) {
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
        return req.body;
    }
    if (typeof req.body === "string") {
        return parseJson(req.body);
    }
    if (Buffer.isBuffer(req.body)) {
        return parseJson(req.body.toString("utf8"));
    }
    if (typeof req[Symbol.asyncIterator] !== "function") {
        throw new Error("Expected a JSON request body");
    }

    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > 8192) throw new Error("Request body too large");
        chunks.push(chunk);
    }
    return parseJson(Buffer.concat(chunks).toString("utf8"));
}

function methodNotAllowed(res, allowed) {
    res.setHeader("Allow", allowed.join(", "));
    sendJson(res, 405, { error: "Method not allowed." });
}

module.exports = { sendJson, readJsonBody, methodNotAllowed };
