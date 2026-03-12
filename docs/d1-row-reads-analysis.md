# D1 Database Row-Read Analysis

## Why can there be 4 million row reads?

Even with a small user base, total row reads can still become high. Here are the common causes:

### 1. **Full-table scans from COUNT queries**

```sql
-- This scans the entire mailboxes table
SELECT COUNT(1) AS count FROM mailboxes;
-- With 10,000 mailboxes: billed as 10,000 row reads
```

**COUNT queries used in this project:**
- `getTotalMailboxCount()` - triggered when super admin checks quota
- `getCachedUserQuota()` - includes COUNT for user quota
- `listUsersWithCounts()` - subquery COUNT(1)

**Current mitigation:** caching has been added, but this still needs monitoring.

---

### 2. **Row accumulation in JOIN queries**

```sql
-- Query in listUsersWithCounts
SELECT u.*, COALESCE(cnt.c, 0) AS mailbox_count
FROM users u
LEFT JOIN (
  SELECT user_id, COUNT(1) AS c
  FROM user_mailboxes
  GROUP BY user_id
) cnt ON cnt.user_id = u.id;
```

**Billing example:**
- Scan `users`: assume 100 users
- Scan `user_mailboxes`: assume 5,000 records
- Total: ~5,100 row reads per user-list query

---

### 3. **Frequent initialization queries**

Each Worker cold start/restart may execute:
- Multiple `PRAGMA table_info()` calls
- `SELECT name FROM sqlite_master`
- Schema checks/migrations

**Estimate:**
- 50 restarts/day
- ~200 row reads per init
- ~10,000 row reads/day

---

### 4. **Missing LIMIT or overly large LIMIT**

Before optimization:
```sql
SELECT * FROM messages WHERE mailbox_id = ? ORDER BY received_at DESC LIMIT 50;
```

With 100 active users checking mail 10 times/day:
- 100 × 10 × 50 = 50,000 rows/day

---

### 5. **Index scans also count as row reads**

Even when indexed, scanned index rows are billed:

```sql
SELECT * FROM messages WHERE mailbox_id = 123 ORDER BY received_at DESC;
-- If that mailbox has 1,000 emails: billed as 1,000 row reads
```

---

### 6. **Cumulative effect of batch operations**

```sql
-- Before optimization, batch toggle login for 100 mailboxes
-- Could become 100 queries × average rows scanned
```

---

## Realistic estimate example

Assume:
- 10,000 mailboxes
- 100,000 messages
- 50 users
- 10 daily active users

### Estimated daily row reads

| Operation | Frequency | Rows / Call | Daily Total |
|------|------|----------|----------|
| Worker initialization | 50 times | 200 | 10,000 |
| Mail list view | 10 users × 20 | 20 | 4,000 |
| Mail detail view | 10 users × 50 | 1 | 500 |
| Admin user list | 5 times | 5,050 | 25,250 |
| Super admin quota check (COUNT) | 10 times | 10,000 | 100,000 |
| New mail receives | 200 mails | 5 | 1,000 |
| User quota checks | 100 times | 100 | 10,000 |
| **Daily total** | - | - | **~150,750 rows** |

**Monthly total**: 150,750 × 30 = **4,522,500 rows** (~4.52 million)

---

## Primary causes of high row reads

### 🔴 1. Full-table COUNT when super admin checks quota
```javascript
// getTotalMailboxCount() scans all mailboxes
SELECT COUNT(1) AS count FROM mailboxes;
```

### 🔴 2. Frequent admin user list access
```javascript
// listUsersWithCounts() includes JOIN + subquery
// Scans full users + user_mailboxes scope each time
```

### 🔴 3. Frequent Worker cold starts
- Every cold start may re-check schema
- Cached PRAGMA data is lost after restart

### 🔴 4. Weak pagination/caching strategy
- Some list queries may return too much data
- Cache misses can trigger repeated reads

---

## Further optimization suggestions

### 1. **Cache COUNT results longer**
```javascript
let cachedMailboxCount = null;
let cachedMailboxCountTime = 0;

export async function getTotalMailboxCount(db) {
  const now = Date.now();
  if (cachedMailboxCount !== null && now - cachedMailboxCountTime < 600000) {
    return cachedMailboxCount;
  }

  const result = await db.prepare('SELECT COUNT(1) AS count FROM mailboxes').all();
  cachedMailboxCount = result?.results?.[0]?.count || 0;
  cachedMailboxCountTime = now;
  return cachedMailboxCount;
}
```

### 2. **Optimize user list counting**
```javascript
// Compute mailbox counts only when needed
// or use cached aggregate stats
```

### 3. **Store aggregate stats in Durable Objects**
- Keep COUNT-like metrics in DO
- Update asynchronously
- Greatly reduce repeated COUNT queries

### 4. **Request deduplication**
- Avoid duplicate execution of identical requests in short windows
- Use Request ID or hash as cache key

### 5. **Add query monitoring**
```javascript
const queryStats = {
  totalQueries: 0,
  estimatedRows: 0
};

function logQuery(query, estimatedRows) {
  queryStats.totalQueries++;
  queryStats.estimatedRows += estimatedRows;
}
```

---

## Cloudflare D1 free-tier quota

- **Daily row reads**: 5 million
- **Daily row writes**: 100,000
- **Storage**: 5 GB

If quota is exceeded:
- Worker requests may fail
- You need to move to a paid plan

---

## Summary

The 4-million row-read level mainly comes from:
1. ✅ **COUNT queries** (partially cached)
2. ✅ **JOIN queries** (can be optimized further)
3. ✅ **Frequent initialization** (schema cache already improved)
4. ✅ **Insufficient LIMIT usage** (already improved)
5. ⚠️ **Frequent super-admin quota checks** (increase cache TTL)
6. ⚠️ **Frequent Worker restarts** (consider persistent caching)

Priority recommendation: increase cache duration for super-admin quota queries.

