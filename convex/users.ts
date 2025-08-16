import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { mutationWithAuth, queryWithAuth, auth } from "./auth";

export const getCurrentUserID = query({
  args: {},
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return userId;
  },
});
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      id: v.id("users"),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return {
      id: user._id,
      email: user.email,
      name: user.name,
    };
  },
});

export const getUserRoleAndControlledDepartments = query({
  args: {},
  returns: v.union(
    v.object({
      roleName: v.string(),
      rank: v.number(), 
      permissions: v.array(v.string()),
      controlledDepartments: v.optional(v.array(v.id("departments"))),
    }),
    v.null()
  ),
  handler: async (ctx): Promise<{
    roleName: string;
    rank: number; 
    permissions: string[];
    controlledDepartments?: Id<"departments">[];
  } | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const result = await ctx.runQuery(
      internal.document_distribution.getUserRoleAndPermissions,
      { userId }
    );
    return result;
  },
});

export const getMyProfile = queryWithAuth(["profile:read:own"])({
	 args: {},
	 handler: async (ctx) => {
	   const userId = await getAuthUserId(ctx);
	   if (!userId) {
	     return null;
	   }
	   const user = await ctx.db.get(userId);
	   if (!user) {
	     return null;
	   }
	   if (!user.profileId) {
	     return { user };
	   }
	   const profile = await ctx.db.get(user.profileId);
	   return { user, profile };
	 },
});

export const updateUserProfile = mutationWithAuth(["profile:update:own"])( {
	 args: {
	  
      phone:v.string(),
	   bio: v.string(),
	   title: v.string(),
	   location: v.string(),
	   website: v.string(),
	 },
	 handler: async (ctx, args) => {
	   const userId = await getAuthUserId(ctx);
	   if (!userId) {
	     throw new Error("Authenticated user not found.");
	   }

	   const user = await ctx.db.get(userId);

	   if (!user) {
	     throw new Error("User not found");
	   }

	  

	   if (user.profileId) {
	     await ctx.db.patch(user.profileId, {
          phone: args.phone,
	       bio: args.bio,
	      
	       address: args.location,
	       website: args.website,
	     });
	   }
	 },
});
export const getAllUsers = query({
  args: {},
  
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.string(),
      department: v.optional(
        v.object({
          _id: v.id("departments"),
          name: v.string(),
          description: v.optional(v.string()),
        })
      ),
      roleName: v.optional(v.string()),
      bio: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    
    const users = await ctx.db.query("users").collect();

    
    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        let department = undefined;
        if (user.departmentId) {
          department = await ctx.db.get(user.departmentId);
        }

        let roleName = undefined;
        if (user.roleId) {
          const role = await ctx.db.get(user.roleId);
          if (role) {
            roleName = role.name;
          }
        }

        let bio = undefined;
        if (user.profileId) {
          const profile = await ctx.db.get(user.profileId);
          if (profile) {
            bio = profile.bio;
          }
        }

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          department: department
            ? {
                _id: department._id,
                name: department.name,
                description: department.description,
              }
            : undefined,
          roleName: roleName,
          bio: bio,
        };
      })
    );

    return usersWithDetails;
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

    
    if (args.searchQuery) {
      users = await ctx.db
        .query("users")
        .withSearchIndex("by_search_query", (q) =>
          q.search("email", args.searchQuery!)
        )
        .collect();
    } else {
      
      
      users = await ctx.db
        .query("users")
        .take(10); 
    }

    
    const currentUserId = (await ctx.auth.getUserIdentity())?.subject;
    
    
    return users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
    })).filter(user => user._id !== currentUserId);
  },
});

export const getUsersByIds = query({
  args: {
    userIds: v.array(v.id("users")),
  },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.union(v.string(), v.null())), 
      email: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const users = await Promise.all(
      args.userIds.map(async (userId) => {
        const user = await ctx.db.get(userId);
        if (user) {
          return {
            _id: user._id,
            name: user.name ?? null, 
            email: user.email,
          };
        }
        return null;
      })
    );
    return users.filter(Boolean) as {
      _id: Id<"users">;
      name?: string | null;
      email: string;
    }[];
  },
});

export const getMyPermissions = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx): Promise<string[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      console.log("no user id")
      return [];
    }
    const user: Doc<"users"> | null = await ctx.db.get(userId);
    if (!user || !user.roleId) {
      console.log("no user")
      return [];
    }

    const role: Doc<"roles"> | null = await ctx.db.get(user.roleId);

    if (!role) {
      console.log("no role")
      return [];
    }

    return role.permissions || [];
  },
})

export const getPermissionsByUserId = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx, args): Promise<string[]> => {
    const userId = await getAuthUserId(ctx);
	   if (!userId) {
	     throw new Error("Authenticated user not found.");
	   }
    const user: Doc<"users"> | null = await ctx.db.get(userId);
    if (!user || !user.roleId) {
      return [];
    }

    const role: Doc<"roles"> | null = await ctx.db.get(user.roleId);

    if (!role) {
      return [];
    }

    return role.permissions || [];
  },
});
export const getDepartmentMembers = queryWithAuth(["user:list:department"])({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      email: v.string(),
      name: v.optional(v.string()),
      roleId: v.optional(v.id("roles")),
      profileId: v.optional(v.id("profiles")),
      departmentId: v.optional(v.id("departments")),
      status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    })
  ),
  handler: async (ctx): Promise<Doc<"users">[]> => {
    const user: Doc<"users"> | null = await ctx.runQuery(internal.auth.getUser);

    if (!user || !user.departmentId) {
      
      return [];
    }

    const members: Doc<"users">[] = await ctx.db
      .query("users")
      .withIndex("by_departmentId", (q) =>
        q.eq("departmentId", user.departmentId!)
      )
      .collect();

    return members;
  },
});
export const getCompanyDirectory = queryWithAuth(["user:list:company"])({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      email: v.string(),
      name: v.optional(v.string()),
      roleId: v.optional(v.id("roles")),
      profileId: v.optional(v.id("profiles")),
      departmentId: v.optional(v.id("departments")),
      status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    })
  ),
  handler: async (ctx): Promise<Doc<"users">[]> => {
    const users = await ctx.db.query("users").collect();
    return users;
  },
});

