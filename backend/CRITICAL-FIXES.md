# Critical Backend Bug Fixes

**Date:** February 2026
**Scope:** Database layer, route handlers, Mongoose schemas, service layer
**Test suite:** 73/73 passing after all fixes (`npx tsx scripts/test-all-apis.ts`)

---

## 1. Missing `async/await` in Route Handlers

**Files:**
- `src/routes/tags.routes.ts` (all 5 handlers)
- `src/routes/activity.routes.ts` (5 of 6 handlers)
- `src/routes/columns.routes.ts` (service calls)

**Problem:**
Route handlers were calling async service methods without `await`. This caused:
- Responses sent as raw Promise objects (`{}`) instead of actual data
- Unhandled promise rejections that bypassed Express error middleware
- **Node.js crashes** — when a non-awaited service call threw (e.g., Mongoose validation error), it became an unhandled rejection that killed the process

**Example (before):**
```ts
router.get('/', (req, res) => {
  const tags = tagsService.getAll(projectId); // returns Promise, not data
  res.json({ success: true, data: tags });    // sends {}
});
```

**Fix:** Added `async/await` to all affected handlers:
```ts
router.get('/', async (req, res) => {
  const tags = await tagsService.getAll(projectId);
  res.json({ success: true, data: tags });
});
```

**Lesson:** Every Express route handler that calls an async function must be `async` and `await` the call. Without this, `express-async-errors` cannot catch thrown errors, and the response contains a serialized Promise object.

---

## 2. Mongoose Schema Field Mismatches

**File:** `src/models/index.ts`

### 2a. Comment Schema: `text` vs `content`

**Problem:** Schema defined `text: { type: String, required: true }` but the service layer (`comments.service.ts`) wrote `content`. Mongoose threw `ValidationError: text is required` on every comment creation.

**Fix:** Changed schema field from `text` to `content`, and added missing fields:
```ts
// Before
const commentSchema = new Schema({
  task_id: { type: Schema.Types.Mixed, required: true },
  user_id: { type: Schema.Types.Mixed, required: true },
  text: { type: String, required: true },           // wrong name
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// After
const commentSchema = new Schema({
  task_id: { type: Schema.Types.Mixed, required: true, index: true },
  user_id: { type: Schema.Types.Mixed, required: true, index: true },
  content: { type: String, required: true },         // matches service
  parent_comment_id: { type: Schema.Types.Mixed, default: null },  // was missing
  is_edited: { type: Boolean, default: false },                    // was missing
  created_at: { type: Date, default: Date.now, index: true },
  updated_at: { type: Date, default: Date.now },
});
```

### 2b. Tag Schema: `name` vs `label`

**Problem:** Schema defined `name: { type: String, required: true }` but the service layer (`tags.service.ts`) wrote `label`. This caused Mongoose `ValidationError: name is required`.

**Fix:**
```ts
// Before
const tagSchema = new Schema({
  project_id: { type: Schema.Types.Mixed, required: true },
  name: { type: String, required: true },   // wrong name
  color: { type: String, default: 'gray' },
});

// After
const tagSchema = new Schema({
  project_id: { type: Schema.Types.Mixed, required: true, index: true },
  label: { type: String, required: true },  // matches service
  color: { type: String, default: 'gray' },
  created_at: { type: Date, default: Date.now },
});
```

**Lesson:** Schema field names MUST match what the service layer writes. A mismatch causes silent data loss (field is ignored) or hard `ValidationError` crashes (if the schema field is `required`).

---

## 3. `normalizeRecordForInsert` Corrupting ObjectId Values

**File:** `src/lib/database.ts` (~line 588)

**Problem:** The recursive normalizer for insert records treated MongoDB `ObjectId` instances as plain objects and tried to recurse into them, corrupting the data.

**Fix:** Added guards for `ObjectId` and BSON types:
```ts
// Before
} else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
  normalized[key] = normalizeRecordForInsert(value);
}

// After
} else if (value && typeof value === 'object' && !Array.isArray(value)
  && !(value instanceof Date)
  && !(value instanceof mongoose.Types.ObjectId)  // new guard
  && !value._bsontype                              // new guard
) {
  normalized[key] = normalizeRecordForInsert(value);
}
```

