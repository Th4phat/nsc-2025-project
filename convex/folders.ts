import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createFolder = mutation({
    args: {
        name: v.string(),
        parentFolderId: v.optional(v.id("folders")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Authenticated user not found.");
        }

        const folderId = await ctx.db.insert("folders", {
            name: args.name,
            ownerId: userId,
            parentFolderId: args.parentFolderId,
        });

        return folderId;
    },
});

export const moveDocumentToFolder = mutation({
    args: {
        documentId: v.id("documents"),
        folderId: v.id("folders"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Authenticated user not found.");
        }

        const document = await ctx.db.get(args.documentId);
        if (!document) {
            throw new Error("Document not found.");
        }

        if (document.ownerId !== userId) {
            throw new Error("Not authorized to move this document.");
        }

        await ctx.db.patch(args.documentId, {
            folderId: args.folderId,
        });

        return null;
    },
});

export const getFolders = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const folders = await ctx.db
            .query("folders")
            .withIndex("by_owner_and_parent", (q) => q.eq("ownerId", userId))
            .collect();

        return folders;
    },
});

export const getDocuments = query({
    args: {
        folderId: v.optional(v.id("folders")),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        let query = ctx.db
            .query("documents")
            .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
            .filter((q) => q.eq(q.field("folderId"), args.folderId))
            .filter((q) => q.neq(q.field("status"), "trashed"))
            .order("desc");

        const documents = await query.collect();

        // This part is simplified. In a real app, you'd also fetch shared documents
        // and merge them, similar to the original getMyDocuments.
        // For now, we'll just return owned documents in the specified folder.

        const filterByCategory = (docs: any[]) => {
            if (args.category) {
                if (args.category === "Agreement") {
                    return docs.filter(
                        (doc) =>
                            doc.aiCategories &&
                            (doc.aiCategories.includes("Agreement") ||
                                doc.aiCategories.includes("ข้อตกลง")),
                    );
                }
                return docs.filter(
                    (doc) =>
                        doc.aiCategories && doc.aiCategories.includes(args.category),
                );
            }
            return docs;
        };

        return filterByCategory(documents);
    },
});