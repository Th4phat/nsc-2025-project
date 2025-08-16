import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
export const createDocument = mutation({
  args: {
    name: v.string(),
    fileId: v.id("_storage"),
    mimeType: v.string(),
    fileSize: v.number(),
    classified: v.optional(v.boolean()),
    status: v.optional(
      v.union(
        v.literal("uploading"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("trashed")
      )
    ),
    categories: v.optional(v.array(v.string())),
    aiSuggestedRecipients: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {

    const identity = await ctx.auth.getUserIdentity();


    if (!identity) {
      return null
    }




    const userId = await getAuthUserId(ctx);


    if (!userId) {
      throw new Error("Authenticated user not found.");
    }



    const initialStatus: "uploading" | "processing" | "completed" | "failed" | "trashed" =
      args.status ?? (args.classified ? "completed" : "processing");


    const documentId = await ctx.db.insert("documents", {
      name: args.name,
      fileId: args.fileId,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      ownerId: userId,
      status: initialStatus,
      classified: args.classified,
      aiCategories: args.categories,
      aiSuggestedRecipients: args.aiSuggestedRecipients,
    });







    await ctx.db.insert("auditLogs", {
      actorId: userId,
      action: "document.create",
      targetTable: "documents",
      targetId: documentId,
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

    searchableText: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (document) {
      const patch: any = {
        aiCategories: args.categories,
        aiSuggestedRecipients: args.aiSuggestedRecipients,
        aiProcessingError: args.error,
        status: args.status,
      };
      if (typeof args.searchableText === "string") {
        patch.searchableText = args.searchableText;
      }
      await ctx.db.patch(document._id, patch);
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
          searchableTextStored: typeof args.searchableText === "string",
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


    const shares = await ctx.db
      .query("documentShares")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .collect();

    for (const share of shares) {
      await ctx.db.delete(share._id);
    }



    if (document.fileId) {
      try {
        await ctx.storage.delete(document.fileId);
      } catch (error) {


        console.error(`Failed to delete file ${document.fileId} from storage:`, error);
      }
    }



    await ctx.db.delete(args.documentId);


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

    await ctx.db.patch(args.documentId, { status: "completed" });

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

    await ctx.db.patch(args.documentId, {
      aiCategories: args.categories,

      status: "completed",
    });
  },
});

export const updateDocumentName = mutation({
  args: {
    documentId: v.id("documents"),
    newName: v.string(),
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
      throw new Error("Not authorized to rename this document. Only the owner can rename.");
    }

    await ctx.db.patch(args.documentId, { name: args.newName });

    await ctx.db.insert("auditLogs", {
      actorId: userId,
      action: "document.rename",
      targetTable: "documents",
      targetId: args.documentId,
      details: { newName: args.newName },
    });

    return null;
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
      targetId: null,
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
      targetId: null,
      details: { categoryName: args.categoryName },
    });
  },
});


export const searchDocuments = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },


  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    console.log("searchDocuments called with query:", args.query);
    const searchTerm = (args.query || "").toString().trim();
    const limit = args.limit ?? 100;


    const userId = await getAuthUserId(ctx);
    if (!userId) {
      console.log("searchDocuments: unauthenticated request - returning empty");
      return [];
    }


    const shares = await ctx.db
      .query("documentShares")
      .withIndex("by_recipientId", (q) => q.eq("recipientId", userId))
      .collect();

    const allowedSharedDocIds = new Set<Id<"documents">>();
    for (const s of shares) {
      if (Array.isArray(s.permissionGranted) && s.permissionGranted.includes("view")) {
        allowedSharedDocIds.add(s.documentId as Id<"documents">);
      }
    }


    const filterAccessible = (docs: any[]) => {
      return docs.filter((d) => {
        if (!d) return false;
        if (d.status === "trashed") return false;
        if (d.ownerId === userId) return true;
        if (allowedSharedDocIds.has(d._id)) return true;
        return false;
      });
    };

    if (searchTerm === "") {

      const owned = await ctx.db
        .query("documents")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
        .filter((q) => q.neq(q.field("status"), "trashed"))
        .collect();

      const sharedDocs: any[] = [];
      for (const docId of Array.from(allowedSharedDocIds)) {
        const doc = await ctx.db.get(docId as any);
        if (doc && 'status' in doc && doc.status !== "trashed") sharedDocs.push(doc);
      }

      const combined = [...owned, ...sharedDocs];
      const uniqueById = new Map<string, any>();
      for (const d of combined) {
        if (d && d._id) uniqueById.set(d._id, d);
      }
      return Array.from(uniqueById.values()).slice(0, limit);
    }

    try {

      const indexedResults = await ctx.db
        .query("documents")
        .withSearchIndex("by_searchable_text", (q) => q.search("searchableText", searchTerm))
        .collect();

      console.log("searchDocuments: withSearchIndex returned", indexedResults.length, "results");
      const accessibleIndexed = filterAccessible(indexedResults);
      if (accessibleIndexed.length > 0) {
        return accessibleIndexed.slice(0, limit);
      }


      console.log("searchDocuments: index returned no accessible results, running fallback across accessible docs");
      const ownedDocs = await ctx.db
        .query("documents")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
        .collect();

      const accessibleIds = new Set<Id<"documents">>(ownedDocs.map((d: any) => d._id as Id<"documents">));
      for (const id of Array.from(allowedSharedDocIds)) accessibleIds.add(id);

      const accessibleDocs: any[] = [];
      for (const id of accessibleIds) {
        const doc = await ctx.db.get(id);
        if (doc && 'status' in doc && doc.status !== "trashed") accessibleDocs.push(doc);
      }


      const normalize = (s: any) => {
        try {
          if (!s) return "";
          const str = s.toString().replace(/[\x00-\x1F\x7F]/g, "");
          try {
            return str.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC").toLowerCase();
          } catch (e) {
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC").toLowerCase();
          }
        } catch (e) {
          try {
            return s.toString().toLowerCase();
          } catch {
            return "";
          }
        }
      };

      const nSearch = normalize(searchTerm);
      const matched = accessibleDocs.filter((doc) => {
        const rawText = `${doc.name ?? ""} ${doc.description ?? ""} ${doc.aiCategories?.join(" ") ?? ""} ${(doc as any).searchableText ?? ""
          }`;
        const nText = normalize(rawText);
        return nText.includes(nSearch);
      });

      return matched.slice(0, limit);
    } catch (indexErr) {

      console.warn("searchDocuments: withSearchIndex failed, falling back to naive accessible search:", indexErr);

      const ownedDocs = await ctx.db
        .query("documents")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
        .collect();

      const accessibleIds = new Set<Id<"documents">>(ownedDocs.map((d: any) => d._id as Id<"documents">));
      for (const id of Array.from(allowedSharedDocIds)) accessibleIds.add(id);

      const accessibleDocs: any[] = [];
      for (const id of accessibleIds) {
        const doc = await ctx.db.get(id as any);
        if (doc && 'status' in doc && doc.status !== "trashed") accessibleDocs.push(doc);
      }

      const lower = searchTerm.toLowerCase();
      const matched = accessibleDocs.filter((doc) => {
        const text =
          `${doc.name ?? ""} ${doc.description ?? ""} ${doc.aiCategories?.join(" ") ?? ""} ${(doc as any).searchableText ?? ""
            }`.toLowerCase();
        return text.includes(lower);
      });
      return matched.slice(0, limit);
    }
  },
});