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

export const getFolders = query({
    args: {
        folderId: v.optional(v.id("folders")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const folders = await ctx.db
            .query("folders")
            .withIndex("by_owner_and_parent", (q) =>
                q.eq("ownerId", userId).eq("parentFolderId", args.folderId),
            )
            .collect();

        return folders;
    },
});

export const deleteFolder = mutation({
    args: {
        folderId: v.id("folders"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Authenticated user not found.");
        }

        const folder = await ctx.db.get(args.folderId);
        if (!folder || folder.ownerId !== userId) {
            throw new Error("Folder not found or not authorized to delete.");
        }

        // Delete documents associated with this folder
        const documentsInFolder = await ctx.db
            .query("documents")
            .withIndex("by_folderId", (q) => q.eq("folderId", args.folderId))
            .collect();

        for (const doc of documentsInFolder) {
            await ctx.db.delete(doc._id);
            // Also delete the associated file from storage
            await ctx.storage.delete(doc.fileId);
        }

        // Delete the folder itself
        await ctx.db.delete(args.folderId);
        return null;
    },
});

export const renameFolder = mutation({
    args: {
        folderId: v.id("folders"),
        newName: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Authenticated user not found.");
        }

        const folder = await ctx.db.get(args.folderId);
        if (!folder || folder.ownerId !== userId) {
            throw new Error("Folder not found or not authorized to rename.");
        }

        await ctx.db.patch(args.folderId, { name: args.newName });
        return null;
    },
});