import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

const isSignInPage = createRouteMatcher(["/signin"]);
const isProtectedRoute = createRouteMatcher(["/", "/server", "/dashboard"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  console.log("Middleware is running for path:", request.nextUrl.pathname);
  // if (isSignInPage(request) && (await convexAuth.isAuthenticated())) {
  //   return nextjsMiddlewareRedirect(request, "/dashboard");
  // }
  // if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
  //   return nextjsMiddlewareRedirect(request, "/signin");
  // }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}