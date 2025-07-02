import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEPARTMENTS_DATA = [
  { name: "Human Resources", description: "Manages HR functions" },
  { name: "Finance", description: "Handles financial operations" },
  { name: "Engineering", description: "Develops and maintains software" },
  { name: "Marketing", description: "Manages marketing campaigns" },
  { name: "Sales", description: "Drives sales and customer acquisition" },
];

export const setupDepartments = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existingDepartments = await ctx.db.query("departments").collect();
    if (existingDepartments.length > 0) {
      console.log("Departments already exist, skipping setup.");
      return null;
    }

    for (const department of DEPARTMENTS_DATA) {
      await ctx.db.insert("departments", department);
    }

    console.log("Successfully set up departments.");
    return null;
  },
});

export const listDepartments = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("departments"),
      name: v.string(),
      description: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("departments").collect();
  },
});