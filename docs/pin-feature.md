# Mailbox Pin Feature

## Overview

The pin feature lets users keep frequently used mailbox addresses at the top of their mailbox history list for faster access and management.

## Key Capabilities

### 1. Pin / Unpin
- Click the 📍 icon on the right of a mailbox item to pin it
- Pinned state icon becomes 📌; click again to unpin
- Pin status is persisted in the database

### 2. Visual Indicators
- Pinned mailboxes use a dedicated background/border style
- Pinned items show a 📌 marker in the top-left area
- Action buttons appear on hover

### 3. Smart Sorting
- Pinned mailboxes always stay at the top
- Items within same priority are sorted by last access time
- Supports paginated loading

## How to Use

### Pin a mailbox
1. Find the mailbox in history
2. Hover over it to reveal the 📍 button
3. Click 📍 to pin it

### Unpin a mailbox
1. Find a pinned mailbox (with 📌 marker)
2. Hover to reveal the 📌 button
3. Click 📌 to unpin

### Batch usage behavior
- Multiple mailboxes can be pinned at once
- Pinned items are sorted by pin/order logic
- Deleting a mailbox clears its pin status

## Technical Implementation

### Database schema
```sql
ALTER TABLE mailboxes ADD COLUMN is_pinned INTEGER DEFAULT 0;
CREATE INDEX idx_mailboxes_is_pinned ON mailboxes(is_pinned DESC);
```

### API endpoints
- `POST /api/mailboxes/pin?address=<mailbox>` - toggle pinned state
- `GET /api/mailboxes` - returns mailbox list sorted by pinned status

### Frontend interaction
- Real-time pin state updates
- Automatic UI re-ordering
- Fully supported in demo mode

## Compatibility

- Supports migration for existing mailbox data
- Backward compatible with existing features
- Fully available in demo mode

## Notes

1. Pin status is user-scoped and not shared across users
2. Deleting a mailbox also clears its pin status
3. Pinning does not affect email receiving/sending behavior
4. Supports offline demo mode
