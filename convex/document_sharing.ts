import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const shareDocument = mutation({
    args: {
        documentId: v.id("documents"),
        recipientId: v.id("users"),
        permissions: v.array(
            v.union(
                v.literal("view"),
                v.literal("download"),
                v.literal("comment"),
                v.literal("edit_metadata"),
                v.literal("resend"),
            ),
        ),
    },
    handler: async (ctx, args) => {
        const sharerId = await getAuthUserId(ctx);
        if (!sharerId) {
            throw new Error("Authenticated user not found.");
        }

        // Check if the sharer has permission to share this document.
        // For simplicity, for now we only allow the owner to share.
        // In a real app, you might have a more complex permission system.
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
                name: v.optional(v.string()), // Optional because user name might not be set
                email: v.string(), // Email should always be present
            }),
            permissions: v.array(
                v.union(
                    v.literal("view"),
                    v.literal("download"),
                    v.literal("comment"),
                    v.literal("edit_metadata"),
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

        const sharedUsers = [];
        for (const share of shares) {
            const user = await ctx.db.get(share.recipientId);
            if (user) {
                sharedUsers.push({
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                    },
                    permissions: share.permissionGranted,
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
            v.literal("comment"),
            v.literal("edit_metadata"),
            v.literal("resend")
        )
    ),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            // If no authenticated user, they have no permissions on any document
            return [];
        }

        const document = await ctx.db.get(args.documentId);
        if (!document) {
            // Document not found, no permissions
            return [];
        }

        // If the user is the owner, they have all permissions
        if (document.ownerId === userId) {
            return ["view", "download", "comment", "edit_metadata", "resend"] as ("view" | "download" | "comment" | "edit_metadata" | "resend")[];
        }

        // Check for specific permissions granted through sharing
        const share = await ctx.db
            .query("documentShares")
            .withIndex("by_document_recipient", (q) =>
                q.eq("documentId", args.documentId).eq("recipientId", userId)
            )
            .unique();

        // Return the permissions granted through the share, or an empty array if no share exists
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