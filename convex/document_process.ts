"use node";
import { GoogleGenAI, Type } from "@google/genai";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { action, internalAction, internalQuery } from "./_generated/server";
import { pdfToText } from "pdf-ts";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { Buffer } from "node:buffer";

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

            const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY })
            const document = await ctx.runQuery(internal.document._getInternalDocumentDetails, { documentId: args.documentId });

            if (!document) {
                throw new Error("Document not found.");
            }
            if (document.classified) {
                return []
            }
            const documentUrl = await ctx.storage.getUrl(document.fileId);

            if (!documentUrl) {
                throw new Error("Could not get document URL.");
            }

            const allUsers: {
                _id: Id<"users">;
                name?: string;
                email: string;
                department?: {
                    _id: Id<"departments">;
                    name: string;
                    description?: string;
                };
                roleName?: string;
                bio?: string;
            }[] = await ctx.runQuery(api.users.getAllUsers, {});

            const userListString = allUsers
                .map(user => {
                    let userInfo = `- User ID: ${user._id}, Name: ${user.name || "N/A"}, Email: ${user.email}`;
                    if (user.department) {
                        userInfo += `, Department: ${user.department.name}`;
                        if (user.department.description) {
                            userInfo += ` (${user.department.description})`;
                        }
                    }
                    if (user.roleName) {
                        userInfo += `, Role: ${user.roleName}`;
                    }
                    if (user.bio) {
                        userInfo += `, Bio: ${user.bio}`;
                    }
                    return userInfo;
                })
                .join("\n");
            const fileContent = await ctx.runAction(internal.document_process.getBlobContent, {
                fileId: document.fileId,
            });

            let contents: (string | { inlineData: { mimeType: string; data: string } })[] = [];
            let promptText: string;

            if (fileContent.type === "text") {
                promptText = `
        Analyze the following document (title and content) and the list of available users.
        Your goal is to suggest a list of User IDs who would be most relevant to share this document with.
        Consider the document's topic, keywords, and purpose.
        Consider the users' names, emails, and department IDs (if available) to infer their roles or areas of interest.
        The document owner (User ID: ${document.ownerId}) should NOT be included in the suggestions.
 
        If no users are deemed relevant, or if the user list is empty (excluding the owner), return nothing.
 
        Document Title: ${document.name}
 
        Document Content:
        ${fileContent.content ? fileContent.content : "no data found"}
 
        Available users:
        ${userListString}
 
        Based on the document and user profiles, provide a JSON array of User IDs to share with:
            `;
                contents.push(promptText);
            } else {
                contents.push({
                    inlineData: {
                        mimeType: fileContent.mimeType,
                        data: fileContent.content,
                    },
                });
                promptText = `
        Analyze the following document (title) and the list of available users.
        Your goal is to suggest a list of User IDs who would be most relevant to share this document with.
        Consider the document's topic, keywords, and purpose.
        Consider the users' names, emails, and department IDs (if available) to infer their roles or areas of interest.
        The document owner (User ID: ${document.ownerId}) should NOT be included in the suggestions.
 
        If no users are deemed relevant, or if the user list is empty (excluding the owner), return an empty array [].
        Do not include any other text, explanations, or markdown formatting around the JSON array.
 
        Document Title: ${document.name}
 
        Available users:
        ${userListString}
 
        Based on the document and user profiles, provide a JSON array of User IDs to share with:
            `;
                contents.push(promptText);
            }

            console.log(promptText);
            const modelName = "gemini-2.5-flash";
            const generationResult = await ai.models.generateContent({
                model: modelName,
                contents: contents,
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

            if (typeof aiResponseText !== 'string') {
                console.error("AI response text is undefined or not a string. No suggestions will be made.");
            } else {
                try {
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
        } catch (error: any) {
            console.error("Error generating AI share suggestions:", error.message, error.stack);
            suggestedUserIds = [];
        }

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
        let errorMsg: string | null = null;
        let status: "completed" | "failed" = "completed";
        try {
            const document = await ctx.runQuery(internal.document._getInternalDocumentDetails, { documentId: args.documentId });
            if (!document) {
                throw new Error("Document not found.");
            }
            if (document.classified) {
                await ctx.runMutation(internal.document_crud.updateDocumentCategoriesAndStatus, {
                    documentId: args.documentId,
                    categories: null,
                    status: "completed",
                    error: null,
                });
                return null;
            }
            const documentUrl = await ctx.storage.getUrl(document.fileId);
            if (!documentUrl) {
                throw new Error("Could not get document URL.");
            }
            const fileContent = await ctx.runAction(internal.document_process.getBlobContent, {
                fileId: document.fileId,
            });

            let promptContents: (string | { inlineData: { mimeType: string; data: string } })[] = [];
            let promptTextForDocProcess: string;

            if (fileContent.type === "text") {
                promptTextForDocProcess = `
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
            ส่งออกเป็นภาษาไทยเท่านั้น ย้ำว่าภาษาไทยเท่านั้น
            **เอกสารจาก URL:**
            ${documentUrl}
            **เนื้อหา**
            ${fileContent.content ? fileContent.content : "no text found"}
            `;
                promptContents.push(promptTextForDocProcess);
            } else { // type === "image"
                promptContents.push({
                    inlineData: {
                        mimeType: fileContent.mimeType,
                        data: fileContent.content,
                    },
                })
                promptTextForDocProcess = `
            **เป้าหมาย:**
            วิเคราะห์และจัดหมวดหมู่เอกสารจากรูปภาพที่ให้มา โดยระบุประเภทเอกสารที่เจาะจงและแม่นยำที่สุด
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
            1.  ตรวจสอบเนื้อหาของเอกสารจากรูปภาพ
            2.  หากเอกสารตรงกับหนึ่งในตัวอย่าง ให้ใช้หมวดหมู่นั้น
            3.  **หากไม่มีตัวอย่างใดที่เหมาะสมอย่างยิ่ง ให้สร้างหมวดหมู่ใหม่ที่อธิบายเอกสารได้ดีที่สุด** อย่าพยายามจัดเอกสารให้อยู่ในหมวดหมู่ที่ไม่เหมาะสม
            ส่งออกเป็นภาษาไทยเท่านั้น ย้ำว่าภาษาไทยเท่านั้น
            `;
                promptContents.push(promptTextForDocProcess);
            }

            const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: promptContents,
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
            console.log(promptTextForDocProcess);
            const responseText = result.text;

            console.log("resp", responseText)
            try {
                if (typeof responseText !== 'string' || !responseText) {
                    throw new Error(`AI response was not a string or was empty. Response: ${responseText}`);
                }
                const parsedCategories = JSON.parse(responseText);
                if (!Array.isArray(parsedCategories) || !parsedCategories.every(cat => typeof cat === 'string')) {
                    throw new Error("AI response not a valid JSON array of strings.");
                }
                categories = parsedCategories;
            } catch (parseError: any) {
                console.error("Failed to parse AI response:", parseError);
                status = "failed";
                errorMsg = `Failed to parse AI response: ${parseError.message} - Response: ${responseText}`;
            }
        } catch (e: any) {
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
    returns: v.union(
        v.object({ type: v.literal("text"), content: v.string() }),
        v.object({ type: v.literal("image"), content: v.string(), mimeType: v.string() }),
    ),
    handler: async (ctx, args): Promise<{ type: "text"; content: string; } | { type: "image"; content: string; mimeType: string; }> => {
        const file = await ctx.storage.get(args.fileId);
        if (!file) {
            throw new Error("File not found in storage");
        }

        const metadata = await ctx.runQuery(internal.document._getFileMetadata, { fileId: args.fileId });
        if (!metadata || !metadata.contentType) {
            throw new Error("File metadata or content type not found");
        }
        const contentType = metadata.contentType;

        const arrayBuffer = await file.arrayBuffer();
        const uint8buff = new Uint8Array(arrayBuffer);

        switch (contentType) {
            case "application/pdf": {
                const texts = await pdfToText(uint8buff);
                return { type: "text", content: texts };
            }
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
                const { value: text } = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                return { type: "text", content: text };
            }
            case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
                const workbook = XLSX.read(uint8buff, { type: "array" });
                let fullText = "";
                workbook.SheetNames.forEach((sheetName) => {
                    const sheet = workbook.Sheets[sheetName];
                    fullText += XLSX.utils.sheet_to_txt(sheet);
                });
                return { type: "text", content: fullText };
            }
            case "application/vnd.ms-excel":
                return { type: "text", content: "nooooo" };
            case "image/jpeg":
                const b64data = Buffer.from(uint8buff).toString("base64");
                return { type: "image" as const, content: b64data, mimeType: contentType };
            
            case "image/png": 
                const base64 = Buffer.from(uint8buff).toString("base64");
                return { type: "image" as const, content: base64, mimeType: contentType };
            
            default:
                throw new Error(`Unsupported content type: ${contentType}`);
        }
    },
});
