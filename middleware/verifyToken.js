import { createRemoteJWKSet, jwtVerify } from "jose";

function authOrigin() {
  const url = process.env.BETTER_AUTH_URL;
  if (!url) {
    throw new Error(
      "BETTER_AUTH_URL is not set — add it to the server .env (e.g. http://localhost:3000)",
    );
  }
  return new URL(url).origin;
}
let JWKS;
function getJwks() {
  if (!JWKS) {
    JWKS = createRemoteJWKSet(new URL(`${authOrigin()}/api/auth/jwks`));
  }
  return JWKS;
}
export async function verifyJwt(token) {
  const issuer = authOrigin();
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer,
    audience: process.env.JWT_AUDIENCE ?? issuer,
    algorithms: ["EdDSA"],
  });
  return payload;
}

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
