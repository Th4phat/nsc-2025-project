# Folder Functionality Implementation Plan

This document outlines the plan to add folder management functionality to the application.

### 1. Schema Changes: `convex/schema.ts`

To support folders, we will add a new `folders` table and link it to the existing `documents` table.

**New `folders` Table:**
This table will store folder information, including support for nesting.

```typescript
  folders: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    // Optional field for nested folders. `null` indicates a root folder.
    parentFolderId: v.optional(v.id("folders")),
  })
    // Index to efficiently query folders by owner and parent
    .index("by_owner_and_parent", ["ownerId", "parentFolderId"]),
```

**`documents` Table Modification:**
We will add an optional `folderId` to associate documents with a folder. A `null` value will indicate that the document is at the root level.

```typescript
  documents: defineTable({
    // ... existing fields
    folderId: v.optional(v.id("folders")), // <-- NEW FIELD
    // ... existing fields
  })
    // ... existing indexes
    .index("by_folderId", ["folderId"]), // <-- NEW INDEX
```

### 2. API Design: `convex/folders.ts`

A new file, `convex/folders.ts`, will be created to encapsulate all folder-related logic.

*   **`createFolder` (mutation)**
    *   **Description:** Creates a new folder.
    *   **Arguments:** `{ name: v.string(), parentFolderId: v.optional(v.id("folders")) }`
    *   **Returns:** The ID of the newly created folder (`v.id("folders")`).

*   **`moveDocumentToFolder` (mutation)**
    *   **Description:** Moves a document to a specified folder.
    *   **Arguments:** `{ documentId: v.id("documents"), folderId: v.id("folders") }`
    *   **Returns:** `v.null()`

*   **`getFolders` (query)**
    *   **Description:** Fetches all folders owned by the current user.
    *   **Arguments:** `{}`
    *   **Returns:** An array of folder objects.

*   **`getDocuments` (query)**
    *   **Description:** Fetches documents. If a `folderId` is provided, it fetches documents within that folder; otherwise, it fetches documents from the root. This will replace the current `getMyDocuments` to be more flexible.
    *   **Arguments:** `{ folderId: v.optional(v.id("folders")), category: v.optional(v.string()) }`
    *   **Returns:** An array of document objects.

### 3. Frontend Plan

The frontend will be updated to allow users to interact with the new folder system.

**`components/app-sidebar.tsx`**
*   The hardcoded "เอกสารของฉัน" (`mydocs`) section will be replaced with a dynamic list of folders fetched using the `getFolders` query.
*   Folders will be displayed in a collapsible tree structure to support nesting.
*   Clicking a folder will update the main view to show its contents.

**`app/(application)/dashboard/page.tsx`**
*   This page will be updated to use the new `getDocuments` query, passing the `folderId` from the URL if present.
*   A "Move" or "Move to Folder" action will be added to the document list items or context menu, which will open a modal to select a destination folder and then call the `moveDocumentToFolder` mutation.

### Plan Overview

```mermaid
graph TD
    subgraph "Backend (Convex)"
        A[Schema: `folders` table]
        C[Schema: `documents.folderId`]
        B[API: `convex/folders.ts`]

        subgraph "Folder API"
            D[mutation: createFolder]
            E[mutation: moveDocumentToFolder]
            F[query: getFolders]
            G[query: getDocuments]
        end

        A -- defines --> B
        C -- defines --> B
        B -- contains --> D
        B -- contains --> E
        B -- contains --> F
        B -- contains --> G
    end

    subgraph "Frontend (Next.js)"
        H[UI: `components/app-sidebar.tsx`]
        I[UI: `app/(application)/dashboard/page.tsx`]
    end

    F -- populates --> H
    G -- populates --> I
    H -- triggers navigation --> I
    I -- triggers action --> E