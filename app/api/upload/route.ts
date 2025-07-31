import { NextRequest } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { convexAuthNextjsToken, isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
import { getFileContent, getDocCategories, getAiShareSuggestions, FileContent } from "@/lib/document_processing";

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

  const user = await fetchQuery(api.users.getCurrentUser, {}, { token });
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const userId = user.id;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string | null;
  const classified = formData.get("classified") === "true";

  if (!file) {
    return new Response("Missing file", {
      status: 400,
    });
  }
  const arrayBuffer = await file.arrayBuffer();

  if (!file || !name) {
    return new Response("Missing file or name", {
      status: 400,
    });
  }

  try {
    // 1. Request an upload URL from Convex
    const uploadUrl = await fetchMutation(api.document.generateUploadUrl, {}, { token });

    // 2. Upload the file to the Convex storage
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload file to Convex: ${response.status} ${errorText}`);
    }

    const { storageId } = await response.json();

let categories: string[] | undefined;
let suggestedRecipients: Id<"users">[] | undefined;

    // 3. Create the document record in Convex with initial empty values
    const documentId = await fetchMutation(
      api.document_crud.createDocument,
      {
        name: name,
        fileId: storageId,
        mimeType: file.type,
        fileSize: file.size,
        classified: classified,
        categories: [], // Initialize with empty array
        aiSuggestedRecipients: [], // Initialize with empty array
      },
      { token }
    );

    if (!documentId) {
      return new Response(JSON.stringify({ error: "Failed to create document" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return early for instant feedback
    const responseBody = JSON.stringify({ documentId });
    const headers = { "Content-Type": "application/json" };
    const initialResponse = new Response(responseBody, { status: 200, headers });

// Asynchronously process and update the document
if (!classified) {
  (async () => {
    let fileContent: FileContent | undefined; // Declare fileContent here
    let processingStatus: "completed" | "failed" = "completed";
    let processingError: string | undefined;

    try {
      fileContent = await getFileContent(arrayBuffer, file.type);
      categories = await getDocCategories(name, fileContent);
    } catch (processingError: any) {
      console.error("Error processing document content or categories:", processingError);
      processingStatus = "failed";
      processingError = processingError.message;
    }

    if (fileContent && processingStatus === "completed") {
      try {
        const allUsers = await fetchQuery(api.users.getAllUsers, {}, { token });
        suggestedRecipients = (await getAiShareSuggestions(
          name,
          fileContent,
          userId,
          allUsers,
        )) as Id<"users">[];
      } catch (suggestionError: any) {
        console.error("Error generating AI share suggestions:", suggestionError);
        processingStatus = "failed";
        processingError = suggestionError.message;
      }
    }

        // Update the document with processing results
        await fetchMutation(
          api.document_crud.updateDocumentProcessingResults, // Now it's a public mutation
          {
            documentId: documentId,
            categories: categories,
            aiSuggestedRecipients: suggestedRecipients,
            status: processingStatus,
            error: processingError,
          },
          { token }
        );
      })();
    }

    return initialResponse;
  } catch (error: any) {
    console.error("Error uploading document:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}