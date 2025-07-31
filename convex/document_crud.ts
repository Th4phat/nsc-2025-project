import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { useAction, useMutation, useQuery } from "convex/react";
export const createDocument = mutation({
    args: {
        name: v.string(),
        fileId: v.id("_storage"),
        mimeType: v.string(),
        fileSize: v.number(),
        classified: v.optional(v.boolean()),
        categories: v.optional(v.array(v.string())),
        aiSuggestedRecipients: v.optional(v.array(v.id("users"))),
    },
    handler: async (ctx, args) => {
        // 1. Get the identity of the user calling this mutation.
        const identity = await ctx.auth.getUserIdentity();

        // 2. Protect against unauthenticated users.
        if (!identity) {
            return null
        }

        // 3. Get the user's Convex ID from the 'users' table using their email.
        // The `identity.email` should match the email stored in Convex's 'users' table.
        // 3. Get the user's Convex ID from the 'users' table.
        const userId = await getAuthUserId(ctx);

        // 4. Protect against unauthenticated users or users not found in the 'users' table.
        if (!userId) {
            throw new Error("Authenticated user not found.");
        }

        // 5. Insert the new document with the valid ownerId.
        const documentId = await ctx.db.insert("documents", {
            name: args.name,
            fileId: args.fileId,
            mimeType: args.mimeType,
            fileSize: args.fileSize,
            ownerId: userId, // Use the Convex _id obtained from getAuthUserId
            status: "completed", // Set status to completed as processing is done client-side
            classified: args.classified,
            aiCategories: args.categories,
            aiSuggestedRecipients: args.aiSuggestedRecipients,
        });

        // Schedule AI recipient suggestion generation
        // await ctx.scheduler.runAfter(0, api.document_process.generateAiShareSuggestions, {
        //     documentId: documentId,
        // });

        // BONUS: This is also where you would create your audit log entry.
        await ctx.db.insert("auditLogs", {
            actorId: userId, // Use the userId obtained from getAuthUserId
            action: "document.create",
            targetTable: "documents",
            targetId: documentId, // Use the ID of the document just created
        });

        return documentId;
    },
});

export const updateDocumentCategoriesAndStatus = internalMutation({
    args: {
        documentId: v.id("documents"),
        categories: v.union(v.array(v.string()), v.null()),
        status: v.union(v.literal("completed"), v.literal("failed")),
        error: v.union(v.string(), v.null()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const document = await ctx.db.get(args.documentId);
        if (document) {
            await ctx.db.patch(document._id, {
                aiCategories: args.categories === null ? undefined : args.categories,
                aiProcessingError: args.error === null ? undefined : args.error,
                status: args.status,
            });
            await ctx.db.insert("auditLogs", {
                actorId: document.ownerId,
                action: `document.aiProcessed.${args.status}`,
                targetTable: "documents",
                targetId: document._id,
                details: { newStatus: args.status, categories: args.categories, error: args.error },
            });
        }
        return null;
    },
});

export const updateDocumentProcessingResults = mutation({
    args: {
        documentId: v.id("documents"),
        categories: v.optional(v.array(v.string())),
        aiSuggestedRecipients: v.optional(v.array(v.id("users"))),
        status: v.union(v.literal("completed"), v.literal("failed")),
        error: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const document = await ctx.db.get(args.documentId);
        if (document) {
            await ctx.db.patch(document._id, {
                aiCategories: args.categories,
                aiSuggestedRecipients: args.aiSuggestedRecipients,
                aiProcessingError: args.error,
                status: args.status,
            });
            await ctx.db.insert("auditLogs", {
                actorId: document.ownerId,
                action: `document.aiProcessed.${args.status}`,
                targetTable: "documents",
                targetId: document._id,
                details: {
                    newStatus: args.status,
                    categories: args.categories,
                    aiSuggestedRecipients: args.aiSuggestedRecipients,
                    error: args.error,
                },
            });
        }
        return null;
    },
});

export const getDocumentDetails = query({
    args: {
        documentId: v.id("documents"),
    },
    handler: async (ctx, args) => {
        const document = await ctx.db.get(args.documentId);
        return document;
    },
});

export const permanentlyDeleteDocument = mutation({
    args: {
        documentId: v.id("documents"),
    },
    returns: v.null(),
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
            throw new Error("Not authorized to delete this document. Only the owner can delete.");
        }

        // 1. Delete associated shares
        const shares = await ctx.db
            .query("documentShares")
            .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
            .collect();

        for (const share of shares) {
            await ctx.db.delete(share._id);
        }

        // 2. Delete the file from storage
        // Ensure fileId exists before attempting to delete.
        if (document.fileId) {
            try {
                await ctx.storage.delete(document.fileId);
            } catch (error) {
                // Log the error but proceed to delete the document record
                // This handles cases where the file might have been already deleted or is otherwise inaccessible
                console.error(`Failed to delete file ${document.fileId} from storage:`, error);
            }
        }


        // 3. Delete the document record itself
        await ctx.db.delete(args.documentId);

        // 4. Add audit log
        await ctx.db.insert("auditLogs", {
            actorId: userId,
            action: "document.delete",
            targetTable: "documents",
            targetId: args.documentId,
            details: { documentName: document.name, originalFileId: document.fileId },
        });

        return null;
    },
});

