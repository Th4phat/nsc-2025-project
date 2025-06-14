import { v } from "convex/values";
import { mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { GoogleGenAI, Type } from '@google/genai'; // Using the existing @google/genai

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const createDocument = mutation({
  args: {
    name: v.string(),
    fileId: v.id("_storage"),
    mimeType: v.string(),
    fileSize: v.number(),
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
      status: "processing", // Initial status
    });

    // Schedule the document processing immediately
    await ctx.scheduler.runAfter(0, internal.document.processDocument, {
      documentId: documentId,
    });

    // Schedule AI recipient suggestion generation
    await ctx.scheduler.runAfter(0, internal.document.generateAiShareSuggestions, {
      documentId: documentId,
    });

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

export const getMyDocuments = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    // 4. Protect against unauthenticated users or users not found in the 'users' table.
    if (!userId) {
      throw new Error("Authenticated user not found.");
    }

    // Helper function to filter documents by category
    const filterByCategory = (docs: any[]) => {
      if (args.category) {
        // Handle the case for "Agreement" which might be tagged as "ข้อตกลง"
        if (args.category === "Agreement") {
          return docs.filter(
            (doc) =>
              doc.aiCategories &&
              (doc.aiCategories.includes("Agreement") ||
                doc.aiCategories.includes("ข้อตกลง")),
          );
        }
        // For all other categories, filter by the exact category name
        return docs.filter(
          (doc) =>
            doc.aiCategories && doc.aiCategories.includes(args.category),
        );
      }
      return docs;
    };

    // 1. Get all documents this user owns
    const ownedDocuments = await ctx.db
      .query("documents")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      // Filter out any documents the user has trashed
      .filter((q) => q.neq(q.field("status"), "trashed"))
      .collect();

    // 2. Get all documents shared with this user
    const shares = await ctx.db
      .query("documentShares")
      .withIndex("by_recipientId", (q) => q.eq("recipientId", userId))
      .collect();

    // 3. Fetch the actual document data for the shared documents
    const sharedDocumentIds = shares.map((share) => share.documentId);
    const sharedDocuments = (
      await Promise.all(
        sharedDocumentIds.map((docId) => ctx.db.get(docId)),
      )
    ).filter(
      // Filter out any null results (if a doc was deleted but the share remains)
      // and also filter out trashed documents
      (doc) => doc && doc.status !== "trashed",
    );

    // 4. Combine and de-duplicate the lists
    const allDocuments = [...ownedDocuments, ...sharedDocuments];
    const documentMap = new Map();
    allDocuments.forEach((doc) => {
      // The map ensures each document appears only once
      documentMap.set(doc?._id, doc);
    });

    const uniqueDocuments = Array.from(documentMap.values()).sort(
      (a, b) => b._creationTime - a._creationTime, // Show newest first
    );

    return filterByCategory(uniqueDocuments);
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


export const getBlobContent = internalAction({
  args: {
    fileId: v.id("_storage"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const file = await ctx.storage.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }
    const text = await file.text();
    return text;
  },
});

export const processDocument = internalAction({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let categories: string[] | null = null;
    let errorMsg: string | null = null; // Renamed to avoid conflict
    let status: "completed" | "failed" = "completed";

    try {
      const document = await ctx.runQuery(internal.document._getInternalDocumentDetails, { documentId: args.documentId });

      if (!document) {
        throw new Error("Document not found.");
      }

      const documentUrl = await ctx.storage.getUrl(document.fileId);

      if (!documentUrl) {
        throw new Error("Could not get document URL.");
      }

      // This block will only execute if apiKey is present and status is not "failed"
      const ai = new GoogleGenAI({ apiKey: "AIzaSyASo0ibr12IAa9NY575ZVLi3hVBoPCgA9U" });
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Categorize the following document from the URL into one or more relevant business document categories.
             Examples of categories include:
              "ข่าวประชาสัมพันธ์",
              "รายงานทั่วไป",
              "สัญญา",
              "ข้อตกลง",
              "นโยบาย",
              "งบการเงิน",
              "เอกสารส่วนบุคคล",
              "หนังสือโต้ตอบ",
              "เอกสารทางกฎหมาย".
             Document from: ${documentUrl}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
          },
        },
      })
      const responseText = result.text;
      console.log(responseText);

      // Nested try-catch for parsing, specific to this block
      try {
        if (typeof responseText !== 'string') {
          throw new Error(`AI response was not a string. Response: ${responseText}`);
        }
        const parsedCategories = JSON.parse(responseText);
        if (!Array.isArray(parsedCategories) || !parsedCategories.every(cat => typeof cat === 'string')) {
          throw new Error("AI response not a valid JSON array of strings.");
        }
        categories = parsedCategories;
      } catch (parseError: any) {
        // This catch is for parsing errors specifically
        console.error("Failed to parse AI response:", parseError);
        status = "failed"; // Mark as failed due to parsing error
        errorMsg = `Failed to parse AI response: ${parseError.message} - Response: ${responseText}`;
      }

    } catch (e: any) { // This is the outer catch for general errors (network, document not found, etc.)
      console.error("Error processing document:", e);
      status = "failed";
      errorMsg = e.message;
    } finally {
      await ctx.runMutation(internal.document.updateDocumentCategoriesAndStatus, {
        documentId: args.documentId,
        categories: categories,
        status: status,
        error: errorMsg,
      });
    }
    return null;
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

