# Typography System Migration

## Overview
This document tracks the migration from custom pixel sizes to the standardized typography system.

## Typography System
Location: `/lib/typography.ts`

The typography system provides consistent, semantic font styles across the application.

### Available Styles

```typescript
typography.label.default     // Labels: text-xs font-bold uppercase
typography.label.primary      // Primary labels with stronger contrast
typography.label.muted        // Muted labels

typography.caption.default    // Captions: text-xs
typography.caption.muted      // Muted captions
typography.caption.bold       // Bold captions

typography.body.default       // Body text: text-sm
typography.body.medium        // Medium weight body
typography.body.semibold      // Semibold body
typography.body.muted         // Muted body

typography.heading.h1-h6      // Heading hierarchy

typography.key                // Task/issue keys (DIG-123)
typography.tableHeader        // Table column headers
typography.code               // Code/monospace text
```

## Migration Status

### ✅ Completed Files

#### 1. **ListView.tsx**
- [x] Import typography system (line 23)
- [x] Table headers: `text-[10px]` → `typography.tableHeader` (line 272)
- [x] Task KEY: `text-[10px]` → `typography.key` (line 385)
- [x] Section headers: `text-xs font-bold` → `typography.label.primary` (line 314)
- [x] Count badges: `text-[10px]` → `typography.caption.bold` (line 315)

**Impact**: 4 font style standardizations, affects all list views

---

### 🚧 In Progress

#### Priority Files (Next 5 to fix)

1. **TaskDetailModal.tsx** (105+ custom styles)
   - [ ] Import typography
   - [ ] Replace `text-[10px]` labels (20+ instances)
   - [ ] Replace `text-[13px]` descriptions
   - [ ] Standardize heading hierarchy

2. **KanbanBoard.tsx** (15+ variations)
   - [ ] Import typography
   - [ ] Task card labels
   - [ ] Column headers
   - [ ] Card metadata

3. **MyTasksView.tsx**
   - [ ] Widget labels
   - [ ] Filter button text
   - [ ] Empty state text

4. **ProjectList.tsx** (75+ combinations)
   - [ ] Project card metadata
   - [ ] Stats labels
   - [ ] Team member names

5. **Sidebar.tsx**
   - [ ] Logo text: `text-[15px]` → custom or `text-base`
   - [ ] Nav items: Standardize
   - [ ] Section labels

---

### 📋 Full File List (55 total)

**Legend:**
- ✅ Migrated
- 🚧 In Progress
- ⏳ Pending

| File | Status | Priority | Issues |
|------|--------|----------|--------|
| ListView.tsx | ✅ | HIGH | 4 fixed |
| TaskDetailModal.tsx | ⏳ | CRITICAL | 105+ custom styles |
| KanbanBoard.tsx | ⏳ | HIGH | 15+ variations |
| MyTasksView.tsx | ⏳ | HIGH | Widget inconsistencies |
| ProjectList.tsx | ⏳ | HIGH | 75+ combinations |
| Sidebar.tsx | ⏳ | MEDIUM | Non-standard sizes |
| CreateTaskModal.tsx | ⏳ | MEDIUM | Form labels |
| EditUserModal.tsx | ⏳ | MEDIUM | Form labels |
| UserManagementView.tsx | ⏳ | MEDIUM | Table headers |
| SprintsView.tsx | ⏳ | MEDIUM | Various |
| ... | ⏳ | ... | 45 more files |

---

## Migration Guidelines

### Step-by-Step Process

1. **Import the typography system**
   ```typescript
   import { typography } from '../lib/typography';
   ```

2. **Identify custom pixel sizes**
   - Search for: `text-[10px]`, `text-[11px]`, `text-[13px]`, etc.
   - Note their context (label, body, heading, etc.)

3. **Replace with typography constants**
   ```typescript
   // Before
   <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">

   // After
   <span className={typography.label.default}>
   ```

4. **Combine with additional classes**
   ```typescript
   <span className={`${typography.body.default} mb-2`}>
   ```

### Common Mappings

| Old Style | New Style | Notes |
|-----------|-----------|-------|
| `text-[10px] font-bold uppercase tracking-wider` | `typography.label.default` | Labels, badges |
| `text-[10px] font-medium text-gray-500` | `typography.caption.default` | Hints, meta |
| `text-[11px] font-bold` | `typography.caption.bold` | Small headings |
| `text-[13px] font-semibold` | `typography.body.semibold` | Emphasized body |
| `text-xs font-bold uppercase` | `typography.label.default` | Already correct! |
| `text-sm` | `typography.body.default` | Body text |

### Special Cases

**Task/Issue Keys (DIG-123, PROJ-456)**
```typescript
// Old
<div className="text-[10px] text-gray-500 font-mono">

// New
<div className={typography.key}>
```

**Table Headers**
```typescript
// Old
<div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">

// New
<div className={typography.tableHeader}>
```

---

## Benefits

✅ **Consistency**: Same semantic element = same styling
✅ **Maintainability**: Change once, update everywhere
✅ **Dark Mode**: All styles include dark mode variants
✅ **Performance**: Reuse Tailwind classes, better purge
✅ **Type Safety**: Constants prevent typos
✅ **Documentation**: Self-documenting code

---

## Remaining Work

**Total Files**: 55 components
**Fixed**: 1 (ListView.tsx)
**Remaining**: 54

**Estimated Impact**:
- ~500 custom pixel size replacements
- ~200 inconsistent font weight fixes
- ~100 missing dark mode variants added

---

## Testing Checklist

After migration, verify:
- [ ] All text is readable in light mode
- [ ] All text is readable in dark mode
- [ ] Font hierarchy is clear (headings > body > captions)
- [ ] Labels are consistently styled
- [ ] No visual regressions in existing components
- [ ] Typography scales properly on different screen sizes

---

## Questions?

For questions or issues with the typography system:
1. Check `/lib/typography.ts` for available styles
2. Add new semantic styles if needed (don't inline!)
3. Update this document when migrating files
