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