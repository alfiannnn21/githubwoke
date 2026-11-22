# SANTAP+ Website

The public catalog is in `docs/`. GitHub Pages can serve the static catalog but cannot run the login API. The Vercel deployment serves `docs/` and the Node.js API in `api/`; login is available there after MySQL and the environment variables below are configured.

## MySQL setup

Create a MySQL database and run [`database/schema.sql`](database/schema.sql). The login reads only operator accounts from the `users` table and verifies the stored bcrypt password hash.

In Vercel, set these project environment variables:

- `MYSQL_HOST`
- `MYSQL_PORT` (optional; defaults to `3306`)
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `SESSION_SECRET` (at least 32 random bytes, encoded as a string)
- `MYSQL_SSL=true` if the database provider requires TLS, or `MYSQL_SSL_CA` for its CA certificate

Generate a session secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Never commit database credentials or session secrets.

To create the first operator account from a trusted machine with access to the database, set the MySQL variables plus `OPERATOR_EMAIL` and a unique `OPERATOR_PASSWORD` (14–72 bytes), then run:

```powershell
npm install
npm run create-operator
```

The password is hashed with bcrypt before it is stored. The script does not print or save the password.

## Production protection

Before enabling public production login, configure Vercel Firewall rate limiting for `POST /api/login`. This implementation does not include a distributed brute-force limiter.

## Local checks

Run `npm test` for the session-cookie tests. The Vercel login routes are `POST /api/login`, `GET /api/session`, and `POST /api/logout`.

The ignored local PHP application and its database dump are not part of this repository; this Vercel login is a separate Node.js/MySQL implementation.
