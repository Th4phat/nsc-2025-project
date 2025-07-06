import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

const employeePermissions = [
  "profile:read:own",
  "profile:update:own",
  "inbox:read:own",
  "announcement:read:department",
  "announcement:read:company",
];

const headOfDepartmentPermissions = [
  ...employeePermissions,
  "document:send:department",
  "user:list:department",
];

const directorPermissions = [
  ...headOfDepartmentPermissions,
  "document:send:company",
  "user:list:company",
];

const systemAdministratorPermissions = [
  ...directorPermissions,
  "user:create",
  "user:read:any",
  "user:update:any",
  "user:delete:any",
  "system:logs:read",
  "system:settings:read",
  "system:settings:update",
];

const ROLES_DATA = [
    { name: "Employee", rank: 0, permissions: employeePermissions },
    { name: "Head of Department", rank: 1, permissions: headOfDepartmentPermissions },
    { name: "Director", rank: 2, permissions: directorPermissions },
    { name: "System Administrator", rank: 3, permissions: systemAdministratorPermissions },
]

export const setupRoles = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existingRoles = await ctx.db.query("roles").collect();
    if (existingRoles.length > 0) {
      console.log("Roles already exist, skipping setup.");
      return null;
    }

    for (const role of ROLES_DATA) {
      await ctx.db.insert("roles", role);
    }
    
    console.log("Successfully set up roles.");
    return null;
  },
});

export const listRoles = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("roles"),
      name: v.string(),
      rank: v.number(),
      permissions: v.array(v.string()),
      _creationTime: v.number()
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("roles").collect();
  },
});