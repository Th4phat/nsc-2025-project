/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as audit_logs from "../audit_logs.js";
import type * as auth from "../auth.js";
import type * as departments from "../departments.js";
import type * as document from "../document.js";
import type * as document_crud from "../document_crud.js";
import type * as document_distribution from "../document_distribution.js";
import type * as document_process from "../document_process.js";
import type * as document_sharing from "../document_sharing.js";
import type * as folders from "../folders.js";
import type * as http from "../http.js";
import type * as myFunctions from "../myFunctions.js";
import type * as roles from "../roles.js";
import type * as run_seed from "../run_seed.js";
import type * as seed_users from "../seed_users.js";
import type * as user_management from "../user_management.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  audit_logs: typeof audit_logs;
  auth: typeof auth;
  departments: typeof departments;
  document: typeof document;
  document_crud: typeof document_crud;
  document_distribution: typeof document_distribution;
  document_process: typeof document_process;
  document_sharing: typeof document_sharing;
  folders: typeof folders;
  http: typeof http;
  myFunctions: typeof myFunctions;
  roles: typeof roles;
  run_seed: typeof run_seed;
  seed_users: typeof seed_users;
  user_management: typeof user_management;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
