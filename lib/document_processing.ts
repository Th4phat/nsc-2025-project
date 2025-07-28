import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { Buffer } from "node:buffer";
import { GoogleGenAI, Type } from "@google/genai";
import { pdfToText } from "pdf-ts";

// Types
export type FileContent =
  | { type: "text"; content: string }
  | { type: "image"; content: string; mimeType: string }
  | { type: "pdf"; textContent: string; imageData: string; mimeType: string };

type User = {
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
};

// Constants
const SUPPORTED_MIME_TYPES = {
  PDF: "application/pdf",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  JPEG: "image/jpeg",
  PNG: "image/png",
} as const;

const AI_MODEL = "gemini-2.5-flash";

const DOCUMENT_CATEGORIES = [
  "ข่าวประชาสัมพันธ์ (Press Release)",
  "รายงานทั่วไป (General Report)",
  "สัญญา / ข้อตกลง (Contract / Agreement)",
  "นโยบาย (Policy)",
  "งบการเงิน (Financial Statement)",
  "เอกสารทางกฎหมาย (Legal Document)",
  "บทความ / บล็อก (Article / Blog Post)",
  "เอกสารทางการตลาด (Marketing Material)",
];

// Helper Functions
function getAiClient(): GoogleGenAI {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set.");
  }
  return new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
}

function sanitizeText(text: string): string {
  return text.replace(/[\x00-\x1F\x7F]/g, "").normalize("NFC");
}

async function extractTextFromPdf(buffer: Uint8Array): Promise<string> {
  try {
    const texts = await pdfToText(buffer);
    return sanitizeText(texts);
  } catch (error) {
    console.warn("Failed to extract text from PDF:", error);
    return "";
  }
}

async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  const docxBuffer = Buffer.from(buffer);
  const { value: text } = await mammoth.extractRawText({ buffer: docxBuffer });
  console.log("extracted docx", text);
  return text;
}

function extractTextFromXlsx(buffer: Uint8Array): string {
  const workbook = XLSX.read(buffer, { type: "array" });
  let fullText = "";
  
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    fullText += XLSX.utils.sheet_to_txt(sheet);
  });
  
  console.log("extracted xlsx", fullText);
  return fullText;
}

function convertToBase64(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString("base64");
}

// Content Processors
async function processPdf(buffer: Uint8Array): Promise<FileContent> {
  const textContent = await extractTextFromPdf(buffer);
  const imageData = convertToBase64(buffer);
  
  return {
    type: "pdf",
    textContent,
    imageData,
    mimeType: SUPPORTED_MIME_TYPES.PDF,
  };
}

async function processDocx(buffer: ArrayBuffer): Promise<FileContent> {
  const content = await extractTextFromDocx(buffer);
  return { type: "text", content };
}

function processXlsx(buffer: Uint8Array): FileContent {
  const content = extractTextFromXlsx(buffer);
  return { type: "text", content };
}

function processImage(buffer: Uint8Array, mimeType: string): FileContent {
  const content = convertToBase64(buffer);
  return { type: "image", content, mimeType };
}

// Prompt Generators
function createCategoriesPromptBase(): string {
  const categoriesText = DOCUMENT_CATEGORIES.map(cat => `- "${cat}"`).join('\n');
  
  return `
    **เป้าหมาย:**
    วิเคราะห์และจัดหมวดหมู่เอกสารที่ให้มา โดยระบุประเภทเอกสารที่เจาะจงและแม่นยำที่สุด
    
    **คำแนะนำ:**
    คุณต้องพิจารณาเนื้อหา โครงสร้าง และวัตถุประสงค์ของเอกสารเพื่อกำหนดหมวดหมู่ที่เหมาะสมที่สุด รายการด้านล่างเป็นเพียงตัวอย่างเพื่อเป็นแนวทางเท่านั้น และคุณไม่ควรถูกจำกัดด้วยรายการนี้
    
    **หมวดหมู่ตัวอย่าง (เพื่อเป็นแนวทางเท่านั้น):**
    ${categoriesText}
    
    **คำสั่งในการปฏิบัติ:**
    1. ตรวจสอบเนื้อหาของเอกสาร
    2. หากเอกสารตรงกับหนึ่งในตัวอย่าง ให้ใช้หมวดหมู่นั้น
    3. **หากไม่มีตัวอย่างใดที่เหมาะสมอย่างยิ่ง ให้สร้างหมวดหมู่ใหม่ที่อธิบายเอกสารได้ดีที่สุด** อย่าพยายามจัดเอกสารให้อยู่ในหมวดหมู่ที่ไม่เหมาะสม
    
    ส่งออกเป็นภาษาไทยเท่านั้น ย้ำว่าภาษาไทยเท่านั้น
  `;
}

function createCategoriesPrompt(documentName: string, fileContent: FileContent): string {
  const base = createCategoriesPromptBase();
  
  let specificContent = `**เอกสารชื่อ:** ${documentName}`;
  
  if (fileContent.type === "text") {
    specificContent += `\n**เนื้อหา:** ${fileContent.content || "no text found"}`;
  } else if (fileContent.type === "pdf") {
    specificContent += `\n**เนื้อหาข้อความที่สกัดได้:** ${fileContent.textContent || "no text found"}`;
  }
  
  return base + "\n" + specificContent;
}