export const softDeleteDocument = mutation({
    args: {
        documentId: v.id("documents"),
    },
    returns: v.null(),
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
            throw new Error("Not authorized to soft delete this document. Only the owner can soft delete.");
        }

        await ctx.db.patch(args.documentId, { status: "trashed" });

        await ctx.db.insert("auditLogs", {
            actorId: userId,
            action: "document.softDelete",
            targetTable: "documents",
            targetId: args.documentId,
            details: { documentName: document.name },
        });

        return null;
    },
});

export const restoreDocument = mutation({
    args: {
        documentId: v.id("documents"),
    },
    returns: v.null(),
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
            throw new Error("Not authorized to restore this document. Only the owner can restore.");
        }

        await ctx.db.patch(args.documentId, { status: "completed" }); // Restore to "completed" status

        await ctx.db.insert("auditLogs", {
            actorId: userId,
            action: "document.restore",
            targetTable: "documents",
            targetId: args.documentId,
            details: { documentName: document.name },
        });

        return null;
    },
});

export const updateDocumentCategories = mutation({
  args: {
    documentId: v.id("documents"),
    categories: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Patch the document with the categories generated on the client
    await ctx.db.patch(args.documentId, {
      aiCategories: args.categories,
      // You can also update a status field here if you have one
      status: "completed",
    });
  },
});

export const getAllAiCategories = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const ownedDocuments = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("ownerId"), userId))
      .collect();

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

    const allDocuments = [...ownedDocuments, ...sharedDocuments];

    const allCategories = new Set<string>();
    for (const doc of allDocuments) {
      if (doc.aiCategories) {
        for (const category of doc.aiCategories) {
          allCategories.add(category);
        }
      }
    }
    return Array.from(allCategories);
  },
});

export const renameAiCategory = mutation({
  args: {
    oldCategoryName: v.string(),
    newCategoryName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authenticated user not found.");
    }

    const documentsToUpdate = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("ownerId"), userId))
      .collect();

    const filteredDocuments = documentsToUpdate.filter(doc =>
      doc.aiCategories?.includes(args.oldCategoryName)
    );

    for (const doc of filteredDocuments) {
      const updatedCategories = doc.aiCategories?.map((cat) =>
        cat === args.oldCategoryName ? args.newCategoryName : cat
      );
      await ctx.db.patch(doc._id, { aiCategories: updatedCategories });
    }

    await ctx.db.insert("auditLogs", {
      actorId: userId,
      action: "aiCategory.rename",
      targetTable: "documents",
      targetId: null, // No specific document, applies globally
      details: { oldName: args.oldCategoryName, newName: args.newCategoryName },
    });
  },
});

export const deleteAiCategory = mutation({
  args: {
    categoryName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authenticated user not found.");
    }

    const documentsToUpdate = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("ownerId"), userId))
      .collect();

    const filteredDocuments = documentsToUpdate.filter(doc =>
      doc.aiCategories?.includes(args.categoryName)
    );

    for (const doc of filteredDocuments) {
      const updatedCategories = doc.aiCategories?.filter(
        (cat) => cat !== args.categoryName
      );
      await ctx.db.patch(doc._id, { aiCategories: updatedCategories });
    }

    await ctx.db.insert("auditLogs", {
      actorId: userId,
      action: "aiCategory.delete",
      targetTable: "documents",
      targetId: null, // No specific document, applies globally
      details: { categoryName: args.categoryName },
    });
  },
});