import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Shared JWT verification (better-auth JWT plugin tokens).
 * Any route that needs protection uses the `verifyToken` middleware;
 * handlers that want the payload directly can call `verifyJwt` themselves.
 *
 * Auth app (booknook-app-client) signs tokens with:
 *   iss = BETTER_AUTH_URL origin,  aud = JWT_AUDIENCE (falls back to origin)
 * Keep these env values in sync with the client .env, and don't hardcode
 * them — derived values survive trailing slashes/whitespace.
 */
function authOrigin() {
  const url = process.env.BETTER_AUTH_URL;
  if (!url) {
    throw new Error(
      "BETTER_AUTH_URL is not set — add it to the server .env (e.g. http://localhost:3000)",
    );
  }
  return new URL(url).origin;
}

// Remote JWKS singleton; built on first use so .env is loaded by then.
let JWKS;
function getJwks() {
  if (!JWKS) {
    JWKS = createRemoteJWKSet(new URL(`${authOrigin()}/api/auth/jwks`));
  }
  return JWKS;
}

/**
 * Verify a raw JWT string and return its payload.
 * Throws jose error codes you can branch on (e.g. "ERR_JWT_EXPIRED").
 */
export async function verifyJwt(token) {
  const issuer = authOrigin();
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer,
    audience: process.env.JWT_AUDIENCE ?? issuer,
    algorithms: ["EdDSA"],
  });
  return payload;
}

/**
 * Express middleware: 401s on a missing/invalid Bearer token,
 * or attaches the verified payload to `req.user` and calls next().
 */
export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).send({
        message: "Unauthorized: Token is missing",
      });
    }

    const token = authHeader.split(" ")[1];

    req.user = await verifyJwt(token);

    next();
  } catch (error) {
    console.error("JWT Error:", error.code, "-", error.message);

    return res.status(401).send({
      message:
        error.code === "ERR_JWT_EXPIRED"
          ? "Session expired. Please log in again."
          : "Invalid token.",
    });
  }
}
