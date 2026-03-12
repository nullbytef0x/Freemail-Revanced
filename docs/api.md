# API Documentation

## Contents

- [Authentication and Authorization](#authentication-and-authorization)
- [Authentication Endpoints](#authentication-endpoints)
- [Mailbox Management](#mailbox-management)
- [Mailbox Settings](#mailbox-settings)
- [Email Operations](#email-operations)
- [Email Sending](#email-sending)
- [User Management](#user-management)
- [System Endpoints](#system-endpoints)

---

## Authentication and Authorization

### 🔐 Root Admin Token (Root Admin Override)

If the request includes a token exactly matching the server-side `JWT_TOKEN` environment variable, session Cookie/JWT validation is bypassed and the requester is treated as top-level admin (`strictAdmin`).

**Configuration:**
- `wrangler.toml` → `[vars]` → `JWT_TOKEN="your-root-admin-token"`

**How to pass the token (choose one):**
- Header (standard): `Authorization: Bearer <JWT_TOKEN>`
- Header (custom): `X-Admin-Token: <JWT_TOKEN>`
- Query: `?admin_token=<JWT_TOKEN>`

**Scope:**
- All protected backend endpoints: `/api/*`
- Session check: `GET /api/session`
- Receive callback: `POST /receive`
- Server-side access checks for admin pages (`/admin` / `/admin.html`) and unknown paths

**Behavior:**
- If matched, auth payload is: `{ role: 'admin', username: '__root__', userId: 0 }`
- `strictAdmin` resolves to true for `__root__` (equivalent to strict admin)
- If missing or mismatched, the system falls back to normal Cookie/JWT validation

**Examples:**

```bash
# Authorization header
curl -H "Authorization: Bearer <JWT_TOKEN>" https://your.domain/api/mailboxes

# X-Admin-Token header
curl -H "X-Admin-Token: <JWT_TOKEN>" https://your.domain/api/domains

# Query parameter
curl "https://your.domain/api/session?admin_token=<JWT_TOKEN>"
```

**Security note:** keep `JWT_TOKEN` secret and rotate it regularly.

### User Roles

| Role | Description |
|------|------|
| `strictAdmin` | Top-level administrator with full system access |
| `admin` | Administrator with user and mailbox management capabilities |
| `user` | Regular user, can only manage assigned mailboxes |
| `mailbox` | Mailbox user, can only access their own mailbox |
| `guest` | Guest mode, read-only mock data |

---

## Authentication Endpoints

### POST /api/login
User login.

**Request body:**
```json
{
  "username": "username or mailbox address",
  "password": "password"
}
```

**Supported login modes:**
1. Admin login: uses `ADMIN_NAME` / `ADMIN_PASSWORD`
2. Guest login: username `guest`, password from `GUEST_PASSWORD`
3. Regular user login: users from the `users` table
4. Mailbox login: mailbox address login (`can_login` must be enabled)

**Response example:**
```json
{
  "success": true,
  "role": "admin",
  "can_send": 1,
  "mailbox_limit": 9999
}
```

### POST /api/logout
User logout.

**Response:**
```json
{ "success": true }
```

### GET /api/session
Check current session status.

**Response:**
```json
{
  "authenticated": true,
  "role": "admin",
  "username": "admin",
  "strictAdmin": true
}
```

---

## Mailbox Management

### GET /api/domains
Get available mail domains.

**Response:**
```json
["example.com", "mail.example.com"]
```

### GET /api/generate
Generate a random temporary mailbox.

**Query params:**
| Param | Type | Description |
|------|------|------|
| `length` | number | Optional random local-part length |
| `domainIndex` | number | Optional domain index (default: 0) |

**Response:**
```json
{
  "email": "abc123@example.com",
  "expires": 1704067200000
}
```

### POST /api/create
Create a custom mailbox.

**Request body:**
```json
{
  "local": "myname",
  "domainIndex": 0
}
```

**Response:**
```json
{
  "email": "myname@example.com",
  "expires": 1704067200000
}
```

### GET /api/mailboxes
Get mailbox list for the current user.

**Query params:**
| Param | Type | Description |
|------|------|------|
| `limit` | number | Page size (default: 100, max: 500) |
| `offset` | number | Offset |
| `domain` | string | Filter by domain |
| `favorite` | boolean | Filter by favorite status |
| `forward` | boolean | Filter by forwarding status |

**Response:**
```json
[
  {
    "id": 1,
    "address": "test@example.com",
    "created_at": "2024-01-01 00:00:00",
    "is_pinned": 1,
    "password_is_default": 1,
    "can_login": 0,
    "forward_to": "backup@gmail.com",
    "is_favorite": 1
  }
]
```

### DELETE /api/mailboxes
Delete a mailbox.

**Query params:**
| Param | Type | Description |
|------|------|------|
| `address` | string | Mailbox address to delete |

**Response:**
```json
{ "success": true, "deleted": true }
```

### GET /api/user/quota
Get mailbox quota for current user.

**Response (regular user):**
```json
{
  "limit": 10,
  "used": 3,
  "remaining": 7
}
```

**Response (admin):**
```json
{
  "limit": -1,
  "used": 150,
  "remaining": -1,
  "note": "Admin has no mailbox count limit"
}
```

### POST /api/mailboxes/pin
Toggle mailbox pinned status.

**Query params:**
| Param | Type | Description |
|------|------|------|
| `address` | string | Mailbox address |

**Response:**
```json
{ "success": true, "pinned": true }
```

### POST /api/mailboxes/reset-password
Reset mailbox password (strictAdmin only).

**Query params:**
| Param | Type | Description |
|------|------|------|
| `address` | string | Mailbox address |

**Response:**
```json
{ "success": true }
```

### POST /api/mailboxes/toggle-login
Enable/disable mailbox login (strictAdmin only).

**Request body:**
```json
{
  "address": "test@example.com",
  "can_login": true
}
```

**Response:**
```json
{ "success": true, "can_login": true }
```

### POST /api/mailboxes/change-password
Change mailbox password (strictAdmin only).

**Request body:**
```json
{
  "address": "test@example.com",
  "new_password": "newpassword123"
}
```

**Response:**
```json
{ "success": true }
```

### POST /api/mailboxes/batch-toggle-login
Batch enable/disable mailbox login (strictAdmin only).

**Request body:**
```json
{
  "addresses": ["test1@example.com", "test2@example.com"],
  "can_login": true
}
```

**Response:**
```json
{
  "success": true,
  "success_count": 2,
  "fail_count": 0,
  "total": 2,
  "results": [
    { "address": "test1@example.com", "success": true, "updated": true }
  ]
}
```

---

## Mailbox Settings

### POST /api/mailbox/forward
Set mailbox forwarding target.

**Request body:**
```json
{
  "mailbox_id": 1,
  "forward_to": "backup@gmail.com"
}
```

**Response:**
```json
{ "success": true }
```

### POST /api/mailbox/favorite
Toggle mailbox favorite status.

**Request body:**
```json
{
  "mailbox_id": 1,
  "is_favorite": true
}
```

**Response:**
```json
{ "success": true }
```

### POST /api/mailboxes/batch-favorite
Batch set favorite status by mailbox ID (strictAdmin only).

**Request body:**
```json
{
  "mailbox_ids": [1, 2, 3],
  "is_favorite": true
}
```

### POST /api/mailboxes/batch-forward
Batch set forwarding by mailbox ID (strictAdmin only).

**Request body:**
```json
{
  "mailbox_ids": [1, 2, 3],
  "forward_to": "backup@gmail.com"
}
```

### POST /api/mailboxes/batch-favorite-by-address
Batch set favorite status by mailbox address (strictAdmin only).

**Request body:**
```json
{
  "addresses": ["test1@example.com", "test2@example.com"],
  "is_favorite": true
}
```

### POST /api/mailboxes/batch-forward-by-address
Batch set forwarding by mailbox address (strictAdmin only).

**Request body:**
```json
{
  "addresses": ["test1@example.com", "test2@example.com"],
  "forward_to": "backup@gmail.com"
}
```

### PUT /api/mailbox/password
Mailbox user changes own password.

**Request body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{ "success": true, "message": "Password updated successfully" }
```

---

## Email Operations

### GET /api/emails
Get email list.

**Query params:**
| Param | Type | Description |
|------|------|------|
| `mailbox` | string | Mailbox address (required) |
| `limit` | number | Max items (default: 20, max: 50) |

**Response:**
```json
[
  {
    "id": 1,
    "sender": "sender@example.com",
    "subject": "Mail subject",
    "received_at": "2024-01-01 12:00:00",
    "is_read": 0,
    "preview": "Mail preview...",
    "verification_code": "123456"
  }
]
```

### GET /api/emails/batch
Get batch email metadata.

**Query params:**
| Param | Type | Description |
|------|------|------|
| `ids` | string | Comma-separated email IDs (max 50) |

**Response:**
```json
[
  {
    "id": 1,
    "sender": "sender@example.com",
    "to_addrs": "recipient@example.com",
    "subject": "Mail subject",
    "verification_code": "123456",
    "preview": "Preview...",
    "r2_bucket": "mail-eml",
    "r2_object_key": "2024/01/01/test@example.com/xxx.eml",
    "received_at": "2024-01-01 12:00:00",
    "is_read": 0
  }
]
```

### GET /api/email/:id
Get single email details.

**Response:**
```json
{
  "id": 1,
  "sender": "sender@example.com",
  "to_addrs": "recipient@example.com",
  "subject": "Mail subject",
  "verification_code": "123456",
  "content": "Plain text content",
  "html_content": "<p>HTML content</p>",
  "received_at": "2024-01-01 12:00:00",
  "is_read": 1,
  "download": "/api/email/1/download"
}
```

### GET /api/email/:id/download
Download original EML file.

**Response:** raw mail file in `message/rfc822` format.

### DELETE /api/email/:id
Delete a single email.

**Response:**
```json
{
  "success": true,
  "deleted": true,
  "message": "Email deleted"
}
```

### DELETE /api/emails
Delete all emails in a mailbox.

**Query params:**
| Param | Type | Description |
|------|------|------|
| `mailbox` | string | Mailbox address (required) |

**Response:**
```json
{
  "success": true,
  "deletedCount": 5
}
```

---

## Email Sending

> Requires `RESEND_API_KEY` environment variable.

### GET /api/sent
Get sent-mail history list.

**Query params:**
| Param | Type | Description |
|------|------|------|
| `from` | string | Sender mailbox (required) |
| `limit` | number | Max items (default: 20, max: 50) |

**Response:**
```json
[
  {
    "id": 1,
    "resend_id": "abc123",
    "recipients": "to@example.com",
    "subject": "Mail subject",
    "created_at": "2024-01-01 12:00:00",
    "status": "delivered"
  }
]
```

### GET /api/sent/:id
Get sent-mail details.

**Response:**
```json
{
  "id": 1,
  "resend_id": "abc123",
  "from_addr": "from@example.com",
  "recipients": "to@example.com",
  "subject": "Mail subject",
  "html_content": "<p>Content</p>",
  "text_content": "Content",
  "status": "delivered",
  "scheduled_at": null,
  "created_at": "2024-01-01 12:00:00"
}
```

### DELETE /api/sent/:id
Delete a sent-mail record.

**Response:**
```json
{ "success": true }
```

### POST /api/send
Send one email.

**Request body:**
```json
{
  "from": "sender@example.com",
  "fromName": "Sender Name",
  "to": "recipient@example.com",
  "subject": "Mail subject",
  "html": "<p>HTML content</p>",
  "text": "Plain text content",
  "scheduledAt": "2024-01-02T12:00:00Z"
}
```

**Response:**
```json
{ "success": true, "id": "resend-id-xxx" }
```

### POST /api/send/batch
Send batch emails.

**Request body:**
```json
[
  {
    "from": "sender@example.com",
    "to": "recipient1@example.com",
    "subject": "Subject 1",
    "html": "<p>Content 1</p>"
  },
  {
    "from": "sender@example.com",
    "to": "recipient2@example.com",
    "subject": "Subject 2",
    "html": "<p>Content 2</p>"
  }
]
```

**Response:**
```json
{
  "success": true,
  "result": [
    { "id": "resend-id-1" },
    { "id": "resend-id-2" }
  ]
}
```

### GET /api/send/:id
Get send result (from Resend API).

### PATCH /api/send/:id
Update send status or scheduled time.

**Request body:**
```json
{
  "status": "canceled",
  "scheduledAt": "2024-01-03T12:00:00Z"
}
```

### POST /api/send/:id/cancel
Cancel scheduled email.

**Response:**
```json
{ "success": true }
```

---

## User Management

> Endpoints below require `strictAdmin` permission.

### GET /api/users
Get user list.

**Query params:**
| Param | Type | Description |
|------|------|------|
| `limit` | number | Page size (default: 50, max: 100) |
| `offset` | number | Offset |
| `sort` | string | `asc` or `desc` (default: `desc`) |

**Response:**
```json
[
  {
    "id": 1,
    "username": "testuser",
    "role": "user",
    "mailbox_limit": 10,
    "can_send": 0,
    "mailbox_count": 3,
    "created_at": "2024-01-01 00:00:00"
  }
]
```

### POST /api/users
Create a user.

**Request body:**
```json
{
  "username": "newuser",
  "password": "password123",
  "role": "user",
  "mailboxLimit": 10
}
```

**Response:**
```json
{
  "id": 2,
  "username": "newuser",
  "role": "user",
  "mailbox_limit": 10,
  "can_send": 0,
  "created_at": "2024-01-01 00:00:00"
}
```

### PATCH /api/users/:id
Update user info.

**Request body:**
```json
{
  "username": "updatedname",
  "password": "newpassword",
  "mailboxLimit": 20,
  "can_send": 1,
  "role": "admin"
}
```

**Response:**
```json
{ "success": true }
```

### DELETE /api/users/:id
Delete user.

**Response:**
```json
{ "success": true }
```

### GET /api/users/:id/mailboxes
Get mailbox list for a specific user.

**Response:**
```json
[
  {
    "address": "test@example.com",
    "created_at": "2024-01-01 00:00:00",
    "is_pinned": 0
  }
]
```

### POST /api/users/assign
Assign mailbox to a user.

**Request body:**
```json
{
  "username": "testuser",
  "address": "newbox@example.com"
}
```

**Response:**
```json
{ "success": true }
```

### POST /api/users/unassign
Unassign mailbox from a user.

**Request body:**
```json
{
  "username": "testuser",
  "address": "oldbox@example.com"
}
```

**Response:**
```json
{ "success": true }
```

---

## System Endpoints

### POST /receive
Email receiving callback (for Cloudflare Email Routing).

> Requires authentication, typically called internally by the platform.

---

## Error Response

When an API fails, it returns this format:

```json
{
  "error": "error message"
}
```

**Common HTTP status codes:**
| Code | Description |
|--------|------|
| 400 | Bad request parameters |
| 401 | Unauthorized |
| 403 | Forbidden (demo mode restriction or role restriction) |
| 404 | Resource not found |
| 500 | Internal server error |
