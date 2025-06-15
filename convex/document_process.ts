"use node";
import { GoogleGenAI, Type } from "@google/genai";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { pdfToText } from "pdf-ts";

if (!process.env.GOOGLE_API_KEY) {
    throw Error("no api key")
}
export const generateAiShareSuggestions = action({
    args: {
        documentId: v.id("documents"),
    },
    returns: v.array(v.id("users")),
    handler: async (ctx, args) => {
        let suggestedUserIds: Id<"users">[] = [];

        try {

            const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY }); // Using @google/genai

            // 1. Fetch document details
            const document = await ctx.runQuery(internal.document._getInternalDocumentDetails, { documentId: args.documentId });

            if (!document) {
                throw new Error("Document not found.");
            }

            const documentUrl = await ctx.storage.getUrl(document.fileId);

            if (!documentUrl) {
                throw new Error("Could not get document URL.");
            }
            // 2. Fetch all users
            // The `getAllUsers` query now returns departmentId as well.
            const allUsers: {
                _id: Id<"users">;
                name?: string;
                email: string;
                department?: {
                    _id: Id<"departments">;
                    name: string;
                    description?: string;
                };
            }[] = await ctx.runQuery(api.users.getAllUsers, {});

            // 3. Craft the prompt
            const userListString = allUsers
                .map(user => {
                    let userInfo = `- User ID: ${user._id}, Name: ${user.name || "N/A"}, Email: ${user.email}`;
                    if (user.department) {
                        userInfo += `, Department: ${user.department.name}`;
                        if (user.department.description) {
                            userInfo += ` (${user.department.description})`;
                        }
                    }
                    return userInfo;
                })
                .join("\n");

            const promptString = `
        Analyze the following document (title and content) and the list of available users.
        Your goal is to suggest a list of User IDs who would be most relevant to share this document with.
        Consider the document's topic, keywords, and purpose.
        Consider the users' names, emails, and department IDs (if available) to infer their roles or areas of interest.
        The document owner (User ID: ${document.ownerId}) should NOT be included in the suggestions.

        Return your suggestions ONLY as a JSON array of strings, where each string is a User ID.
        For example: ["userId1", "userId2", "userId3"]
        If no users are deemed relevant, or if the user list is empty (excluding the owner), return an empty array [].
        Do not include any other text, explanations, or markdown formatting around the JSON array.

        Document Title: ${document.name}

        Document Content: ${documentUrl}

        Available users:
        ${userListString}

        Based on the document and user profiles, provide a JSON array of User IDs to share with:
            `;
            console.log(promptString)
            // 4. Call Google AI API (using @google/genai syntax)
            const modelName = "gemini-2.0-flash"; // Or "gemini-pro"
            const generationResult = await ai.models.generateContent({
                model: modelName,
                contents: promptString, // Pass the crafted prompt string directly
                // generationConfig and safetySettings can be added here if needed,
                // similar to how @google/generative-ai structures them, if @google/genai supports them.
                // For simplicity, keeping it minimal like the `processDocument` example.
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING,
                        },
                    },
                },
            });

            const aiResponseText = generationResult.text;

            // 5. Parse AI Response
            if (typeof aiResponseText !== 'string') {
                console.error("AI response text is undefined or not a string. No suggestions will be made.");
            } else {
                try {
                    // Attempt to extract JSON array from the response.
                    // AI might sometimes include markdown ```json ... ``` or other text.
                    const jsonMatch = aiResponseText.match(/\[[^\]]*\]/);
                    let parsedIds: any[] = [];

                    if (jsonMatch && jsonMatch[0]) {
                        parsedIds = JSON.parse(jsonMatch[0]);
                    } else {
                        // Fallback if no clear array is found, try parsing the whole thing
                        parsedIds = JSON.parse(aiResponseText);
                    }

                    if (Array.isArray(parsedIds) && parsedIds.every(id => typeof id === 'string')) {
                        const validUserIdsFromDB = new Set(allUsers.map(u => u._id));
                        suggestedUserIds = parsedIds
                            .map(id => id as Id<"users">)
                            .filter(id => id !== document.ownerId && validUserIdsFromDB.has(id));
                    } else {
                        console.error("AI response was not a valid JSON array of strings after attempting to parse:", aiResponseText);
                    }
                } catch (parseError: any) { // Catch for JSON parsing errors
                    console.error("Failed to parse AI JSON response:", parseError, "Response text:", aiResponseText);
                }
            }
        } catch (error: any) { // Catch for the main try block (API call, fetching users/doc etc.)
            console.error("Error generating AI share suggestions:", error.message, error.stack);
            // Fallback to empty suggestions in case of any error during the AI call process
            suggestedUserIds = [];
        }

        // 6. Update the document with these suggestions (even if empty due to errors)
        await ctx.runMutation(internal.document.updateAiSuggestions, {
            documentId: args.documentId,
            suggestedUserIds: suggestedUserIds,
        });
        
        return suggestedUserIds;
    },
});

