import { PDFiumLibrary } from "@hyzyla/pdfium";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { Buffer } from "node:buffer";
import { GoogleGenAI, Type } from "@google/genai";
import { pdfToText } from "pdf-ts";

export type FileContent =
  | { type: "text"; content: string }
  | { type: "image"; content: string; mimeType: string };

export async function getFileContent(
  file: File,
): Promise<FileContent> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8buff = new Uint8Array(arrayBuffer);
  const contentType = file.type;

  switch (contentType) {
    // case "application/pdf": {
    //   const library = await PDFiumLibrary.init();
    //   const document = await library.loadDocument(uint8buff);
    //   const page = document.getPage(0); // Get the first page
    //   const image = await page.render({
    //     scale: 2,
    //     render: 'bitmap',
    //   });
    //   document.destroy(); // Release resources
    //   const b64data = Buffer.from(image.data).toString("base64");
    //   return { type: "image", content: b64data, mimeType: "image/png" };
    // }
    case "application/pdf": {
      // Assuming pdfToText accepts a Uint8Array or Buffer
      const uint8buff = new Uint8Array(arrayBuffer);
      const texts = await pdfToText(uint8buff);
      const cleanedTexts = texts.replace(/[\x00-\x1F\x7F]/g, "");
      const normalizedTexts = cleanedTexts.normalize("NFC");
      return { type: "text", content: normalizedTexts };
    }
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      // Convert the ArrayBuffer to a Node.js Buffer
      const docxBuffer = Buffer.from(arrayBuffer);

      const { value: text } = await mammoth.extractRawText({
        // Use the 'buffer' property instead of 'arrayBuffer'
        buffer: docxBuffer,
      });
      console.log("extracted docx", text)
      return { type: "text", content: text };
    }
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      const workbook = XLSX.read(uint8buff, { type: "array" });
      let fullText = "";
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        fullText += XLSX.utils.sheet_to_txt(sheet);
      })
      console.log("extracted xlsx", fullText)
      return { type: "text", content: fullText };
    }
    case "image/jpeg":
    case "image/png": {
      const b64data = Buffer.from(uint8buff).toString("base64");
      return { type: "image", content: b64data, mimeType: contentType };
    }
    default:
      throw new Error(`Unsupported content type: ${contentType}`);
  }
}

export async function getDocCategories(
  documentName: string,
  fileContent: FileContent,
): Promise<string[]> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
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
            **เอกสารชื่อ:**
            ${documentName}
            **เนื้อหา**
            ${fileContent.content ? fileContent.content : "no text found"}
            `;
    promptContents.push(promptTextForDocProcess);
  } else {
    // type === "image"
    promptContents.push({
      inlineData: {
        mimeType: fileContent.mimeType,
        data: fileContent.content,
      },
    });
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
            **เอกสารชื่อ:**
            ${documentName}
            `;
    promptContents.push(promptTextForDocProcess);
  }

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

  const responseText = result.text;
  if (typeof responseText !== "string" || !responseText) {
    throw new Error(`AI response was not a string or was empty. Response: ${responseText}`);
  }

  const parsedCategories = JSON.parse(responseText);
  if (!Array.isArray(parsedCategories) || !parsedCategories.every((cat) => typeof cat === "string")) {
    throw new Error("AI response not a valid JSON array of strings.");
  }

  return parsedCategories;
}

export async function getAiShareSuggestions(
  documentName: string,
  fileContent: FileContent,
  ownerId: string,
  allUsers: Array<{
    _id: string;
    name?: string;
    email: string;
    department?: {
      _id: string;
      name: string;
      description?: string;
    };
    roleName?: string;
    bio?: string;
  }>,
): Promise<string[]> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
  let suggestedUserIds: string[] = [];

  const userListString = allUsers
    .map((user) => {
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

  let contents: (string | { inlineData: { mimeType: string; data: string } })[] = [];
  let promptText: string;

  if (fileContent.type === "text") {
    promptText = `
        Analyze the following document (title and content) and the list of available users.
        Your goal is to suggest a list of User IDs who would be most relevant to share this document with.
        Consider the document's topic, keywords, and purpose.
        Consider the users' names, emails, and department IDs (if available) to infer their roles or areas of interest.
        The document owner (User ID: ${ownerId}) should NOT be included in the suggestions.
 
        If no users are deemed relevant, or if the user list is empty (excluding the owner), return nothing.
 
        Document Title: ${documentName}
 
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
        The document owner (User ID: ${ownerId}) should NOT be included in the suggestions.
 
        If no users are deemed relevant, or if the user list is empty (excluding the owner), return an empty array [].
        Do not include any other text, explanations, or markdown formatting around the JSON array.
 
        Document Title: ${documentName}
 
        Available users:
        ${userListString}
 
        Based on the document and user profiles, provide a JSON array of User IDs to share with:
            `;
    contents.push(promptText);
  }

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

  if (typeof aiResponseText !== "string") {
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

      if (Array.isArray(parsedIds) && parsedIds.every((id) => typeof id === "string")) {
        const validUserIdsFromInput = new Set(allUsers.map((u) => u._id));
        suggestedUserIds = parsedIds.filter(
          (id) => id !== ownerId && validUserIdsFromInput.has(id),
        );
      } else {
        console.error(
          "AI response was not a valid JSON array of strings after attempting to parse:",
          aiResponseText,
        );
      }
    } catch (parseError: any) {
      // Catch for JSON parsing errors
      console.error("Failed to parse AI JSON response:", parseError, "Response text:", aiResponseText);
    }
  }

  return suggestedUserIds;
}