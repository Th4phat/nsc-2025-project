import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { Buffer } from "node:buffer";
import { GoogleGenAI, Type } from "@google/genai";
import { pdfToText, pdfToPages } from "pdf-ts";

export type Department = {
  _id: string;
  name: string;
  description?: string;
};

export type User = {
  _id: string;
  name?: string;
  email: string;
  department?: Department;
  roleName?: string;
  bio?: string;
};

export type FileContent =
  | { type: "text"; content: string }
  | {
    type: "image";
    content: string;
    mimeType: SupportedMimeTypeImage;
  }
  | {
    type: "pdf";
    textContent: string;
    imageData: string;
    mimeType: SupportedMimeType.PDF;
  };

export const SUPPORTED_MIME_TYPES = {
  PDF: "application/pdf",
  DOCX:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  XLSX:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  JPEG: "image/jpeg",
  PNG: "image/png",
} as const;


export type SupportedMimeTypeImage =
  | (typeof SUPPORTED_MIME_TYPES)["JPEG"]
  | (typeof SUPPORTED_MIME_TYPES)["PNG"];

export const enum SupportedMimeType {
  PDF = "application/pdf",
  DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  JPEG = "image/jpeg",
  PNG = "image/png",
}

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
] as const;




function normalizeToBuffer(input: ArrayBuffer | Uint8Array | Buffer): Buffer {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);

  return Buffer.from(new Uint8Array(input));
}


export function sanitizeText(text: string): string {
  return text.replace(/[\x00-\x1F\x7F]/g, "").normalize("NFC");
}

/**
 * Clean OCR / AI returned text to plain text:
 * - If input is JSON containing `natural_text` or `text`, extract those.
 * - Strip HTML tags, Markdown constructs (headers, lists, code fences, links),
 *   table pipes, and excessive punctuation used as separators.
 * - Normalize whitespace and return sanitized plain text.
 */
