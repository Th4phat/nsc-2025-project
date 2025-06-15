// src/components/DocumentList.tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";

export function DocumentList() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");

  // useQuery automatically fetches the data and updates when it changes.
  const documents = useQuery(api.folders.getDocuments, { category: category ?? undefined });

  // State 1: Loading
  if (documents === undefined) {
    return <div>Loading documents...</div>;
  }
  console.log(documents)
  // State 2: Empty
  if (documents.length === 0) {
    return (
      <div className="mt-8 text-center text-gray-500">
        <p>You don't have any documents yet.</p>
        <p>Upload one to get started!</p>
      </div>
    );
  }

  // State 3: Display documents
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold">Your Documents</h2>
      <ul className="mt-4 space-y-2">
        {documents.map((doc) => (
          <li
            key={doc._id}
            className="flex items-center justify-between rounded-md border p-4"
          >
            <div>
              <p className="font-semibold">{doc.name}</p>
              <p className="text-sm text-gray-600">
                Uploaded on:{" "}
                {new Date(doc._creationTime).toLocaleDateString()}
              </p>
            </div>
            <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium">
              {doc.mimeType}
            </span>
            <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium">
              {doc.status}
            </span>
            {/* We can add a download button here later */}
          </li>
        ))}
      </ul>
    </div>
  );
}