export const _getInternalDocumentDetails = internalQuery({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    return document;
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
      throw new Error("Document not found.");
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

export const generateAiShareSuggestions = internalAction({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let suggestedUserIds: Id<"users">[] = [];

    try {

      const ai = new GoogleGenAI({ apiKey: "AIzaSyASo0ibr12IAa9NY575ZVLi3hVBoPCgA9U" }); // Using @google/genai

      // 1. Fetch document details
      const document = await ctx.runQuery(internal.document._getInternalDocumentDetails, { documentId: args.documentId });

      if (!document) {
        throw new Error("Document not found.");
      }

      const documentUrl = await ctx.storage.getUrl(document.fileId);

      if (!documentUrl) {
        throw new Error("Could not get document URL.");
      }
      // 2. Fetch all users
      // The `getAllUsers` query now returns departmentId as well.
      const allUsers: {
        _id: Id<"users">;
        name?: string;
        email: string;
        department?: {
          _id: Id<"departments">;
          name: string;
          description?: string;
        };
      }[] = await ctx.runQuery(api.users.getAllUsers, {});

      // 3. Craft the prompt
      const userListString = allUsers
        .map(user => {
          let userInfo = `- User ID: ${user._id}, Name: ${user.name || "N/A"}, Email: ${user.email}`;
          if (user.department) {
            userInfo += `, Department: ${user.department.name}`;
            if (user.department.description) {
              userInfo += ` (${user.department.description})`;
            }
          }
          return userInfo;
        })
        .join("\n");

      const promptString = `
        Analyze the following document (title and content) and the list of available users.
        Your goal is to suggest a list of User IDs who would be most relevant to share this document with.
        Consider the document's topic, keywords, and purpose.
        Consider the users' names, emails, and department IDs (if available) to infer their roles or areas of interest.
        The document owner (User ID: ${document.ownerId}) should NOT be included in the suggestions.

        Return your suggestions ONLY as a JSON array of strings, where each string is a User ID.
        For example: ["userId1", "userId2", "userId3"]
        If no users are deemed relevant, or if the user list is empty (excluding the owner), return an empty array [].
        Do not include any other text, explanations, or markdown formatting around the JSON array.

        Document Title: ${document.name}

        Document Content: ${documentUrl}

        Available users:
        ${userListString}

        Based on the document and user profiles, provide a JSON array of User IDs to share with:
      `;
      console.log(promptString)
      // 4. Call Google AI API (using @google/genai syntax)
      const modelName = "gemini-2.0-flash"; // Or "gemini-pro"
      const generationResult = await ai.models.generateContent({
        model: modelName,
        contents: promptString, // Pass the crafted prompt string directly
        // generationConfig and safetySettings can be added here if needed,
        // similar to how @google/generative-ai structures them, if @google/genai supports them.
        // For simplicity, keeping it minimal like the `processDocument` example.
        config: {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
    },
  },
      });

      const aiResponseText = generationResult.text;

      // 5. Parse AI Response
      if (typeof aiResponseText !== 'string') {
        console.error("AI response text is undefined or not a string. No suggestions will be made.");
      } else {
        try {
          // Attempt to extract JSON array from the response.
          // AI might sometimes include markdown ```json ... ``` or other text.
          const jsonMatch = aiResponseText.match(/\[[^\]]*\]/);
          let parsedIds: any[] = [];

          if (jsonMatch && jsonMatch[0]) {
            parsedIds = JSON.parse(jsonMatch[0]);
          } else {
            // Fallback if no clear array is found, try parsing the whole thing
            parsedIds = JSON.parse(aiResponseText);
          }

          if (Array.isArray(parsedIds) && parsedIds.every(id => typeof id === 'string')) {
            const validUserIdsFromDB = new Set(allUsers.map(u => u._id));
            suggestedUserIds = parsedIds
              .map(id => id as Id<"users">)
              .filter(id => id !== document.ownerId && validUserIdsFromDB.has(id));
          } else {
            console.error("AI response was not a valid JSON array of strings after attempting to parse:", aiResponseText);
          }
        } catch (parseError: any) { // Catch for JSON parsing errors
          console.error("Failed to parse AI JSON response:", parseError, "Response text:", aiResponseText);
        }
      }
    } catch (error: any) { // Catch for the main try block (API call, fetching users/doc etc.)
      console.error("Error generating AI share suggestions:", error.message, error.stack);
      // Fallback to empty suggestions in case of any error during the AI call process
      suggestedUserIds = [];
    }

    // 6. Update the document with these suggestions (even if empty due to errors)
    await ctx.runMutation(internal.document.updateAiSuggestions, {
      documentId: args.documentId,
      suggestedUserIds: suggestedUserIds,
    });

    return null;
  },
});

export const deleteDocument = mutation({
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

