import { NextRequest } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { convexAuthNextjsToken, isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
import { getFileContent, getAiShareSuggestions } from "@/lib/document_processing";

export async function GET() {
  return new Response("Method not allowed", {
    status: 405,
  });
}

export async function POST(request: NextRequest) {
  const authed = await isAuthenticatedNextjs();
  if (!authed) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = await convexAuthNextjsToken();
  if (!token) {
    return new Response(JSON.stringify({ error: "No token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { documentId: doc_id } = await request.json();

  if (!doc_id) {
    return new Response(JSON.stringify({ error: "Missing documentId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const document = await fetchQuery(api.document_crud.getDocumentDetails, { documentId: doc_id as Id<"documents"> }, { token });
  if (!document) {
    return new Response(JSON.stringify({ error: "Document not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fileUrl = await fetchQuery(api.document.generateDownloadUrl, { documentId: doc_id as Id<"documents"> }, { token });
  if (!fileUrl) {
    return new Response(JSON.stringify({ error: "File URL not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fileResponse = await fetch(fileUrl);
  const arrayBuffer = await fileResponse.arrayBuffer();
  // const file = new File([arrayBuffer], document.name, { type: document.mimeType });

  const fileContent = await getFileContent(arrayBuffer, document.mimeType);

  const allUsers = await fetchQuery(api.users.getAllUsers, {}, { token });
  if (!allUsers) {
    return new Response(JSON.stringify({ error: "Users not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const suggestedUserIds = await getAiShareSuggestions(
    document.name,
    fileContent,
    document.ownerId,
    allUsers
  );

  await fetchMutation(
    api.document_crud.updateDocumentProcessingResults,
    {
      documentId: doc_id as Id<"documents">,
      aiSuggestedRecipients: suggestedUserIds as Id<"users">[],
      status: "completed",
    },
    { token }
  );

  return new Response(JSON.stringify({ aiSuggestedRecipients: suggestedUserIds }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}