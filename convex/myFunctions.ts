import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// You can read data from the database via a query:
export const listNumbers = query({
  // Validators for arguments.
  args: {
    count: v.optional(v.number()),
  },

  // Query implementation.
  handler: async (ctx, _args) => {
    //// Read the database as many times as you need here.
    //// See https://docs.convex.dev/database/reading-data.
    const userId = await getAuthUserId(ctx);
    // const count = args.count ?? 10;
    if (userId === null) {
      return []; // Return empty array if user is not authenticated
    }
    const numbers = await ctx.db
      .query("numbers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      // Ordered by _creationTime, return most recent
      .order("desc")
      .collect() // Use collect to get all numbers for the user
    return numbers.map((number) => number.value);
  },
});

// You can write data to the database via a mutation:
export const addNumber = mutation({
  // Validators for arguments.
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