**Lesson:** When recursing into objects, always guard against special types that look like plain objects but aren't (ObjectId, Date, Buffer, Decimal128, etc.).

---

## 4. `findById` Fallback Returning Wrong Documents

**File:** `src/lib/database.ts` — `findById`, `update`, `delete` methods

**Problem:** After `findById(id)` returned null, the code fell back to `findOne({ id })`. In Mongoose 9, querying `{ id }` is treated as `{ _id }` (Mongoose auto-aliases `id` to `_id`), so it would return a **random existing document** instead of null.

This caused:
- Deleted records returning `200` instead of `404` (findById found a random doc)
- Updates modifying the wrong record
- Sprints looking up incorrect data

**Fix:** Only use the `findOne({ id })` fallback for non-ObjectId strings (true UUIDs), since those can't be looked up via `_id`:
```ts
// findById
if (!doc && !isValidObjectId(id)) {
  doc = await model.findOne({ id }).lean();
}

// update
if (!doc && !isValidObjectId(id)) {
  doc = await model.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
}

// delete
if (result.deletedCount === 0 && !isValidObjectId(id)) {
  result = await model.deleteOne({ id });
}
```

**Lesson:** In Mongoose 9, `{ id: value }` in a query is silently mapped to `{ _id: value }`. Never use `findOne({ id })` as a generic fallback — it doesn't search a field called `id`, it searches `_id` again.

---

## 5. Services Using Stale ID After `database.insert()`

**Files:**
- `src/services/sprints.service.ts`
- `src/services/comments.service.ts`
- `src/services/tags.service.ts`
- `src/services/document-comments.service.ts`
- `src/services/teams.service.ts`

**Problem:** `database.insert()` strips the `id` field from the input (line 219: `const { id, ...recordWithoutId } = record`) and lets MongoDB generate a new `_id`. Services that pre-generated `id: generateUUID()` and then used that id for post-insert lookups would fail because the generated id no longer matched the record's actual `_id`.

```ts
// Before (broken)
const sprint = { id: generateUUID(), ... };
await database.insert('sprints', sprint);
return this.getById(sprint.id);  // sprint.id was stripped, doesn't match _id
```

**Fix:** Use the return value from `database.insert()`, which contains the actual `_id` mapped to `id`:
```ts
// After (correct)
const sprint = { id: generateUUID(), ... };
const saved = await database.insert<Sprint>('sprints', sprint);
return (await this.getById(saved.id))!;  // saved.id = actual _id
```

**Lesson:** Always use the return value from `database.insert()` for any post-insert operations. The `id` field on the input object is stripped and replaced by MongoDB's auto-generated `_id`.

---

## 6. Notification Service Field Reference

**File:** `src/services/notification.service.ts` (line 491)

**Problem:** Referenced `comment.text` which no longer exists after the schema was fixed to use `content`.

**Fix:**
```ts
// Before
const commentPreview = truncateText(comment.text);

// After
const commentPreview = truncateText((comment as any).content || comment.text);
```

---

## 7. MongoDB Connection Timeout

**File:** `src/lib/mongodb.ts` (line 36)

**Problem:** `serverSelectionTimeoutMS` was set to 5000ms (5 seconds), which was too short for slow Atlas connections, causing startup failures.

**Fix:** Increased to 30000ms (30 seconds):
```ts
await mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,  // was 5000
  socketTimeoutMS: 45000,
});
```

---

## Summary of Root Causes

| Category | Count | Impact |
|----------|-------|--------|
| Missing async/await in routes | 3 files, ~15 handlers | Server crashes, empty responses |
| Schema/service field mismatches | 2 schemas | Validation errors, data loss |
| ObjectId handling bugs | 3 methods in database.ts | Wrong documents returned, data corruption |
| Stale ID after insert | 5 service files | Lookups returning null, broken CRUD |
| Stale MongoDB indexes | 2 collections | E11000 duplicate key errors |

## How to Verify

```bash
cd backend
npx tsx scripts/test-all-apis.ts
# Expected: 73 passed, 0 failed, 73 total
```
