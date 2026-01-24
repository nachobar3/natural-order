# Natural Order - API Documentation

## Overview

Base URL: `/api`

All endpoints require authentication via Supabase Auth (JWT in cookies) unless marked as **Public**.

## Authentication

Protected endpoints return:
- `401 Unauthorized` - No valid session
- `403 Forbidden` - User doesn't have access to resource

---

## Endpoints

### User & Profile

#### GET /api/user
Get current authenticated user profile.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "string",
  "avatar_url": "string | null"
}
```

---

### Notifications

#### GET /api/notifications
List user notifications.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| unread | boolean | false | Only unread notifications |
| limit | number | 50 | Max 100 |

**Response:**
```json
{
  "notifications": [{
    "id": "uuid",
    "type": "string",
    "matchId": "uuid",
    "content": "string",
    "isRead": false,
    "createdAt": "ISO8601",
    "fromUser": { "id", "displayName", "avatarUrl" }
  }],
  "unreadCount": 5
}
```

#### POST /api/notifications
Mark notifications as read.

**Body:**
```json
{
  "notificationIds": ["uuid1", "uuid2"]
  // OR
  "markAllRead": true
}
```

---

### Preferences

#### GET /api/preferences/global-discount
Get user's global discount settings.

**Response:**
```json
{
  "percentage": 80,
  "minimumPrice": 0
}
```

#### PUT /api/preferences/global-discount
Update global discount (1-200%).

**Body:**
```json
{
  "percentage": 85,
  "minimumPrice": 5.50
}
```

#### POST /api/preferences/global-discount
Apply discount to all cards without override.

**Body:**
```json
{ "percentage": 85 }
```

**Response:**
```json
{
  "success": true,
  "updatedCount": 42,
  "message": "Se actualizaron 42 cartas al 85%"
}
```

---

### Matches

#### GET /api/matches
List user's matches.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | - | Comma-separated: active,contacted,requested,confirmed,completed,cancelled,dismissed |
| counts | boolean | false | Include category counts |
| sort_by | string | score | Options: score, distance, cards, value, discount |

**Response:**
```json
{
  "matches": [{
    "id": "uuid",
    "otherUser": { "id", "displayName", "avatarUrl" },
    "matchType": "two_way | one_way_buy | one_way_sell",
    "distanceKm": 12.5,
    "cardsIWant": 3,
    "cardsTheyWant": 2,
    "valueIWant": 50.00,
    "valueTheyWant": 35.00,
    "matchScore": 8500,
    "avgDiscountPercent": 15,
    "status": "active",
    "createdAt": "ISO8601"
  }],
  "counts": {
    "disponibles": 5,
    "activos": 2,
    "confirmados": 1,
    "realizados": 3
  }
}
```

#### PATCH /api/matches
Update match status (dismiss/restore).

**Body:**
```json
{
  "matchId": "uuid",
  "status": "active | dismissed | contacted"
}
```

#### POST /api/matches/compute
Recalculate all matches for current user.

**Query:** `?debug=true` for diagnostic info.

---

### Match Detail

#### GET /api/matches/:id
Get match details with cards.

**Response:**
```json
{
  "id": "uuid",
  "otherUser": { "id", "displayName", "avatarUrl", "location" },
  "matchType": "two_way",
  "distanceKm": 12.5,
  "status": "active",
  "requestedBy": "uuid | null",
  "iRequested": true,
  "theyRequested": false,
  "cardsIWant": [{
    "id": "uuid",
    "cardName": "string",
    "cardSetCode": "ABC",
    "askingPrice": 15.50,
    "condition": "NM",
    "isFoil": true,
    "isExcluded": false,
    "isCustom": false
  }],
  "cardsTheyWant": [...],
  "totalValueIWant": 50.00,
  "totalValueTheyWant": 35.00
}
```

#### POST /api/matches/:id/request
Request a trade.

#### DELETE /api/matches/:id/request
Cancel trade request.

#### POST /api/matches/:id/confirm
Confirm trade (start escrow period - 15 days).

**Response:**
```json
{
  "success": true,
  "escrowExpiresAt": "ISO8601"
}
```

#### POST /api/matches/:id/complete
Mark trade as completed/cancelled.

**Body:**
```json
{ "completed": true }
```

**Response:**
```json
{
  "success": true,
  "finalStatus": "completed | cancelled | null",
  "hasConflict": false,
  "waitingForOther": false
}
```

#### POST /api/matches/:id/recalculate
Recalculate cards for this specific match.

#### POST /api/matches/:id/restore
Remove all exclusions from match.

---

### Match Cards

#### GET /api/matches/:id/counterpart-collection
Browse other user's collection for custom additions.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| search | string | - | Search by card name |
| page | number | 1 | Page number |
| limit | number | 20 | Max 50 |

**Response:**
```json
{
  "cards": [{
    "collectionId": "uuid",
    "cardId": "uuid",
    "cardName": "string",
    "askingPrice": 15.50,
    "alreadyInTrade": false
  }],
  "total": 42,
  "page": 1,
  "totalPages": 3
}
```

#### PATCH /api/matches/:id/cards
Toggle single card exclusion.

**Body:**
```json
{
  "cardId": "uuid",
  "isExcluded": true
}
```

#### PUT /api/matches/:id/cards
Bulk update exclusions.

**Body:**
```json
{ "excludedCardIds": ["uuid1", "uuid2"] }
```

#### POST /api/matches/:id/cards/custom
Add custom card from counterpart's collection.

**Body:**
```json
{
  "collectionId": "uuid",
  "quantity": 1
}
```

#### DELETE /api/matches/:id/cards/:cardId
Remove custom card from trade.

---

### Match Comments

#### GET /api/matches/:id/comments
List match comments.

**Response:**
```json
{
  "comments": [{
    "id": "uuid",
    "content": "string",
    "createdAt": "ISO8601",
    "isEdited": false,
    "isMine": true,
    "user": { "id", "displayName", "avatarUrl" }
  }],
  "myCommentCountThisMonth": 3,
  "maxCommentsPerMonth": 10,
  "canComment": true
}
```

#### POST /api/matches/:id/comments
Create comment (max 300 chars, 10/month limit).

**Body:**
```json
{ "content": "string" }
```

#### PATCH /api/matches/:id/comments
Edit own comment.

**Body:**
```json
{
  "commentId": "uuid",
  "content": "string"
}
```

---

### Cards (Public)

#### GET /api/cards/search 🌐
Search cards via Scryfall.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| q | string | Search term (min 2 chars) |
| page | number | Page number |

**Response:**
```json
{
  "cards": [{
    "scryfall_id": "uuid",
    "oracle_id": "uuid",
    "name": "string",
    "set_code": "ABC",
    "prices_usd": 15.50,
    "image_uri": "url"
  }],
  "suggestions": ["..."],
  "has_more": true,
  "total_cards": 250
}
```

#### GET /api/cards/printings 🌐
Get all printings of a card.

**Query:** `?oracle_id=uuid`

#### POST /api/cards/bulk-match 🌐
Batch search cards by name/set.

**Body:**
```json
{
  "cards": [
    { "name": "Card Name", "setCode": "ABC", "collectorNumber": "42" }
  ]
}
```

**Limits:** Max 500 cards per request.

---

### Cards (Protected)

#### POST /api/cards/upsert
Save or update a card in database.

#### POST /api/cards/bulk-import
Bulk import to collection.

**Body:**
```json
{
  "cards": [{
    "card": { /* card object */ },
    "quantity": 2,
    "condition": "NM",
    "foil": true
  }],
  "conflictMode": "skip | update | add"
}
```

**Response:**
```json
{
  "summary": {
    "total": 10,
    "inserted": 5,
    "updated": 3,
    "skipped": 1,
    "errors": 1
  }
}
```

#### POST /api/cards/bulk-import-wishlist
Bulk import to wishlist.

**Body:**
```json
{
  "cards": [{
    "card": { /* card object */ },
    "quantity": 1,
    "minCondition": "LP",
    "foilPreference": "any | foil_only | non_foil"
  }],
  "conflictMode": "skip | update | add"
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - No valid session |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Notes

- **Rate Limiting:** Not implemented at API level. Scryfall has 10 req/s limit.
- **Pagination:** Most list endpoints use `page` + `limit` params
- **Transactions:** Critical operations use database transactions
- **Force Dynamic:** All auth endpoints use `export const dynamic = 'force-dynamic'`
