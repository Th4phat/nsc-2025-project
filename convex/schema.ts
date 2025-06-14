import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,

  // --- NEW: Data-driven permissions for maximum flexibility ---
  permissions: defineTable({
    // A unique identifier for the permission, e.g., "CAN_MODIFY_USER_PROFILE"
    name: v.string(),
    description: v.optional(v.string()),
  }).index("by_name", ["name"]),

  // --- NEW: Join table to link roles to their permissions ---
  rolePermissions: defineTable({
    roleId: v.id("roles"),
    permissionId: v.id("permissions"),
  }).index("by_role_permission", ["roleId", "permissionId"]), // Efficiently find all permissions for a role

  roles: defineTable({
    name: v.string(),
    rank: v.number(), // Lower number means higher rank
    // MODIFIED: The hardcoded permissions object has been removed.
    // Permissions are now managed in the `permissions` and `rolePermissions` tables.
  })
    .index("by_name", ["name"])
    .index("by_rank", ["rank"]),

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    roleId: v.optional(v.id("roles")),
    profileId: v.optional(v.id("profiles")),
    departmentId: v.optional(v.id("departments")),
    // NEW: Status for soft-deleting or archiving users.
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  })
    .index("by_email", ["email"])
    .index("by_roleId", ["roleId"])
    .index("by_status", ["status"]), // NEW: Index for filtering by status

  profiles: defineTable({
    userId: v.id("users"),
    bio: v.optional(v.string()),
    age: v.optional(v.number()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),
    employeeID: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  departments: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    // NEW: Status for soft-deleting or archiving departments.
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  })
    .index("by_name", ["name"])
    .index("by_status", ["status"]), // NEW: Index for filtering by status

  documents: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    fileId: v.id("_storage"),
    mimeType: v.string(),
    fileSize: v.number(),
    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("trashed")
    ),
    aiCategories: v.optional(v.array(v.string())),
    aiSuggestedRecipients: v.optional(v.array(v.id("users"))),
    aiProcessingError: v.optional(v.string()),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_aiCategory", ["aiCategories"]),

  documentShares: defineTable({
    documentId: v.id("documents"),
    recipientId: v.id("users"),
    sharerId: v.id("users"),
    // MODIFIED: Permissions are now an array, allowing for combined, granular access.
    permissionGranted: v.array(
      v.union(
        v.literal("view"),
        v.literal("download"),
        v.literal("comment"),
        v.literal("edit_metadata"),
        v.literal("resend")
      )
    ),
    // MODIFIED: Removed `sharedAt`. You can use the built-in `_creationTime`
    // field of this document to know when the share was created.
  })
    .index("by_documentId", ["documentId"])
    .index("by_recipientId", ["recipientId"])
    .index("by_document_recipient", ["documentId", "recipientId"]),

  // --- NEW: Audit log for tracking important actions ---
  auditLogs: defineTable({
    actorId: v.id("users"), // The user who performed the action
    action: v.string(), // e.g., "document.create", "user.updateRole"
    targetTable: v.string(), // e.g., "documents", "users"
    targetId: v.any(), // The ID of the document that was affected
    details: v.optional(v.any()), // Optional object for extra context (e.g., before/after state)
  })
    .index("by_actorId", ["actorId"]) // Find all actions by a user
    .index("by_target", ["targetTable", "targetId"]), // Find the history of a specific item
    numbers: defineTable({
    value: v.number(),
    userId: v.id("users"),
  }).index("by_userId", ["userId"]),
});
