"use server"
import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// You can read data from the database via a query:
export const listNumbers = query({
  args: {
    count: v.optional(v.number()),
  },

  handler: async (ctx, _args) => {

    const userId = await getAuthUserId(ctx);

    if (userId === null) {
      return []; // Return empty array if user is not authenticated
    }
    const numbers = await ctx.db
      .query("numbers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))

      .order("desc")
      .collect()
    return numbers.map((number) => number.value);
  },
});

// You can write data to the database via a mutation:
export const addNumber = mutation({

  args: {
    value: v.number(),
  },

  // Mutation implementation.
  handler: async (ctx, args) => {
    //// Insert or modify documents in the database here.
    //// Mutations can also read from the database like queries.
    //// See https://docs.convex.dev/database/writing-data.
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("User not authenticated");
    }

    const id = await ctx.db.insert("numbers", {
      value: args.value,
      userId: userId
    })

    console.log("Added new document with id:", id);
    // Optionally, return a value from your mutation.
    // return id;
  },
});

export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      id: v.id("users"),
      name: v.optional(v.string()), // name can be optional
      email: v.optional(v.string()), // email can be optional
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    console.log(userId);

    const identity = await ctx.auth.getUserIdentity();
    console.log("ident", identity?.email);

    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);

    if (!user) {
      return null;
    }

    return {
      id: user._id,
      name: user.name, // Will be undefined/null if auth provider doesn't supply it or it's not stored
      email: user.email, // Will be undefined/null if auth provider doesn't supply it or it's not stored
    };
  },
});

export const listUsersForShare = query({
  args: {
    searchQuery: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    let users = [];

    // If there's a search query, perform a filtered search
    if (args.searchQuery) {
      // For simplicity, searching by email. In a real app, you might use a HNSW index for better search.
      users = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), args.searchQuery)) // Only email for now
        .collect();
    } else {
      // Otherwise, return a default list (e.g., all active users up to a limit)
      // This is a placeholder; consider a more robust way to recommend users without a search query.
      users = await ctx.db
        .query("users")
        .take(10); // Limit to 10 users for brevity
    }

    // Filter out the current user (if authenticated) from the list
    const currentUserId = (await ctx.auth.getUserIdentity())?.subject;
    
    // Convert to the desired return format
    return users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
    })).filter(user => user._id !== currentUserId);
  },
});
