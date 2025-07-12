import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

export const listOwnedDocuments = query({
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
            folderId: v.optional(v.id("folders")),
        })
    ),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }
        return await ctx.db
            .query("documents")
            .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
            .filter((q) => q.eq(q.field("status"), "completed")) // Only return active documents
            .collect();
    },
});

export const getUniqueAiCategories = query({
    returns: v.array(
        v.object({
            category: v.string(),
            items: v.array(
                v.object({
                    _id: v.id("documents"),
                    name: v.string(),
                }),
            ),
        }),
    ),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
            throw new Error("Authenticated user not found.");
        }

        // Get all owned documents that are completed and have aiCategories
        const ownedDocumentsWithCategories = await ctx.db
            .query("documents")
            .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
            .filter(
                (q) =>
                    q.eq(q.field("status"), "completed") &&
                    q.neq(q.field("aiCategories"), undefined),
            )
            .collect();

        // Get all shared documents that are completed and have aiCategories
        const shares = await ctx.db
            .query("documentShares")
            .withIndex("by_recipientId", (q) => q.eq("recipientId", userId))
            .collect();

        const sharedDocumentIds = shares.map((share) => share.documentId);
        const sharedDocumentsWithCategories = (
            await Promise.all(
                sharedDocumentIds.map((docId) => ctx.db.get(docId)),
            )
        ).filter(
            (doc) =>
                doc &&
                doc.status === "completed" &&
                doc.aiCategories &&
                doc.aiCategories.length > 0,
        );

        const allRelevantDocuments = [
            ...ownedDocumentsWithCategories,
            ...sharedDocumentsWithCategories,
        ];

        const categoriesMap = new Map<string, { _id: Id<"documents">, name: string }[]>();

        for (const doc of allRelevantDocuments) {
            if (doc?.aiCategories) {
                for (const category of doc.aiCategories) {
                    if (!categoriesMap.has(category)) {
                        categoriesMap.set(category, []);
                    }
                    categoriesMap.get(category)?.push({ _id: doc._id, name: doc.name });
                }
            }
        }

        const result = Array.from(categoriesMap.entries()).map(([category, items]) => ({
            category,
            items,
        }));
        return result;
    },
});

export const _getInternalDocumentDetails = internalQuery({
    args: {
        documentId: v.id("documents"),
    },
    returns: v.union(
        v.null(),
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
        })
    ),
    handler: async (ctx, args) => {
        const document = await ctx.db.get(args.documentId);
        return document;
    },
});

export const generateDownloadUrl = query({
    args: {
        documentId: v.id("documents"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Authenticated user not found.");
        }

        const document = await ctx.db.get(args.documentId);
        if (!document) {
            return null;
        }

        // Check if the user is the owner
        const isOwner = document.ownerId === userId;

        // Check if the document is shared with the user and has download permissions
        const share = await ctx.db
            .query("documentShares")
            .withIndex("by_document_recipient", (q) =>
                q.eq("documentId", args.documentId).eq("recipientId", userId),
            )
            .unique();

        const hasDownloadPermission = share?.permissionGranted.includes("download");

        if (!isOwner && !hasDownloadPermission) {
            // throw new Error("Not authorized to download this document.");
        }

        return await ctx.storage.getUrl(document.fileId);
    },
});

export const updateAiSuggestions = internalMutation({
    args: {
        documentId: v.id("documents"),
        suggestedUserIds: v.array(v.id("users")),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.documentId, {
            aiSuggestedRecipients: args.suggestedUserIds,
        });
        // Optional: Add audit log for this update
        // await ctx.db.insert("auditLogs", { ... });
        return null;
    },
});

