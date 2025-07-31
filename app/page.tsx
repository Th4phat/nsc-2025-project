// "use client";
// import { useConvexAuth } from "convex/react";
// import { useState } from "react";

// export default function DocumentUploader() {
//   const { isAuthenticated } = useConvexAuth();
//   const [isUploading, setIsUploading] = useState(false);
//   const [uploadStatus, setUploadStatus] = useState("");
//   const [documentName, setDocumentName] = useState("");
//   const [isClassified, setIsClassified] = useState(false);

//   async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
//     const file = event.target.files?.[0];
//     if (!file) return;

//     setIsUploading(true);
//     setUploadStatus("Uploading...");

//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("name", documentName || file.name);
//     formData.append("classified", String(isClassified));

//     try {
//       const response = await fetch("/api/upload", {
//         method: "POST",
//         body: formData,
//       });

//       if (response.ok) {
//         const data = await response.json();
//         setUploadStatus(`Upload successful! Document ID: ${data.documentId}`);
//         setDocumentName(""); // Clear name field
//         setIsClassified(false); // Reset classified checkbox
//         event.target.value = ""; // Clear file input
//       } else {
//         const errorData = await response.json();
//         setUploadStatus(`Upload failed: ${errorData.error || response.statusText}`);
//       }
//     } catch (error: any) {
//       setUploadStatus(`Upload error: ${error.message}`);
//     } finally {
//       setIsUploading(false);
//     }
//   }

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
//       <h1 className="text-3xl font-bold mb-6">Document Uploader Test Page</h1>
//       {isAuthenticated ? (
//         <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
//           <div className="mb-4">
//             <label htmlFor="documentName" className="block text-gray-700 text-sm font-bold mb-2">
//               Document Name (Optional):
//             </label>
//             <input
//               type="text"
//               id="documentName"
//               value={documentName}
//               onChange={(e) => setDocumentName(e.target.value)}
//               className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
//               placeholder="Enter document name"
//             />
//           </div>
//           <div className="mb-4 flex items-center">
//             <input
//               type="checkbox"
//               id="isClassified"
//               checked={isClassified}
//               onChange={(e) => setIsClassified(e.target.checked)}
//               className="mr-2 leading-tight"
//             />
//             <label htmlFor="isClassified" className="text-sm text-gray-700">
//               Classified Document
//             </label>
//           </div>
//           <div className="mb-4">
//             <label htmlFor="fileInput" className="block text-gray-700 text-sm font-bold mb-2">
//               Select Document:
//             </label>
//             <input
//               id="fileInput"
//               type="file"
//               onChange={handleUpload}
//               disabled={isUploading}
//               className="block w-full text-sm text-gray-500
//                 file:mr-4 file:py-2 file:px-4
//                 file:rounded-full file:border-0
//                 file:text-sm file:font-semibold
//                 file:bg-blue-50 file:text-blue-700
//                 hover:file:bg-blue-100"
//             />
//           </div>
//           {isUploading && (
//             <p className="text-blue-500 text-center">Uploading... Please wait.</p>
//           )}
//           {uploadStatus && (
//             <p className={`text-center mt-4 ${uploadStatus.includes("failed") || uploadStatus.includes("error") ? "text-red-500" : "text-green-500"}`}>
//               {uploadStatus}
//             </p>
//           )}
//           <div className="mt-6 text-center">
//             <a href="/dashboard" className="text-blue-500 hover:underline">Go to Dashboard</a>
//           </div>
//         </div>
//       ) : (
//         <p className="text-lg text-gray-600">Please sign in to upload documents.</p>
//       )}
//     </div>
//   );
// }
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">ยินดีต้อนรับ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <Link href="/dashboard" passHref>
            <Button className="w-full">ไปที่แดชบอร์ด</Button>
          </Link>
          <Link href="/manage-folders" passHref>
            <Button className="w-full">จัดการโฟลเดอร์</Button>
          </Link>
          <Link href="/manage-user" passHref>
            <Button className="w-full">จัดการผู้ใช้</Button>
          </Link>
          <Link href="/signin" passHref>
            <Button className="w-full">ลงชื่อเข้าใช้</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}