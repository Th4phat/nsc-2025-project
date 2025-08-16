import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";




export default defineSchema({
  ...authTables,


  roles: defineTable({
    name: v.string(),
    rank: v.number(), 
    permissions: v.array(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_rank", ["rank"]),

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    roleId: v.optional(v.id("roles")),
    profileId: v.optional(v.id("profiles")),
    departmentId: v.optional(v.id("departments")),
    controlledDepartments: v.optional(v.array(v.id("departments"))),
    
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  })
    .index("by_email", ["email"])
    .index("by_name", ["name"])
    .index("by_roleId", ["roleId"])
    .index("by_status", ["status"]) 
    .index("by_departmentId", ["departmentId"])
    .searchIndex("by_search_query", { searchField: "email", filterFields: ["name"] }),

  profiles: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()),
    bio: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    age: v.optional(v.number()),
    gender: v.optional(v.string()),
    employeeID: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  departments: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  })
    .index("by_name", ["name"])
    .index("by_status", ["status"]), 

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
    classified: v.optional(v.boolean()),
    folderId: v.optional(v.id("folders")),
    
    searchableText: v.optional(v.string()),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_aiCategory", ["aiCategories"])
    .index("by_folderId", ["folderId"])
    .searchIndex("by_searchable_text", { searchField: "searchableText", filterFields: ["name", "aiCategories"] }),

  documentFolders: defineTable({
    documentId: v.id("documents"),
    folderId: v.id("folders"),
    userId: v.id("users"),
  })
    .index("by_user_folder", ["userId", "folderId"])
    .index("by_user_document", ["userId", "documentId"]),

  folders: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    
    parentFolderId: v.optional(v.id("folders")),
  })
    
    .index("by_owner_and_parent", ["ownerId", "parentFolderId"]),

  documentShares: defineTable({
    documentId: v.id("documents"),
    recipientId: v.id("users"),
    sharerId: v.id("users"),
    
    permissionGranted: v.array(
      v.union(
        v.literal("view"),
        v.literal("download"),
        v.literal("resend")
      )
    ),
    
    
  })
    .index("by_documentId", ["documentId"])
    .index("by_recipientId", ["recipientId"])
    .index("by_document_recipient", ["documentId", "recipientId"]),

  userDocumentStatus: defineTable({
    userId: v.id("users"),
    documentId: v.id("documents"),
    isRead: v.boolean(),
  })
    .index("by_user_document", ["userId", "documentId"])
    .index("by_user_unread", ["userId", "isRead"]),
    
  
  auditLogs: defineTable({
    actorId: v.id("users"), 
    action: v.string(), 
    targetTable: v.string(), 
    targetId: v.any(), 
    details: v.optional(v.any()), 
  })
    .index("by_actorId", ["actorId"]) 
    .index("by_target", ["targetTable", "targetId"]), 

  distributedDocuments: defineTable({
    documentId: v.id("documents"),
    senderId: v.id("users"),
    recipientDepartmentIds: v.optional(v.array(v.id("departments"))),
    sentToAll: v.optional(v.boolean()),
  }),
  numbers: defineTable({
    value: v.number(),
    userId: v.id("users"),
  }).index("by_userId", ["userId"]),
});
