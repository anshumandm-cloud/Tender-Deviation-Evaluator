import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { performBrowserImageOcr } from "./ocrAndTamperAnalyzer";

/**
 * Parses user-uploaded files (DOCX, XLSX, TXT, PDF, PNG, JPG, TIFF, etc.) into plain text
 * for evaluation against SBD and NIT clauses, with OCR for image-based documents.
 */
export async function parseUploadedFile(file: File): Promise<{
  text: string;
  charCount: number;
  fileName: string;
  fileType: string;
  isOcrScanned?: boolean;
}> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  let extractedText = "";
  let isOcrScanned = false;

  try {
    if (["png", "jpg", "jpeg", "webp", "bmp", "tiff"].includes(extension)) {
      // Image file: Run Browser OCR Reader
      const ocrResult = await performBrowserImageOcr(file);
      extractedText = ocrResult.extractedText;
      isOcrScanned = true;
    } else if (extension === "docx") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value || "";
    } else if (extension === "xlsx" || extension === "xls" || extension === "csv") {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const textParts: string[] = [];

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        textParts.push(`--- SHEET: ${sheetName} ---`);
        const csvData = XLSX.utils.sheet_to_csv(worksheet);
        textParts.push(csvData);
      });
      extractedText = textParts.join("\n\n");
    } else if (extension === "pdf") {
      // In-browser text extraction from PDF
      extractedText = await extractTextFromPdf(file);
    } else {
      // Standard text/markdown/json fallback
      extractedText = await file.text();
    }
  } catch (error: any) {
    console.warn(`File parsing warning for ${file.name}:`, error);
    // Fallback to text reading if possible
    try {
      extractedText = await file.text();
    } catch {
      throw new Error(`Unable to parse ${file.name}: ${error.message || "Unknown error"}`);
    }
  }

  // Normalize whitespace
  const cleanedText = extractedText.trim();

  return {
    text: cleanedText,
    charCount: cleanedText.length,
    fileName: file.name,
    fileType: extension,
    isOcrScanned,
  };
}

export { parseUploadedFile as parseAnyFile };

/**
 * Basic browser-safe PDF text extractor
 */
async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let text = "";

  // Scan for PDF text objects between 'BT' (Begin Text) and 'ET' (End Text) or Tj/TJ tokens
  const latin1String = new TextDecoder("latin1").decode(bytes);
  
  // Extract text within parenthesis inside text blocks
  const textMatches = latin1String.match(/\((.*?)\)\s*Tj/g) || [];
  if (textMatches.length > 0) {
    text = textMatches
      .map((m) => m.replace(/^\(/, "").replace(/\)\s*Tj$/, ""))
      .join(" ");
  }

  // Also check TJ array format [(text)-10(more text)]TJ
  const arrayMatches = latin1String.match(/\[(.*?)\]\s*TJ/g) || [];
  if (arrayMatches.length > 0) {
    const arrayText = arrayMatches
      .map((m) => {
        const innerMatches = m.match(/\((.*?)\)/g) || [];
        return innerMatches.map((im) => im.replace(/^\(/, "").replace(/\)$/, "")).join("");
      })
      .join(" ");
    text += (text ? "\n\n" : "") + arrayText;
  }

  if (!text || text.length < 50) {
    // If PDF uses compressed streams, give informative notice
    text = `[PDF Document: ${file.name} - Size: ${(file.size / 1024).toFixed(1)} KB]\n` +
      `Note: If the PDF contains scanned images or high compression, please paste the deviation table or upload in DOCX/Excel format for optimal analysis. Text snippet extracted: \n` +
      (latin1String.slice(0, 1000).replace(/[^\x20-\x7E\n\r\t]/g, " "));
  }

  return text;
}
