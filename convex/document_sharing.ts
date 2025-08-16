import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { mutationWithAuth } from "./auth";
import { internal } from "./_generated/api";

export const shareDocument = mutation({
    args: {
        documentId: v.id("documents"),
        recipientId: v.id("users"),
        permissions: v.array(
            v.union(
                v.literal("view"),
                v.literal("download"),
                v.literal("resend"),
            ),
        ),
    },
    handler: async (ctx, args) => {
        const sharerId = await getAuthUserId(ctx);
        if (!sharerId) {
            throw new Error("Authenticated user not found.");
        }
        const document = await ctx.db.get(args.documentId);
        if (!document || document.ownerId !== sharerId) {
            throw new Error("Not authorized to share this document.");
        }

        const existingShare = await ctx.db
            .query("documentShares")
            .withIndex("by_document_recipient", (q) =>
                q.eq("documentId", args.documentId).eq("recipientId", args.recipientId)
            )
            .unique();

        if (existingShare) {
            await ctx.db.patch(existingShare._id, {
                permissionGranted: args.permissions,
            });
        } else {
            await ctx.db.insert("documentShares", {
                documentId: args.documentId,
                recipientId: args.recipientId,
                sharerId: sharerId,
                permissionGranted: args.permissions,
            });
        }

        const userDocumentStatus = await ctx.db
            .query("userDocumentStatus")
            .withIndex("by_user_document", (q) =>
                q.eq("userId", args.recipientId).eq("documentId", args.documentId)
            )
            .unique();

        if (userDocumentStatus) {
            await ctx.db.patch(userDocumentStatus._id, { isRead: false });
        } else {
            await ctx.db.insert("userDocumentStatus", {
                userId: args.recipientId,
                documentId: args.documentId,
                isRead: false,
            });
        }

        await ctx.db.insert("auditLogs", {
            actorId: sharerId,
            action: "document.share",
            targetTable: "documents",
            targetId: args.documentId,
            details: {
                recipientId: args.recipientId,
                permissions: args.permissions,
            },
        });
        return null;
    },
});

export const unshareDocument = mutation({
    args: {
        documentId: v.id("documents"),
        recipientId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const sharerId = await getAuthUserId(ctx);
        if (!sharerId) {
            throw new Error("Authenticated user not found.");
        }

        const document = await ctx.db.get(args.documentId);
        if (!document || document.ownerId !== sharerId) {
            throw new Error("Not authorized to unshare this document.");
        }

        const existingShare = await ctx.db
            .query("documentShares")
            .withIndex("by_document_recipient", (q) =>
                q.eq("documentId", args.documentId).eq("recipientId", args.recipientId)
            )
            .unique();

        if (existingShare) {
            await ctx.db.delete(existingShare._id);
            await ctx.db.insert("auditLogs", {
                actorId: sharerId,
                action: "document.unshare",
                targetTable: "documents",
                targetId: args.documentId,
                details: { recipientId: args.recipientId },
            });
        }
        return null;
    },
});

export const getSharedUsersForDocument = query({
    args: {
        documentId: v.id("documents"),
    },
    returns: v.array(
        v.object({
            user: v.object({
                _id: v.id("users"),
                name: v.optional(v.string()), 
                email: v.string(), 
            }),
            permissions: v.array(
                v.union(
                    v.literal("view"),
                    v.literal("download"),
                    v.literal("resend")
                )
            ),
        })
    ),
    handler: async (ctx, args) => {
        const shares = await ctx.db
            .query("documentShares")
            .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
            .collect();

        const sharedUsers: {
          user: { _id: Id<"users">; name?: string; email: string };
          permissions: ("view" | "download" | "resend")[];
        }[] = [];
        for (const share of shares) {
            const user = await ctx.db.get(share.recipientId);
            if (user) {
                sharedUsers.push({
                    user: {
                        _id: user._id,
                        name: user.name ?? undefined,
                        email: user.email,
                    },
                    permissions: share.permissionGranted as ("view" | "download" | "resend")[],
                });
            }
        }
        return sharedUsers;
    },
});

export const getUserDocumentPermissions = query({
    args: {
        documentId: v.id("documents"),
    },
    returns: v.array(
        v.union(
            v.literal("view"),
            v.literal("download"),
            v.literal("resend")
        )
    ),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            
            return [];
        }

        const document = await ctx.db.get(args.documentId);
        if (!document) {
            
            return [];
        }

        
        if (document.ownerId === userId) {
            return ["view", "download", "resend"] as ("view" | "download" | "resend")[];
        }

        
        const share = await ctx.db
            .query("documentShares")
            .withIndex("by_document_recipient", (q) =>
                q.eq("documentId", args.documentId).eq("recipientId", userId)
            )
            .unique();

        
        return share?.permissionGranted || [];
    },
});

export const getSharedDocuments = query({
    args: {},
    returns: v.array(
        v.object({
            _id: v.id("documents"),
            _creationTime: v.number(),
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
            folderId: v.optional(v.id("folders")),
            
            searchableText: v.optional(v.string()),
        })
    ),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }
 
        const sharedDocumentShares = await ctx.db
            .query("documentShares")
            .withIndex("by_recipientId", (q) => q.eq("recipientId", userId))
            .collect();
 
        const sharedDocuments = [];
        for (const share of sharedDocumentShares) {
            const document = await ctx.db.get(share.documentId);
            if (document) {
                sharedDocuments.push(document);
            }
        }
 
        return sharedDocuments;
    },
});

export const getUnreadDocuments = query({
    args: {},
    returns: v.array(v.id("documents")),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const unreadDocuments = await ctx.db
            .query("userDocumentStatus")
            .withIndex("by_user_unread", (q) =>
                q.eq("userId", userId).eq("isRead", false)
            )
            .collect();

        return unreadDocuments.map((status) => status.documentId);
    },
})