export const processDocument = internalAction({
    args: {
        documentId: v.id("documents"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        let categories: string[] | null = null;
        let errorMsg: string | null = null; // Renamed to avoid conflict
        let status: "completed" | "failed" = "completed";

        try {
            const document = await ctx.runQuery(internal.document._getInternalDocumentDetails, { documentId: args.documentId });

            if (!document) {
                throw new Error("Document not found.");
            }

            const documentUrl = await ctx.storage.getUrl(document.fileId);

            if (!documentUrl) {
                throw new Error("Could not get document URL.");
            }
            const pdf_text = await ctx.runAction(internal.document_process.getBlobContent, {
  fileId: document.fileId,
});
            const prompt = [{
                text: `
**เป้าหมาย:**
วิเคราะห์และจัดหมวดหมู่เอกสารจาก URL ที่ให้มา โดยระบุประเภทเอกสารที่เจาะจงและแม่นยำที่สุด

**คำแนะนำ:**
คุณต้องพิจารณาเนื้อหา โครงสร้าง และวัตถุประสงค์ของเอกสารเพื่อกำหนดหมวดหมู่ที่เหมาะสมที่สุด รายการด้านล่างเป็นเพียงตัวอย่างเพื่อเป็นแนวทางเท่านั้น และคุณไม่ควรถูกจำกัดด้วยรายการนี้

**หมวดหมู่ตัวอย่าง (เพื่อเป็นแนวทางเท่านั้น):**
- "ข่าวประชาสัมพันธ์" (Press Release)
- "รายงานทั่วไป" (General Report)
- "สัญญา / ข้อตกลง" (Contract / Agreement)
- "นโยบาย" (Policy)
- "งบการเงิน" (Financial Statement)
- "เอกสารทางกฎหมาย" (Legal Document)
- "บทความ / บล็อก" (Article / Blog Post)
- "เอกสารทางการตลาด" (Marketing Material)

**คำสั่งในการปฏิบัติ:**
1.  ตรวจสอบเนื้อหาของเอกสารที่ URL
2.  หากเอกสารตรงกับหนึ่งในตัวอย่าง ให้ใช้หมวดหมู่นั้น
3.  **หากไม่มีตัวอย่างใดที่เหมาะสมอย่างยิ่ง ให้สร้างหมวดหมู่ใหม่ที่อธิบายเอกสารได้ดีที่สุด** อย่าพยายามจัดเอกสารให้อยู่ในหมวดหมู่ที่ไม่เหมาะสม

**เอกสารจาก URL:**
${documentUrl}

**เนื้อหา**
${pdf_text ? pdf_text : "no text found"}
`
            }];
            const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
            const result = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING,
                        },
                    },
                },
            })
            console.log(prompt);
            const responseText = result.text;
            

            // Nested try-catch for parsing, specific to this block
            try {
                if (typeof responseText !== 'string') {
                    throw new Error(`AI response was not a string. Response: ${responseText}`);
                }
                const parsedCategories = JSON.parse(responseText);
                if (!Array.isArray(parsedCategories) || !parsedCategories.every(cat => typeof cat === 'string')) {
                    throw new Error("AI response not a valid JSON array of strings.");
                }
                categories = parsedCategories;
            } catch (parseError: any) {
                // This catch is for parsing errors specifically
                console.error("Failed to parse AI response:", parseError);
                status = "failed"; // Mark as failed due to parsing error
                errorMsg = `Failed to parse AI response: ${parseError.message} - Response: ${responseText}`;
            }

        } catch (e: any) { // This is the outer catch for general errors (network, document not found, etc.)
            console.error("Error processing document:", e);
            status = "failed";
            errorMsg = e.message;
        } finally {
            await ctx.runMutation(internal.document_crud.updateDocumentCategoriesAndStatus, {
                documentId: args.documentId,
                categories: categories,
                status: status,
                error: errorMsg,
            });
        }
        return null;
    },
});
export const getBlobContent = internalAction({
  args: {
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.storage.get(args.fileId);
    if (!file) {
      throw new Error("File not found in storage");
    }

    // pdf-ts works directly with an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8buff = new Uint8Array(arrayBuffer)

    // Load the PDF document from the ArrayBuffer
    const texts = await pdfToText(uint8buff);

    

    // Join the text from all pages
    return texts
  },
});