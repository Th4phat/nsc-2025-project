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
import type * as auth from "../auth.js";
import type * as document from "../document.js";
import type * as document_crud from "../document_crud.js";
import type * as document_process from "../document_process.js";
import type * as document_sharing from "../document_sharing.js";
import type * as folders from "../folders.js";
import type * as http from "../http.js";
import type * as myFunctions from "../myFunctions.js";
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
  auth: typeof auth;
  document: typeof document;
  document_crud: typeof document_crud;
  document_process: typeof document_process;
  document_sharing: typeof document_sharing;
  folders: typeof folders;
  http: typeof http;
  myFunctions: typeof myFunctions;
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