function createUserListString(users: User[]): string {
  return users
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
}

function createShareSuggestionsPrompt(
  documentName: string,
  fileContent: FileContent,
  ownerId: string,
  userListString: string
): string {
  const basePrompt = `
    Analyze the following document and the list of available users.
    Your goal is to suggest a list of User IDs who would be most relevant to share this document with.
    Consider the document's topic, keywords, and purpose.
    Consider the users' names, emails, and department IDs (if available) to infer their roles or areas of interest.
    The document owner (User ID: ${ownerId}) should NOT be included in the suggestions.

    If no users are deemed relevant, or if the user list is empty (excluding the owner), return nothing.

    Document Title: ${documentName}
  `;

  let contentSection = "";
  if (fileContent.type === "text") {
    contentSection = `\nDocument Content:\n${fileContent.content || "no data found"}`;
  } else if (fileContent.type === "pdf") {
    contentSection = `\nDocument Content (extracted text):\n${fileContent.textContent || "no text found"}`;
  }

  const userSection = `\nAvailable users:\n${userListString}`;
  const instruction = "\nBased on the document and user profiles, provide a JSON array of User IDs to share with:";

  return basePrompt + contentSection + userSection + instruction;
}

// AI Response Handlers
function parseStringArray(responseText: string): string[] {
  if (!responseText) {
    throw new Error("AI response was empty");
  }

  const parsed = JSON.parse(responseText);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("AI response not a valid JSON array of strings.");
  }

  return parsed;
}

function parseUserSuggestions(responseText: string, allUsers: User[], ownerId: string): string[] {
  if (!responseText) {
    console.error("AI response text is undefined or empty. No suggestions will be made.");
    return [];
  }

  try {
    // Try to find JSON array in response
    const jsonMatch = responseText.match(/\[[^\]]*\]/);
    let parsedIds: any[] = [];

    if (jsonMatch?.[0]) {
      parsedIds = JSON.parse(jsonMatch[0]);
    } else {
      parsedIds = JSON.parse(responseText);
    }

    if (Array.isArray(parsedIds) && parsedIds.every((id) => typeof id === "string")) {
      const validUserIds = new Set(allUsers.map((u) => u._id));
      return parsedIds.filter((id) => id !== ownerId && validUserIds.has(id));
    } else {
      console.error("AI response was not a valid JSON array of strings:", responseText);
      return [];
    }
  } catch (parseError) {
    console.error("Failed to parse AI JSON response:", parseError, "Response text:", responseText);
    return [];
  }
}

// Main Functions
export async function getFileContent(
  arrayBuffer: ArrayBuffer,
  mimeType: string
): Promise<FileContent> {
  const uint8buff = new Uint8Array(arrayBuffer);

  switch (mimeType) {
    case SUPPORTED_MIME_TYPES.PDF:
      return processPdf(uint8buff);
    
    case SUPPORTED_MIME_TYPES.DOCX:
      return processDocx(arrayBuffer);
    
    case SUPPORTED_MIME_TYPES.XLSX:
      return processXlsx(uint8buff);
    
    case SUPPORTED_MIME_TYPES.JPEG:
    case SUPPORTED_MIME_TYPES.PNG:
      return processImage(uint8buff, mimeType);
    
    default:
      throw new Error(`Unsupported content type: ${mimeType}`);
  }
}

export async function getDocCategories(
  documentName: string,
  fileContent: FileContent
): Promise<string[]> {
  const ai = getAiClient();
  const promptText = createCategoriesPrompt(documentName, fileContent);
  
  let contents: (string | { inlineData: { mimeType: string; data: string } })[] = [];

  // Add image data if available
  if (fileContent.type === "pdf") {
    contents.push({
      inlineData: {
        mimeType: fileContent.mimeType,
        data: fileContent.imageData,
      },
    });
  } else if (fileContent.type === "image") {
    contents.push({
      inlineData: {
        mimeType: fileContent.mimeType,
        data: fileContent.content,
      },
    });
  }

  contents.push(promptText);

  const result = await ai.models.generateContent({
    model: AI_MODEL,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });

  return parseStringArray(result.text!);
}

export async function getAiShareSuggestions(
  documentName: string,
  fileContent: FileContent,
  ownerId: string,
  allUsers: User[]
): Promise<string[]> {
  const ai = getAiClient();
  const userListString = createUserListString(allUsers);
  const promptText = createShareSuggestionsPrompt(documentName, fileContent, ownerId, userListString);
  
  let contents: (string | { inlineData: { mimeType: string; data: string } })[] = [];

  // Add image data if available
  if (fileContent.type === "pdf") {
    contents.push({
      inlineData: {
        mimeType: fileContent.mimeType,
        data: fileContent.imageData,
      },
    });
  } else if (fileContent.type === "image") {
    contents.push({
      inlineData: {
        mimeType: fileContent.mimeType,
        data: fileContent.content,
      },
    });
  }

  contents.push(promptText);
  console.log(promptText);

  const result = await ai.models.generateContent({
    model: AI_MODEL,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });

  return parseUserSuggestions(result.text!, allUsers, ownerId);
}