export const getAllDocuments = query({
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
        })
    ),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        // Get owned documents
        const ownedDocuments = await ctx.db
            .query("documents")
            .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
            .filter((q) => q.or(q.eq(q.field("status"), "completed"), q.eq(q.field("status"), "processing"))) // Only return active documents
            .collect();

        // Get shared documents
        const sharedDocumentShares = await ctx.db
            .query("documentShares")
            .withIndex("by_recipientId", (q) => q.eq("recipientId", userId))
            .collect();

        const sharedDocuments = [];
        for (const share of sharedDocumentShares) {
            const document = await ctx.db.get(share.documentId);
            if (document && (document.status === "completed" || document.status === "processing")) { // Only return active documents
                sharedDocuments.push(document);
            }
        }

        // Combine and remove duplicates (though there shouldn't be duplicates if a user can't share with themselves)
        const allDocumentsMap = new Map<Id<"documents">, Doc<"documents">>();
        for (const doc of ownedDocuments) {
            allDocumentsMap.set(doc._id, doc);
        }
        for (const doc of sharedDocuments) {
            allDocumentsMap.set(doc._id, doc);
        }

        return Array.from(allDocumentsMap.values());
    },
});
export const moveDocument = mutation({
    args: {
        documentId: v.id("documents"),
        folderId: v.id("folders"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Authenticated user not found.");
        }

        const existing = await ctx.db
            .query("documentFolders")
            .withIndex("by_user_document", (q) =>
                q.eq("userId", userId).eq("documentId", args.documentId),
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                folderId: args.folderId,
            });
        } else {
            await ctx.db.insert("documentFolders", {
                userId,
                documentId: args.documentId,
                folderId: args.folderId,
            });
        }

        return null;
    },
});

export const getDocumentsInFolder = query({
    args: {
        folderId: v.id("folders"),
    },
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
        })
    ),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const documentFolders = await ctx.db
            .query("documentFolders")
            .withIndex("by_user_folder", (q) =>
                q.eq("userId", userId).eq("folderId", args.folderId),
            )
            .collect();

        const documentIds = documentFolders.map((df) => df.documentId);

        const documents = [];
        for (const documentId of documentIds) {
            const document = await ctx.db.get(documentId);
            if (document) {
                documents.push(document);
            }
        }

        return documents;
    },
});
export const getDocumentsInAllFolders = query({
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
            folderId: v.id("folders"),
        })
    ),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const documentFolders = await ctx.db
            .query("documentFolders")
            .withIndex("by_user_folder", (q) => q.eq("userId", userId))
            .collect();

        const documents = [];
        for (const df of documentFolders) {
            const document = await ctx.db.get(df.documentId);
            if (document) {
                documents.push({ ...document, folderId: df.folderId });
            }
        }

        return documents;
    },
});

export const _getFileMetadata = internalQuery({
    args: {
        fileId: v.id("_storage"),
    },
    returns: v.union(
        v.null(),
        v.object({
            _id: v.id("_storage"),
            _creationTime: v.number(),
            contentType: v.optional(v.string()),
            sha256: v.string(),
            size: v.number(),
        })
    ),
    handler: async (ctx, args) => {
        const metadata = await ctx.db.system.get(args.fileId);
        return metadata;
    },
});

export const getDocumentAndUrl = query({
    args: {
        documentId: v.id("documents"),
    },
    returns: v.union(
        v.null(),
        v.object({
            name: v.string(),
            mimeType: v.string(),
            uploaded: v.number(),
            url: v.string(),
        })
    ),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Authenticated user not found.");
        }

        const document = await ctx.db.get(args.documentId);
        if (!document) {
            return null;
        }

        // Check if the user is the owner
        const isOwner = document.ownerId === userId;

        // Check if the document is shared with the user and has view permissions
        const share = await ctx.db
            .query("documentShares")
            .withIndex("by_document_recipient", (q) =>
                q.eq("documentId", args.documentId).eq("recipientId", userId),
            )
            .unique();

        const hasViewPermission = share?.permissionGranted.includes("view");

        if (!isOwner && !hasViewPermission) {
            // If not owner and no view permission, return null or throw an error
            // For now, returning null to prevent unauthorized access
            return null;
        }

        const url = await ctx.storage.getUrl(document.fileId);
        if (!url) {
            return null;
        }

        return {
            name: document.name,
            uploaded: document._creationTime,
            mimeType: document.mimeType,
            url: url,
        };
    },
});

export const listTrashedDocuments = query({
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
            folderId: v.optional(v.id("folders")),
        })
    ),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }
        return await ctx.db
            .query("documents")
            .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
            .filter((q) => q.eq(q.field("status"), "trashed"))
            .collect();
    },
});