export function cleanOcrText(text: string): string {
  if (!text) return "";
  let t = String(text);



  try {
    const maybe = JSON.parse(t);
    if (maybe && typeof maybe === "object") {
      if (typeof (maybe as any).natural_text === "string") {
        t = (maybe as any).natural_text;
      } else if (typeof (maybe as any).text === "string") {
        t = (maybe as any).text;
      }
    }
  } catch {

  }


  t = t.replace(/<style[\s\S]*?<\/style>/gi, " ");
  t = t.replace(/<script[\s\S]*?<\/script>/gi, " ");
  t = t.replace(/<\/?[^>]+(>|$)/g, " ");


  t = t.replace(/```[\s\S]*?```/g, " ");
  t = t.replace(/`[^`]*`/g, " ");


  t = t.replace(/!\[.*?\]\(.*?\)/g, " ");
  t = t.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1");



  t = t.replace(/^#{1,6}\s*/gm, " ");
  t = t.replace(/(\*\*|__)(.*?)\1/g, "$2");
  t = t.replace(/(\*|_)(.*?)\1/g, "$2");


  t = t.replace(/^\s*\|/gm, " ");
  t = t.replace(/\|/g, " ");


  t = t.replace(/^[\s]*[-*+]\s+/gm, " ");
  t = t.replace(/^[\s]*\d+\.\s+/gm, " ");


  t = t.replace(/[-=_]{3,}/g, " ");


  t = t.replace(/&nbsp;|&|<|>|"|'/g, (s) => {
    switch (s) {
      case "&nbsp;":
        return " ";
      case "&":
        return "&";
      case "<":
        return "<";
      case ">":
        return ">";
      case '"':
        return '"';
      case "'":
        return "'";
      default:
        return s;
    }
  });


  t = t.replace(/\r\n?/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.replace(/\n[ \t]+/g, "\n");
  t = t.replace(/[ \t]+\n/g, "\n");


  t = t.trim();

  return sanitizeText(t);
}



function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const TEXT_KEYS = new Set([
  "natural_text",
  "text",
  "plaintext",
  "raw_text",
  "caption",
  "value",
]);

const CONTAINER_KEYS = new Set([
  "pages",
  "blocks",
  "elements",
  "lines",
  "spans",
  "paragraphs",
  "items",
  "content",
  "segments",
  "regions",
  "children",
]);

/**
 * Recursively collect text-like fields from arbitrary OCR JSON.
 * Heuristic: only gather known text keys, and recurse into common container
 * keys to avoid collecting irrelevant strings.
 */
function collectTextFromOcrJson(
  node: unknown,
  out: string[]
): void {
  if (!node) return;

  if (typeof node === "string") {
    if (node.trim()) out.push(node);
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) collectTextFromOcrJson(item, out);
    return;
  }

  if (!isPlainObject(node)) return;

  for (const [k, v] of Object.entries(node)) {
    if (TEXT_KEYS.has(k) && typeof v === "string" && v.trim()) {
      out.push(v);
    } else if (CONTAINER_KEYS.has(k)) {
      collectTextFromOcrJson(v, out);
    } else if (isPlainObject(v)) {


      collectTextFromOcrJson(v, out);
    } else if (Array.isArray(v)) {
      collectTextFromOcrJson(v, out);
    }
  }
}

/**
 * Try to parse Typhoon's message content into an array of strings representing
 * page-ordered text. Handles:
 * - Raw string
 * - JSON with { natural_text }, { text }, or { pages: [...] }
 * - Nested structures (blocks/paragraphs/lines/spans)
 */
function extractTextsFromTyphoonContent(
  content: unknown
): string[] {
  const texts: string[] = [];

  const pushClean = (s: string) => {
    const cleaned = cleanOcrText(s);
    if (cleaned) texts.push(cleaned);
  };

  if (typeof content === "string") {

    const raw = content.trim();
    try {
      const parsed = JSON.parse(raw);
      const collected: string[] = [];

      if (isPlainObject(parsed) && Array.isArray((parsed as any).pages)) {
        for (const page of (parsed as any).pages) {
          const pageTexts: string[] = [];
          collectTextFromOcrJson(page, pageTexts);
          if (pageTexts.length) pushClean(pageTexts.join("\n"));
        }
        return texts;
      }
      collectTextFromOcrJson(parsed, collected);
      if (collected.length) {
        pushClean(collected.join("\n"));
        return texts;
      }
    } catch {

      if (raw) pushClean(raw);
      return texts;
    }
  } else if (Array.isArray(content)) {
    for (const part of content) {
      if (typeof part === "string") {
        pushClean(part);
      } else if (isPlainObject(part) && "text" in part) {
        const t = (part as any).text;
        if (typeof t === "string") pushClean(t);
      } else {
        const collected: string[] = [];
        collectTextFromOcrJson(part, collected);
        if (collected.length) pushClean(collected.join("\n"));
      }
    }
  } else if (isPlainObject(content)) {
    const collected: string[] = [];
    collectTextFromOcrJson(content, collected);
    if (collected.length) pushClean(collected.join("\n"));
  }

  return texts;
}



/**
 * Extract plain text from PDF with OCR-first strategy:
 * 1) Try OCR via Typhoon (if OPENTYPHOON_API_KEY available).
 * 2) If OCR yields nothing, fallback to pdfToPages/pdfToText.
 */
async function extractTextFromPdf(buffer: Uint8Array): Promise<string> {
  try {

    try {
      const ocr = await ocrExtractFromBuffer(
        buffer,
        SupportedMimeType.PDF
      );
      const ocrClean = sanitizeText(ocr || "");
      if (ocrClean.trim().length > 0) {
        return ocrClean;
      }
    } catch (ocrErr) {
      console.warn("extractTextFromPdf: OCR-first failed", ocrErr);

    }


    try {
      const pages = await pdfToPages(buffer);
      if (Array.isArray(pages) && pages.length > 0) {
        const joined = pages
          .map((p) => (p && typeof p.text === "string" ? p.text : ""))
          .join("\n\n");
        const cleaned = sanitizeText(joined || "");
        if (cleaned.trim().length > 0) {
          return cleaned;
        }
      }
    } catch (pageErr) {
      console.warn("extractTextFromPdf: pdfToPages failed", pageErr);
    }


    try {
      const texts = await pdfToText(buffer);
      const cleanedTexts = sanitizeText(texts || "");
      if (cleanedTexts.trim().length > 0) {
        return cleanedTexts;
      }
    } catch (txtErr) {
      console.warn("extractTextFromPdf: pdfToText failed", txtErr);
    }


    return "";
  } catch (err) {
    console.warn("extractTextFromPdf: failed to parse PDF", err);
    return "";
  }
}


async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  try {
    const docxBuffer = normalizeToBuffer(buffer);
    const { value: text } = await mammoth.extractRawText({
      buffer: docxBuffer,
    });
    return sanitizeText(text || "");
  } catch (err) {
    console.warn("extractTextFromDocx: mammoth failed", err);
    return "";
  }
}


function extractTextFromXlsx(buffer: Uint8Array): string {
  try {
    const workbook = XLSX.read(buffer, { type: "array" });
    const texts: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      texts.push(XLSX.utils.sheet_to_txt(sheet));
    }
    const full = texts.join("\n");
    return sanitizeText(full);
  } catch (err) {
    console.warn("extractTextFromXlsx: failed to parse workbook", err);
    return "";
  }
}


function convertToBase64(
  buffer: Uint8Array | Buffer | ArrayBuffer
): string {
  const buf = normalizeToBuffer(
    buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : (buffer as Buffer | Uint8Array)
  );
  return buf.toString("base64");
}


/**
 * Perform OCR using Typhoon (opentyphoon.ai) when API key is available.
 * Now robustly aggregates text from all pages and nested structures.
 * Returns joined text or empty string on failure.
 */
async function ocrExtractFromBuffer(
  buffer: Uint8Array | Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.OPENTYPHOON_API_KEY;
  if (!apiKey) {

    console.info(
      "ocrExtractFromBuffer: OPENTYPHOON_API_KEY not set; skipping OCR"
    );
    return "";
  }

  try {
    const formData = new FormData();


    const rawUint8 =
      Buffer.isBuffer(buffer)
        ? new Uint8Array(buffer)
        : buffer instanceof Uint8Array
          ? buffer
          : new Uint8Array(buffer as ArrayBuffer);


    const uint8 = Uint8Array.from(rawUint8);
    const blob = new Blob([uint8], { type: mimeType });

    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/tiff": "tiff",
      "image/tif": "tiff",
      "image/bmp": "bmp",
      "application/pdf": "pdf",
    };
    const ext = mimeToExt[mimeType] || "bin";
    const filename = `upload.${ext}`;

    formData.append("file", blob, filename);

    const params = {
      model: "typhoon-ocr-preview",
      task_type: "structure",
      max_tokens: 16000,
      temperature: 0.1,
      top_p: 0.6,
      repetition_penalty: 1.2,
    };
    formData.append("params", JSON.stringify(params));

    const response = await fetch(
      "https://api.opentyphoon.ai/v1/ocr",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn(
        "ocrExtractFromBuffer: Typhoon OCR request failed",
        response.status,
        errText
      );
      return "";
    }

    const result = await response.json();
    const extractedTexts: string[] = [];

    const consumeContent = (content: unknown) => {
      const parts = extractTextsFromTyphoonContent(content);
      for (const p of parts) {
        if (p) extractedTexts.push(p);
      }
    };



    if (Array.isArray(result?.results)) {
      for (const item of result.results) {
        if (item?.success && item?.message) {
          const choices =
            item.message.choices ??
            item.message?.output?.choices ??
            [];
          if (Array.isArray(choices) && choices.length > 0) {
            for (const ch of choices) {
              const content = ch?.message?.content ?? ch?.content;
              if (content !== undefined) consumeContent(content);
            }
          } else {
            const content =
              item.message?.content ??
              item.message?.message?.content ??
              "";
            consumeContent(content);
          }
        } else if (item && !item.success) {
          console.warn(
            "ocrExtractFromBuffer: page error",
            item.filename || "unknown",
            item.error || ""
          );
        }
      }
    } else if (result?.message || result?.choices) {

      const choices =
        result.message?.choices ?? result?.choices ?? [];
      if (Array.isArray(choices) && choices.length > 0) {
        for (const ch of choices) {
          const content = ch?.message?.content ?? ch?.content;
          if (content !== undefined) consumeContent(content);
        }
      } else {
        const content =
          result?.message?.content ??
          result?.message?.message?.content ??
          "";
        consumeContent(content);
      }
    } else {

      consumeContent(result);
    }

    return extractedTexts.join("\n");
  } catch (err) {
    console.error("ocrExtractFromBuffer: network or parsing error", err);
    return "";
  }
}



async function processPdf(buffer: Uint8Array): Promise<FileContent> {

  const textContent = (await extractTextFromPdf(buffer)) || "";
  const finalText = sanitizeText(textContent || "");
  const imageData = convertToBase64(buffer);

  return {
    type: "pdf",
    textContent: finalText,
    imageData,
    mimeType: SupportedMimeType.PDF,
  };
}

async function processDocx(buffer: ArrayBuffer): Promise<FileContent> {
  const content = await extractTextFromDocx(buffer);
  return { type: "text", content: content || "" };
}

function processXlsx(buffer: Uint8Array): FileContent {
  const content = extractTextFromXlsx(buffer);
  return { type: "text", content: content || "" };
}

function processImage(
  buffer: Uint8Array,
  mimeType: SupportedMimeTypeImage
): FileContent {
  const content = convertToBase64(buffer);
  return { type: "image", content, mimeType };
}




function getAiClient(): GoogleGenAI {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set.");
  }
  return new GoogleGenAI({ apiKey: key });
}



function createCategoriesPromptBase() {
  const categoriesText = Array.from(DOCUMENT_CATEGORIES)
    .map((category) => `- "${category}"`)
    .join("\n");

  return `
Objective:
Analyze the provided document and assign it the single most specific and accurate category.

Sample Categories (for reference only):
${categoriesText}

Instructions:
1. Examine the document's content, structure, and purpose.
2. If it clearly fits one of the sample categories, choose that category.
3. If no sample category applies, create a new category that best describes the document.
4. Do not force the document into an ill-fitting category.

Response Format:
- Output only in Thai.
- Provide the final category name (in Thai) with no additional explanation.
`
}

function createCategoriesPrompt(
  documentName: string,
  fileContent: FileContent
): string {
  const base = createCategoriesPromptBase();
  let specificContent = `**เอกสารชื่อ:** ${documentName}`;

  if (fileContent.type === "text") {
    specificContent += `\n**เนื้อหา:** ${fileContent.content || "no text found"
      }`;
  } else if (fileContent.type === "pdf") {
    specificContent += `\n**เนื้อหาข้อความที่สกัดได้:** ${fileContent.textContent || "no text found"
      }`;
  } else {
    specificContent += `\n**หมายเหตุ:** Binary content (image) — no extractable text`;
  }

  return `${base}\n\n${specificContent}`;
}

function createUserListString(users: User[]): string {
  return users
    .map((user) => {
      const parts: string[] = [];
      parts.push(`- User ID: ${user._id}`);
      parts.push(`Name: ${user.name ?? "N/A"}`);
      parts.push(`Email: ${user.email}`);
      if (user.department)
        parts.push(
          `Department: ${user.department.name}${user.department.description
            ? ` (${user.department.description})`
            : ""
          }`
        );
      if (user.roleName) parts.push(`Role: ${user.roleName}`);
      if (user.bio) parts.push(`Bio: ${user.bio}`);
      return parts.join(", ");
    })
    .join("\n");
}

function createShareSuggestionsPrompt(
  documentName: string,
  fileContent: FileContent,
  ownerId: string,
  userListString: string
): string {
  const base = `Analyze the following document and the list of available users.
Your goal is to suggest a JSON array of User IDs who would be most relevant to share this document with.
Do not include the document owner (User ID: ${ownerId}). If content is insufficient, return an empty JSON array.`;
  let contentSection = "";

  if (fileContent.type === "text") {
    contentSection = `\n\nDocument Content:\n${fileContent.content || "no data found"
      }`;
  } else if (fileContent.type === "pdf") {
    contentSection = `\n\nDocument Content (extracted text):\n${fileContent.textContent ||
      "no text found, this is probably scanned pdf"
      }`;
  } else {
    contentSection = `\n\nDocument is an image (binary). No extracted text available.`;
  }

  const userSection = `\n\nAvailable users:\n${userListString}\n`;
  const instruction = `\n\nProvide only a JSON array of string User IDs to share with (e.g. ["id1","id2"]).`;

  return [base, contentSection, userSection, instruction].join("\n");
}




function parseStringArrayStrict(responseText: string | undefined): string[] {
  if (!responseText) throw new Error("AI response was empty");
  const parsed = JSON.parse(responseText);
  if (!Array.isArray(parsed) || !parsed.every((p) => typeof p === "string")) {
    throw new Error("AI response is not a JSON array of strings");
  }
  return parsed;
}

/**
 * More forgiving parse used for user suggestions:
 * - Tries to extract first JSON array found in the text
 * - Accepts top-level arrays only
 * - Filters out ownerId and unknown user ids at caller-side
 */
function extractJsonArrayFromText(
  responseText: string
): any[] | null {
  const arrayMatch = responseText.match(/\[[^\]]*\]/);
  try {
    if (arrayMatch?.[0]) {
      const p = JSON.parse(arrayMatch[0]);
      return Array.isArray(p) ? p : null;
    }
    const p = JSON.parse(responseText);
    return Array.isArray(p) ? p : null;
  } catch {
    return null;
  }
}



/**
 * Determine FileContent from raw upload bytes and mime type.
 * Preserves original signature but with stronger types.
 */
export async function getFileContent(
  arrayBuffer: ArrayBuffer,
  mimeType: string
): Promise<FileContent> {
  const uint8 = new Uint8Array(arrayBuffer);

  switch (mimeType) {
    case SupportedMimeType.PDF:
      return processPdf(uint8);

    case SupportedMimeType.DOCX:
      return processDocx(arrayBuffer);

    case SupportedMimeType.XLSX:
      return processXlsx(uint8);

    case SupportedMimeType.JPEG:
    case SupportedMimeType.PNG:
      return processImage(uint8, mimeType as SupportedMimeTypeImage);

    default:
      throw new Error(`Unsupported content type: ${mimeType}`);
  }
}

/**
 * Call AI to classify document into categories.
 * Returns an array of strings (categories).
 *
 * Change: For PDFs we now send text-only (no inline binary), since we've
 * performed OCR-first extraction already and want the LLM to reason over text.
 */
export async function getDocCategories(
  documentName: string,
  fileContent: FileContent
): Promise<string[]> {
  const ai = getAiClient();
  const promptText = createCategoriesPrompt(documentName, fileContent);

  const contents: (
    | string
    | { inlineData: { mimeType: string; data: string } }
  )[] = [];



  if (fileContent.type === "image") {
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



  try {
    return parseStringArrayStrict(result.text);
  } catch (err) {
    console.error("getDocCategories: failed to parse AI response", err);


    return [];
  }
}

/**
 * Ask AI to suggest user IDs to share the document with.
 * Filters suggestions against provided allUsers and excludes ownerId.
 *
 * Change: For PDFs we now send text-only (no inline binary), aligned with
 * OCR-first flow.
 */
export async function getAiShareSuggestions(
  documentName: string,
  fileContent: FileContent,
  ownerId: string,
  allUsers: User[]
): Promise<string[]> {
  const ai = getAiClient();
  const userListString = createUserListString(allUsers);
  const promptText = createShareSuggestionsPrompt(
    documentName,
    fileContent,
    ownerId,
    userListString
  );

  const contents: (
    | string
    | { inlineData: { mimeType: string; data: string } }
  )[] = [];


  if (fileContent.type === "image") {
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

  const rawText = result.text ?? "";
  const extracted = extractJsonArrayFromText(rawText);
  if (!extracted) {
    console.error(
      "getAiShareSuggestions: AI response did not contain a JSON array of IDs",
      rawText
    );
    return [];
  }


  const validUserIds = new Set(allUsers.map((u) => u._id));
  return extracted.filter(
    (id) =>
      typeof id === "string" &&
      id !== ownerId &&
      validUserIds.has(id)
  );
}

/**
 * Extracts searchable text from FileContent in a normalized way.
 */
export function extractSearchableText(
  fileContent: FileContent | undefined
): string {
  if (!fileContent) return "";
  try {
    if (fileContent.type === "text") {
      return sanitizeText(fileContent.content || "")
        .toLowerCase()
        .trim();
    }
    if (fileContent.type === "pdf") {
      return sanitizeText(fileContent.textContent || "")
        .toLowerCase()
        .trim();
    }

    return "";
  } catch (err) {
    console.error("extractSearchableText: error extracting text", err);
    return "";
  }
}

/**
 * Public helper to run OCR on an image buffer. Normalizes various buffer input
 * types. Intended for callers who want to index OCRed text for uploaded
 * images.
 */
export async function ocrExtractFromImageBuffer(
  buffer: ArrayBuffer | Uint8Array | Buffer,
  mimeType: string
): Promise<string> {
  const buf = normalizeToBuffer(buffer as any);
  return ocrExtractFromBuffer(buf, mimeType);
}