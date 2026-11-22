const bcrypt = require("bcryptjs");
const { getPool } = require("../lib/db");

const email = (process.env.OPERATOR_EMAIL || "").trim().toLowerCase();
const password = process.env.OPERATOR_PASSWORD || "";
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

if (!validEmail || email.length > 254) {
    console.error("Set OPERATOR_EMAIL to a valid operator email address.");
    process.exit(1);
}
if (Buffer.byteLength(password, "utf8") < 14 || Buffer.byteLength(password, "utf8") > 72) {
    console.error("Set OPERATOR_PASSWORD to a unique password between 14 and 72 bytes.");
    process.exit(1);
}

async function main() {
    const passwordHash = await bcrypt.hash(password, 12);
    const pool = getPool();
    try {
        await pool.execute(
            "INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, 'operator', 1)",
            [email, passwordHash]
        );
        console.log(`Created operator account for ${email}.`);
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error("Could not create operator account:", error.code || error.message || "unknown error");
    process.exitCode = 1;
});