export const getUnreadDocumentsWithDetails = query({
    args: {},
    returns: v.array(
        v.object({
            _id: v.id("documents"),
            _creationTime: v.number(),
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
            folderId: v.optional(v.id("folders")),
            classified: v.optional(v.boolean()),
            searchableText: v.optional(v.string()), 
            shareCreator: v.object({
                _id: v.id("users"),
                name: v.optional(v.string()),
            }),
        })
    ),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const unreadStatuses = await ctx.db
            .query("userDocumentStatus")
            .withIndex("by_user_unread", (q) =>
                q.eq("userId", userId).eq("isRead", false)
            )
            .collect();

        const documents = [];
        for (const status of unreadStatuses) {
            const document = await ctx.db.get(status.documentId);
            if (document) {
                const share = await ctx.db
                    .query("documentShares")
                    .withIndex("by_document_recipient", (q) =>
                        q
                            .eq("documentId", document._id)
                            .eq("recipientId", userId)
                    )
                    .first();

                if (share) {
                    const shareCreator = await ctx.db.get(share.sharerId);
                    if (shareCreator) {
                        documents.push({
                            ...document,
                            shareCreator: {
                                _id: shareCreator._id,
                                name: shareCreator.name,
                            },
                        });
                    }
                }
            }
        }
        return documents;
    },
});

export const markDocumentAsRead = mutation({
    args: {
        documentId: v.id("documents"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Authenticated user not found.");
        }

        const userDocumentStatus = await ctx.db
            .query("userDocumentStatus")
            .withIndex("by_user_document", (q) =>
                q.eq("userId", userId).eq("documentId", args.documentId)
            )
            .unique();

        if (userDocumentStatus) {
            await ctx.db.patch(userDocumentStatus._id, { isRead: true });
        } else {
            
            
            
            await ctx.db.insert("userDocumentStatus", {
                userId: userId,
                documentId: args.documentId,
                isRead: true,
            });
        }

        return null;
    },
});
export const sendDocumentToDepartment = mutationWithAuth([
    "document:send:department",
])({
    args: {
        documentId: v.id("documents"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.runQuery(internal.auth.getUser);
        if (!user || !user.departmentId) {
            throw new Error("User not found or not in a department");
        }

        const departmentMembers = await ctx.db
            .query("users")
            .withIndex("by_departmentId", (q) =>
                q.eq("departmentId", user.departmentId!)
            )
            .collect();

        for (const member of departmentMembers) {
            
            if (member._id === user._id) {
                continue;
            }
            await ctx.db.insert("documentShares", {
                documentId: args.documentId,
                recipientId: member._id,
                sharerId: user._id,
                permissionGranted: ["view"],
            });
        }

        await ctx.db.insert("auditLogs", {
            actorId: user._id,
            action: "document.send.department",
            targetTable: "documents",
            targetId: args.documentId,
            details: {
                departmentId: user.departmentId,
            },
        });

        return null;
    },
});
export const sendDocumentToCompany = mutationWithAuth([
    "document:send:company",
])({
    args: {
        documentId: v.id("documents"),
        departmentIds: v.optional(v.array(v.id("departments"))),
    },
    handler: async (ctx, args) => {
        const user = await ctx.runQuery(internal.auth.getUser);
        if (!user) {
            throw new Error("User not found");
        }

        let usersToShareWith: any[] = [];
        if (args.departmentIds && args.departmentIds.length > 0) {
            const departmentMembers = await Promise.all(
                args.departmentIds.map((departmentId) =>
                    ctx.db
                        .query("users")
                        .withIndex("by_departmentId", (q) =>
                            q.eq("departmentId", departmentId)
                        )
                        .collect()
                )
            );
            usersToShareWith = departmentMembers.flat();
        } else {
            usersToShareWith = await ctx.db.query("users").collect();
        }

        for (const member of usersToShareWith) {
            if (member._id === user._id) {
                continue;
            }
            await ctx.db.insert("documentShares", {
                documentId: args.documentId,
                recipientId: member._id,
                sharerId: user._id,
                permissionGranted: ["view"],
            });
        }

        await ctx.db.insert("auditLogs", {
            actorId: user._id,
            action: "document.send.company",
            targetTable: "documents",
            targetId: args.documentId,
            details: {
                departmentIds: args.departmentIds,
            },
        });

        return null;
    },
});

export const listSharedDocuments = query({
    args: {},
    returns: v.array(
        v.object({
            _id: v.id("documents"),
            _creationTime: v.number(),
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
            
            searchableText: v.optional(v.string()),
            sharerId: v.id("users"),
        })
    ),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const sharedDocumentShares = await ctx.db
            .query("documentShares")
            .withIndex("by_recipientId", (q) =>
                q.eq("recipientId", userId)
            )
            .collect();

        const sharedDocuments = [];
        for (const share of sharedDocumentShares) {
            const document = await ctx.db.get(share.documentId);
            if (document && document.status === "completed") { 
                sharedDocuments.push({
                    ...document,
                    sharerId: share.sharerId,
                });
            }
        }

        return sharedDocuments;
    },
});

export const getSharerForDocument = query({
    args: {
        documentId: v.id("documents"),
    },
    returns: v.union(
        v.object({
            _id: v.id("users"),
            name: v.optional(v.string()),
            email: v.string(),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const share = await ctx.db
            .query("documentShares")
            .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
            .first();

        if (!share) {
            return null;
        }

        const sharer = await ctx.db.get(share.sharerId);
        if (!sharer) {
            return null;
        }

        return {
            _id: sharer._id,
            name: sharer.name,
            email: sharer.email,
        };
    },
});