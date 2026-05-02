# API Reference — Team Hub

Base URL: `http://localhost:4000`

All request bodies are JSON (`Content-Type: application/json`).  
Authenticated endpoints read the `access_token` httpOnly cookie automatically.  
For non-browser clients, pass `Authorization: Bearer <access_token>` instead.

---

## Authentication

Tokens are delivered and expected as **httpOnly cookies** — never exposed to JavaScript.

| Cookie | Scope | TTL |
|---|---|---|
| `access_token` | All requests | 15 minutes |
| `refresh_token` | `POST /api/auth/refresh` only | 7 days |

---

## Endpoints

### Health

#### `GET /health`

Check server is alive.

**Auth required:** No

**Response `200`**
```json
{
  "status": "ok"
}
```

---

### Auth

#### `POST /api/auth/register`

Create a new account. Sets `access_token` and `refresh_token` cookies on success.

**Auth required:** No

**Request body**
```json
{
  "name": "Alice Smith",
  "email": "alice@example.com",
  "password": "mypassword123"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | ✅ | — |
| `email` | string | ✅ | Must be unique |
| `password` | string | ✅ | Minimum 8 characters |

**Response `201`**
```json
{
  "user": {
    "id": "a1b2c3d4-...",
    "name": "Alice Smith",
    "email": "alice@example.com",
    "createdAt": "2026-05-02T10:00:00.000Z"
  }
}
```

**Error responses**
| Status | Message |
|---|---|
| `400` | `name, email and password are required` |
| `400` | `Password must be at least 8 characters` |
| `409` | `Email already in use` |

---

#### `POST /api/auth/login`

Log in with email and password. Sets `access_token` and `refresh_token` cookies on success.

**Auth required:** No

**Request body**
```json
{
  "email": "alice@example.com",
  "password": "mypassword123"
}
```

| Field | Type | Required |
|---|---|---|
| `email` | string | ✅ |
| `password` | string | ✅ |

**Response `200`**
```json
{
  "user": {
    "id": "a1b2c3d4-...",
    "name": "Alice Smith",
    "email": "alice@example.com",
    "avatarUrl": null
  }
}
```

**Error responses**
| Status | Message |
|---|---|
| `400` | `email and password are required` |
| `401` | `Invalid credentials` |

---

#### `POST /api/auth/refresh`

Exchange a valid `refresh_token` cookie for a new pair of tokens (rotation — old token is invalidated).

**Auth required:** No  
**Cookie required:** `refresh_token`

**Request body:** None

**Response `200`**
```json
{
  "message": "Tokens refreshed"
}
```

**Error responses**
| Status | Message |
|---|---|
| `401` | `No refresh token` |
| `401` | `Invalid or expired refresh token` |
| `401` | `Refresh token revoked or expired` |

---

#### `POST /api/auth/logout`

Revoke the current refresh token and clear both cookies.

**Auth required:** ✅ (`access_token` cookie or `Authorization: Bearer`)

**Request body:** None

**Response `200`**
```json
{
  "message": "Logged out"
}
```

**Error responses**
| Status | Message |
|---|---|
| `401` | `Authentication required` |
| `401` | `Invalid or expired access token` |

---

#### `GET /api/auth/me`

Return the currently authenticated user's profile.

**Auth required:** ✅

**Request body:** None

**Response `200`**
```json
{
  "user": {
    "id": "a1b2c3d4-...",
    "name": "Alice Smith",
    "email": "alice@example.com",
    "avatarUrl": null,
    "createdAt": "2026-05-02T10:00:00.000Z"
  }
}
```

**Error responses**
| Status | Message |
|---|---|
| `401` | `Authentication required` |
| `404` | `User not found` |

---

## Error Format

All errors return a consistent JSON body:

```json
{
  "error": "Human-readable error message"
}
```

| Status | Meaning |
|---|---|
| `400` | Bad request — missing or invalid fields |
| `401` | Unauthenticated — missing or expired token |
| `403` | Forbidden — authenticated but not authorized |
| `404` | Resource not found |
| `409` | Conflict — resource already exists |
| `500` | Internal server error |

---

## Authentication Flow

```
┌─────────┐                        ┌─────────┐                    ┌──────────┐
│ Client  │                        │   API   │                    │    DB    │
└────┬────┘                        └────┬────┘                    └────┬─────┘
     │  POST /api/auth/login            │                              │
     │ ────────────────────────────────>│                              │
     │                                  │  lookup user + bcrypt verify │
     │                                  │ ────────────────────────────>│
     │                                  │<────────────────────────────-│
     │                                  │  store hashed refresh token  │
     │                                  │ ────────────────────────────>│
     │  Set-Cookie: access_token (15m)  │                              │
     │  Set-Cookie: refresh_token (7d)  │                              │
     │<─────────────────────────────────│                              │
     │                                  │                              │
     │  GET /api/auth/me                │                              │
     │  Cookie: access_token ──────────>│                              │
     │  { user } <─────────────────────│                              │
     │                                  │                              │
     │  POST /api/auth/refresh          │                              │
     │  Cookie: refresh_token ─────────>│                              │
     │                                  │  verify hash, rotate token   │
     │                                  │ ────────────────────────────>│
     │  New access_token + refresh_token│                              │
     │<─────────────────────────────────│                              │
```

---

## Using with `fetch` (browser)

```js
// Login
const res = await fetch("http://localhost:4000/api/auth/login", {
  method: "POST",
  credentials: "include",          // sends/receives cookies
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "alice@example.com", password: "mypassword123" }),
});

// Authenticated request
const profile = await fetch("http://localhost:4000/api/auth/me", {
  credentials: "include",
});

// Refresh tokens
await fetch("http://localhost:4000/api/auth/refresh", {
  method: "POST",
  credentials: "include",
});

// Logout
await fetch("http://localhost:4000/api/auth/logout", {
  method: "POST",
  credentials: "include",
});
```

> `credentials: "include"` is required for cross-origin cookie handling.  
> Your API must set `Access-Control-Allow-Credentials: true` (already configured via `cors({ credentials: true })`).
