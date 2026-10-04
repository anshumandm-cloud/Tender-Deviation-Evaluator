import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { performBrowserImageOcr } from "./ocrAndTamperAnalyzer";

// Set pdfjs worker source to local bundled worker
if (typeof window !== "undefined") {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  } catch (err) {
    console.warn("Could not set local pdfjs workerSrc:", err);
  }
}

export interface ExtractedSubDocument {
  id: string;
  name: string;
  category: "turnover" | "experience" | "statutory" | "shortfall_reply";
  fileType: string;
  extractedText: string;
  charCount: number;
  uploadedAt: string;
  isOcrScanned?: boolean;
  ocrConfidence?: number;
  sourceArchive?: string;
  pageCount?: number;
}

export interface ParseResult {
  text: string;
  charCount: number;
  fileName: string;
  fileType: string;
  isOcrScanned?: boolean;
  subDocuments?: ExtractedSubDocument[];
  isBundle?: boolean;
}

/**
 * Intelligent categorization of document text or filename into eligibility heads
 */
export function categorizeDocument(fileName: string, content: string): "turnover" | "experience" | "statutory" | "shortfall_reply" {
  const combined = (fileName + " " + content.slice(0, 1500)).toLowerCase();

  if (
    combined.includes("shortfall") ||
    combined.includes("clarification") ||
    combined.includes("reply") ||
    combined.includes("compliance to notice")
  ) {
    return "shortfall_reply";
  }

  if (
    combined.includes("turnover") ||
    combined.includes("balance sheet") ||
    combined.includes("profit and loss") ||
    combined.includes("profit & loss") ||
    combined.includes("p&l") ||
    combined.includes("udin") ||
    combined.includes("chartered accountant") ||
    combined.includes("ca cert") ||
    combined.includes("net worth") ||
    combined.includes("annual financial")
  ) {
    return "turnover";
  }

  if (
    combined.includes("work order") ||
    combined.includes("completion cert") ||
    combined.includes("experience") ||
    combined.includes("satisfactory performance") ||
    combined.includes("client cert") ||
    combined.includes("execution cert") ||
    combined.includes("loi") ||
    combined.includes("loa") ||
    combined.includes("letter of award") ||
    combined.includes("similar work")
  ) {
    return "experience";
  }

  if (
    combined.includes("gst") ||
    combined.includes("pan") ||
    combined.includes("epf") ||
    combined.includes("esi") ||
    combined.includes("electrical license") ||
    combined.includes("registration cert") ||
    combined.includes("incorporation")
  ) {
    return "statutory";
  }

  // Default to experience if contains contract keywords, else turnover if numerical
  if (combined.includes("contract") || combined.includes("agreement")) {
    return "experience";
  }

  return "turnover";
}

/**
 * Extract text from a single PDF using pdfjs-dist with fallback
 */
export async function extractTextFromPdfData(arrayBuffer: ArrayBuffer, fileName: string): Promise<{ text: string; pageCount: number; pagesText: { pageNum: number; text: string }[] }> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const pagesText: { pageNum: number; text: string }[] = [];
    const fullTextParts: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        let lastY: number | null = null;
        const lineParts: string[] = [];
        let currentLine = "";

        for (const item of textContent.items as any[]) {
          const str = item.str || "";
          if (!str && !item.hasEOL) continue;
          const currentY = item.transform ? item.transform[5] : null;

          const isNewline =
            item.hasEOL ||
            (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 3.5);

          if (isNewline && currentLine.trim()) {
            lineParts.push(currentLine.trim());
            currentLine = str;
          } else {
            const spaceNeeded = currentLine.length > 0 && !currentLine.endsWith(" ") && !str.startsWith(" ");
            currentLine += (spaceNeeded ? " " : "") + str;
          }

          if (currentY !== null) lastY = currentY;
        }

        if (currentLine.trim()) {
          lineParts.push(currentLine.trim());
        }

        const pageText = lineParts.join("\n").trim();
        pagesText.push({ pageNum: i, text: pageText });
        if (pageText) {
          fullTextParts.push(`--- Page ${i} ---\n${pageText}`);
        }
      } catch (pageErr) {
        console.warn(`Error reading PDF page ${i}:`, pageErr);
      }
    }

    const aggregated = fullTextParts.join("\n\n");
    if (aggregated.trim().length > 30) {
      return { text: aggregated, pageCount: numPages, pagesText };
    }
  } catch (pdfErr) {
    console.warn("pdfjs-dist extraction failed, using raw regex fallback:", pdfErr);
  }

  // Fallback scanner for PDF streams
  const bytes = new Uint8Array(arrayBuffer);
  const latin1String = new TextDecoder("latin1").decode(bytes);
  let text = "";
  const textMatches = latin1String.match(/\((.*?)\)\s*Tj/g) || [];
  if (textMatches.length > 0) {
    text = textMatches.map((m) => m.replace(/^\(/, "").replace(/\)\s*Tj$/, "")).join(" ");
  }
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
    text = `[PDF Document: ${fileName} - Size: ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB]\n` +
      latin1String.slice(0, 1500).replace(/[^\x20-\x7E\n\r\t]/g, " ");
  }

  return { text, pageCount: 1, pagesText: [{ pageNum: 1, text }] };
}

/**
 * Parses a ZIP bundle file and extracts individual documents (PDF, DOCX, XLSX, images, TXT)
 */
export async function parseZipArchive(file: File): Promise<{
  text: string;
  charCount: number;
  fileName: string;
  fileType: string;
  subDocuments: ExtractedSubDocument[];
}> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const subDocs: ExtractedSubDocument[] = [];
  const overallTextParts: string[] = [
    `=== ZIP ARCHIVE BUNDLE: ${file.name} ===`,
    `Total Files Contained: ${Object.keys(zip.files).length}`,
    `--------------------------------------------------------------------------------`,
  ];

  let docIndex = 1;
  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    // Ignore internal macOS / directory paths
    if (zipEntry.dir || relativePath.startsWith("__MACOSX") || relativePath.includes(".DS_Store")) {
      continue;
    }

    const baseName = relativePath.split("/").pop() || relativePath;
    const ext = baseName.split(".").pop()?.toLowerCase() || "";

    try {
      let docText = "";
      let isOcr = false;

      if (ext === "pdf") {
        const entryBuffer = await zipEntry.async("arraybuffer");
        const pdfRes = await extractTextFromPdfData(entryBuffer, baseName);
        docText = pdfRes.text;
      } else if (ext === "docx") {
        const entryBuffer = await zipEntry.async("arraybuffer");
        const docxRes = await mammoth.extractRawText({ arrayBuffer: entryBuffer });
        docText = docxRes.value || "";
      } else if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        const entryBuffer = await zipEntry.async("arraybuffer");
        const workbook = XLSX.read(entryBuffer, { type: "array" });
        const textParts: string[] = [];
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          textParts.push(`[Sheet: ${sheetName}]`);
          textParts.push(XLSX.utils.sheet_to_csv(worksheet));
        });
        docText = textParts.join("\n\n");
      } else if (["png", "jpg", "jpeg", "bmp", "tiff", "webp"].includes(ext)) {
        // Blob for OCR
        const blob = await zipEntry.async("blob");
        const imageFile = new File([blob], baseName, { type: `image/${ext}` });
        const ocrRes = await performBrowserImageOcr(imageFile);
        docText = ocrRes.extractedText;
        isOcr = true;
      } else {
        // Text / TXT / MD fallback
        docText = await zipEntry.async("text");
      }

      const cleanedText = docText.trim();
      const category = categorizeDocument(baseName, cleanedText);

      const subDoc: ExtractedSubDocument = {
        id: `zip-sub-${Date.now()}-${docIndex++}`,
        name: baseName,
        category,
        fileType: ext,
        extractedText: cleanedText,
        charCount: cleanedText.length,
        uploadedAt: new Date().toISOString().split("T")[0],
        isOcrScanned: isOcr,
        sourceArchive: file.name,
      };

      subDocs.push(subDoc);
      overallTextParts.push(`\n>>> [FILE ${subDocs.length}] ${baseName} (Category: ${category.toUpperCase()}) <<<`);
      overallTextParts.push(cleanedText);
    } catch (err: any) {
      console.warn(`Error unpacking ${relativePath} from zip:`, err);
    }
  }

  const aggregatedText = overallTextParts.join("\n\n");
  return {
    text: aggregatedText,
    charCount: aggregatedText.length,
    fileName: file.name,
    fileType: "zip",
    subDocuments: subDocs,
  };
}

/**
 * Intelligent section splitting for a single multi-page PDF submitted as a complete bundle
 */
export async function parsePdfBundle(file: File): Promise<{
  text: string;
  charCount: number;
  fileName: string;
  fileType: string;
  subDocuments: ExtractedSubDocument[];
}> {
  const arrayBuffer = await file.arrayBuffer();
  const { text: fullText, pageCount, pagesText } = await extractTextFromPdfData(arrayBuffer, file.name);

  const subDocs: ExtractedSubDocument[] = [];

  // If multi-page PDF, attempt to identify distinct certificate / document sections
  if (pageCount > 1 && pagesText.length > 0) {
    let currentCategory: "turnover" | "experience" | "statutory" | "shortfall_reply" = "turnover";
    let currentSectionTitle = "Section 1: Initial Documents";
    let currentPages: { pageNum: number; text: string }[] = [];

    const flushCurrentSection = (index: number) => {
      if (currentPages.length === 0) return;
      const sectionText = currentPages.map((p) => `--- Page ${p.pageNum} ---\n${p.text}`).join("\n\n");
      const startPage = currentPages[0].pageNum;
      const endPage = currentPages[currentPages.length - 1].pageNum;
      const subDoc: ExtractedSubDocument = {
        id: `pdf-sub-${Date.now()}-${index}`,
        name: `${file.name.replace(/\.pdf$/i, "")}_[p${startPage}-p${endPage}]_${currentCategory}.pdf`,
        category: currentCategory,
        fileType: "pdf",
        extractedText: sectionText,
        charCount: sectionText.length,
        uploadedAt: new Date().toISOString().split("T")[0],
        pageCount: currentPages.length,
        sourceArchive: file.name,
      };
      subDocs.push(subDoc);
      currentPages = [];
    };

    let sectionIndex = 1;
    for (let i = 0; i < pagesText.length; i++) {
      const page = pagesText[i];
      const pageCategory = categorizeDocument(`page_${page.pageNum}`, page.text);

      // If category switches or strong header is found
      const hasHeading =
        /BALANCE SHEET|TURNOVER CERTIFICATE|CHARTERED ACCOUNTANT|UDIN|WORK ORDER|COMPLETION CERTIFICATE|PERFORMANCE CERTIFICATE|GST REGISTRATION|EPF REGISTRATION/i.test(
          page.text
        );

      if (i > 0 && (pageCategory !== currentCategory || hasHeading) && currentPages.length > 0) {
        flushCurrentSection(sectionIndex++);
        currentCategory = pageCategory;
        currentSectionTitle = `Section ${sectionIndex}: ${pageCategory.toUpperCase()}`;
      }
      currentPages.push(page);
    }
    flushCurrentSection(sectionIndex++);
  }

  // If no distinct sub-sections could be separated, create one canonical sub-document
  if (subDocs.length === 0) {
    const category = categorizeDocument(file.name, fullText);
    subDocs.push({
      id: `pdf-doc-${Date.now()}`,
      name: file.name,
      category,
      fileType: "pdf",
      extractedText: fullText,
      charCount: fullText.length,
      uploadedAt: new Date().toISOString().split("T")[0],
      pageCount,
    });
  }

  return {
    text: fullText,
    charCount: fullText.length,
    fileName: file.name,
    fileType: "pdf",
    subDocuments: subDocs,
  };
}

/**
 * Universal file parser supporting ZIP archives, multi-document PDFs, DOCX, XLSX, and images
 */
export async function parseUploadedFile(file: File): Promise<ParseResult> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  if (extension === "zip") {
    const zipResult = await parseZipArchive(file);
    return {
      ...zipResult,
      isBundle: true,
    };
  }

  if (extension === "pdf") {
    const pdfBundleResult = await parsePdfBundle(file);
    return {
      text: pdfBundleResult.text,
      charCount: pdfBundleResult.charCount,
      fileName: file.name,
      fileType: "pdf",
      subDocuments: pdfBundleResult.subDocuments,
      isBundle: (pdfBundleResult.subDocuments?.length || 0) > 1,
    };
  }

  if (["png", "jpg", "jpeg", "webp", "bmp", "tiff"].includes(extension)) {
    const ocrResult = await performBrowserImageOcr(file);
    return {
      text: ocrResult.extractedText,
      charCount: ocrResult.charCount,
      fileName: file.name,
      fileType: extension,
      isOcrScanned: true,
    };
  }

  if (extension === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = (result.value || "").trim();
    return {
      text,
      charCount: text.length,
      fileName: file.name,
      fileType: "docx",
    };
  }

  if (["xlsx", "xls", "csv"].includes(extension)) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const textParts: string[] = [];
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      textParts.push(`--- SHEET: ${sheetName} ---`);
      textParts.push(XLSX.utils.sheet_to_csv(worksheet));
    });
    const text = textParts.join("\n\n").trim();
    return {
      text,
      charCount: text.length,
      fileName: file.name,
      fileType: extension,
    };
  }

  // Text fallback
  const rawText = await file.text();
  const text = rawText.trim();
  return {
    text,
    charCount: text.length,
    fileName: file.name,
    fileType: extension || "txt",
  };
}

export { parseUploadedFile as parseAnyFile };

/**
 * Detailed Keyword Match item for Eligibility Criteria
 */
export interface KeywordExtractionMatch {
  keyword: "turnover" | "experience" | "financial" | "ISO";
  matchedTerm: string;
  snippet: string;
  lineNumber?: number;
}

/**
 * Result structure returned by extractEligibilityCriteriaFromFile and extractEligibilityCriteriaFromText
 */
export interface EligibilityExtractionResult {
  sourceFileName: string;
  fileType: string;
  fileSizeBytes: number;
  extractedCharCount: number;
  rawText: string;
  matchedKeywords: {
    turnover: string[];
    experience: string[];
    financial: string[];
    ISO: string[];
  };
  detailedMatches: KeywordExtractionMatch[];
  suggestedCriteria: {
    minAverageAnnualTurnoverCr: number;
    turnoverYearsCount: number;
    turnoverNotes: string;
    netWorthRequirement: string;
    workingCapitalRequirement: string;
    similarWorkDefinition: string;
    singleWorkOrderValueCr: number;
    twoWorkOrdersValueCr: number;
    threeWorkOrdersValueCr: number;
    priorExperienceYears: number;
    mandatoryCertifications: string[];
  };
  confidenceScore: number; // 0 - 100
  summaryFindings: string[];
}

/**
 * Analyzes extracted text targeting eligibility criteria keywords:
 * 'turnover', 'experience', 'financial', and 'ISO'
 */
export function extractEligibilityCriteriaFromText(
  text: string,
  fileName: string = "uploaded_document",
  fileSizeBytes: number = 0
): EligibilityExtractionResult {
  const lines = text.split(/\r?\n/);
  const matchedKeywords = {
    turnover: [] as string[],
    experience: [] as string[],
    financial: [] as string[],
    ISO: [] as string[],
  };
  const detailedMatches: KeywordExtractionMatch[] = [];
  const summaryFindings: string[] = [];

  // Default suggested criteria
  const suggestedCriteria = {
    minAverageAnnualTurnoverCr: 15.0,
    turnoverYearsCount: 3,
    turnoverNotes: "Audited Balance Sheets & CA Certificate with UDIN for last 3 financial years",
    netWorthRequirement: "Positive Net Worth as on close of preceding financial year",
    workingCapitalRequirement: "Fund-based credit limit of minimum ₹ 2.0 Cr or equivalent solvency",
    similarWorkDefinition: "Operation & Maintenance (O&M), comprehensive facility management, or similar electrical/mechanical services in Govt/PSU/Reputed Enterprise",
    singleWorkOrderValueCr: 12.0,
    twoWorkOrdersValueCr: 7.5,
    threeWorkOrdersValueCr: 6.0,
    priorExperienceYears: 7,
    mandatoryCertifications: ["ISO 9001:2015"],
  };

  // Helper to extract clean sentence around a term
  const extractSnippet = (line: string, indexInLine: number, windowSize: number = 180): string => {
    const start = Math.max(0, indexInLine - 40);
    const end = Math.min(line.length, indexInLine + windowSize);
    let snip = line.substring(start, end).trim();
    if (start > 0) snip = "..." + snip;
    if (end < line.length) snip = snip + "...";
    return snip.replace(/\s+/g, " ");
  };

  // Scan line by line for keywords
  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) return;

    const lower = trimmed.toLowerCase();

    // 1. Keyword: turnover
    if (lower.includes("turnover") || lower.includes("annual turnover") || lower.includes("ato")) {
      const idx = lower.indexOf("turnover");
      const snippet = extractSnippet(trimmed, idx >= 0 ? idx : 0);
      matchedKeywords.turnover.push(snippet);
      detailedMatches.push({
        keyword: "turnover",
        matchedTerm: "turnover",
        snippet,
        lineNumber: lineIdx + 1,
      });
    }

    // 2. Keyword: experience
    if (
      lower.includes("experience") ||
      lower.includes("similar work") ||
      lower.includes("past performance") ||
      lower.includes("work order") ||
      lower.includes("completion certificate")
    ) {
      const idx = lower.indexOf("experience") >= 0 ? lower.indexOf("experience") : lower.indexOf("similar work");
      const snippet = extractSnippet(trimmed, idx >= 0 ? idx : 0);
      matchedKeywords.experience.push(snippet);
      detailedMatches.push({
        keyword: "experience",
        matchedTerm: lower.includes("similar work") ? "similar work" : "experience",
        snippet,
        lineNumber: lineIdx + 1,
      });
    }

    // 3. Keyword: financial
    if (
      lower.includes("financial") ||
      lower.includes("net worth") ||
      lower.includes("working capital") ||
      lower.includes("solvency") ||
      lower.includes("balance sheet") ||
      lower.includes("udin")
    ) {
      const idx = lower.indexOf("financial") >= 0 ? lower.indexOf("financial") : lower.indexOf("net worth");
      const snippet = extractSnippet(trimmed, idx >= 0 ? idx : 0);
      matchedKeywords.financial.push(snippet);
      detailedMatches.push({
        keyword: "financial",
        matchedTerm: lower.includes("net worth") ? "net worth" : lower.includes("working capital") ? "working capital" : "financial",
        snippet,
        lineNumber: lineIdx + 1,
      });
    }

    // 4. Keyword: ISO
    const isoMatches = trimmed.match(/\bISO\s*(?:\d{4,5}(?::\d{4})?)?\b/gi);
    if (isoMatches && isoMatches.length > 0) {
      isoMatches.forEach((isoTerm) => {
        const idx = trimmed.indexOf(isoTerm);
        const snippet = extractSnippet(trimmed, idx >= 0 ? idx : 0);
        matchedKeywords.ISO.push(isoTerm);
        detailedMatches.push({
          keyword: "ISO",
          matchedTerm: isoTerm,
          snippet,
          lineNumber: lineIdx + 1,
        });
      });
    }
  });

  // Targeted parsing for TURNOVER fields
  // Check for turnover value: e.g. "turnover of Rs. 15.5 Cr" or "15.5 Crore" or "₹ 15 Cr" or "Rs 1,500 Lakhs" or "Rs 15,00,00,000"
  const turnoverRegex = /(?:turnover|annual turnover|average annual turnover)[^.\n]{0,90}?(?:(?:INR|Rs\.?|₹)\s*)?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(cr(?:ores?)?|lakhs?|lacs?|crore)?/i;
  const turnoverMatch = text.match(turnoverRegex);
  if (turnoverMatch && turnoverMatch[1]) {
    const rawNum = turnoverMatch[1].replace(/[^\d.]/g, "");
    const val = parseFloat(rawNum);
    const unit = turnoverMatch[2]?.toLowerCase() || "";
    let finalValCr = val;
    if (unit.startsWith("lakh") || unit.startsWith("lac")) {
      finalValCr = parseFloat((val / 100).toFixed(2));
    } else if (val >= 10000000) {
      finalValCr = parseFloat((val / 10000000).toFixed(2));
    } else {
      finalValCr = parseFloat(val.toFixed(2));
    }
    if (finalValCr > 0) {
      suggestedCriteria.minAverageAnnualTurnoverCr = finalValCr;
      summaryFindings.push(`Found Minimum Turnover requirement: ₹ ${finalValCr} Crore (${turnoverMatch[0].trim()})`);
    }
  }

  // Check turnover years: e.g. "last 3 financial years", "past 3 years", "last 5 years"
  const yearsMatch = text.match(/(?:last|preceding|past)\s*(\d+|three|four|five)\s*(?:\(\d+\)\s*)?(?:financial\s*)?years/i);
  if (yearsMatch) {
    let yrCount = 3;
    const rawYr = yearsMatch[1].toLowerCase();
    if (rawYr === "three" || rawYr === "3") yrCount = 3;
    else if (rawYr === "five" || rawYr === "5") yrCount = 5;
    else if (rawYr === "four" || rawYr === "4") yrCount = 4;
    else if (!isNaN(parseInt(rawYr, 10))) yrCount = parseInt(rawYr, 10);
    suggestedCriteria.turnoverYearsCount = yrCount;
    summaryFindings.push(`Found Turnover qualifying period: ${yrCount} Financial Years`);
  }

  // Check CA & UDIN requirement in turnover/financial text
  const hasUdin = /UDIN/i.test(text);
  const hasCA = /chartered accountant|ca cert|audited balance sheet/i.test(text);
  if (hasUdin || hasCA) {
    suggestedCriteria.turnoverNotes = `Audited Balance Sheets & CA Certificate ${hasUdin ? "with UDIN mandatory" : "duly certified"} for last ${suggestedCriteria.turnoverYearsCount} FYs`;
    summaryFindings.push(hasUdin ? "Detected mandatory CA UDIN requirement for turnover verification" : "Detected Audited Balance Sheet & CA Certificate requirement");
  }

  // Targeted parsing for EXPERIENCE fields
  // Check for similar work definition: e.g. "similar work means ...", "definition of similar work: ...", "experience in ..."
  const similarWorkRegex = /(?:similar\s+work\s+(?:means|shall\s+mean|is\s+defined\s+as)|definition\s+of\s+similar\s+work)[:\s\-]+([^\n.;]{20,250})/i;
  const similarWorkMatch = text.match(similarWorkRegex);
  if (similarWorkMatch && similarWorkMatch[1]) {
    const cleanedScope = similarWorkMatch[1].replace(/\s+/g, " ").trim();
    suggestedCriteria.similarWorkDefinition = cleanedScope;
    summaryFindings.push(`Extracted Similar Work Definition: "${cleanedScope.slice(0, 80)}..."`);
  } else {
    // Look for scope sentence containing O&M or Maintenance
    const scopeMatch = text.match(/(?:experience\s+of\s+having\s+successfully\s+completed[^.\n]{15,200})/i);
    if (scopeMatch) {
      suggestedCriteria.similarWorkDefinition = scopeMatch[0].replace(/\s+/g, " ").trim();
      summaryFindings.push(`Extracted Experience criteria clause: "${suggestedCriteria.similarWorkDefinition.slice(0, 75)}..."`);
    }
  }

  // Check for 80% / 50% / 40% work order values or specific Cr amounts (with comma numbers)
  const singleWorkMatch = text.match(/(?:one|1|single)\s+(?:completed\s+)?(?:similar\s+)?work(?:\s+order)?(?:\s+costing|\s+valued\s+at|\s+of)?\s*(?:not\s+less\s+than)?\s*(?:(?:INR|Rs\.?|₹)\s*)?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(cr(?:ores?)?|lakhs?|lacs?|crore)?/i);
  if (singleWorkMatch && singleWorkMatch[1]) {
    const rawNum = singleWorkMatch[1].replace(/[^\d.]/g, "");
    const val = parseFloat(rawNum);
    const unit = singleWorkMatch[2]?.toLowerCase() || "";
    let finalVal = val;
    if (unit.startsWith("lakh") || unit.startsWith("lac")) finalVal = parseFloat((val / 100).toFixed(2));
    else if (val >= 10000000) finalVal = parseFloat((val / 10000000).toFixed(2));
    if (finalVal > 0) suggestedCriteria.singleWorkOrderValueCr = finalVal;
  } else if (suggestedCriteria.minAverageAnnualTurnoverCr > 0) {
    // GFR / PSU standard benchmark: Single work order 80% of estimate / turnover
    suggestedCriteria.singleWorkOrderValueCr = parseFloat((suggestedCriteria.minAverageAnnualTurnoverCr * 0.8).toFixed(2));
  }

  const twoWorksMatch = text.match(/(?:two|2)\s+(?:completed\s+)?(?:similar\s+)?works?(?:\s+orders?)?(?:\s+costing|\s+valued\s+at|\s+each\s+of)?\s*(?:not\s+less\s+than)?\s*(?:(?:INR|Rs\.?|₹)\s*)?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(cr(?:ores?)?|lakhs?|lacs?|crore)?/i);
  if (twoWorksMatch && twoWorksMatch[1]) {
    const rawNum = twoWorksMatch[1].replace(/[^\d.]/g, "");
    const val = parseFloat(rawNum);
    const unit = twoWorksMatch[2]?.toLowerCase() || "";
    let finalVal = val;
    if (unit.startsWith("lakh") || unit.startsWith("lac")) finalVal = parseFloat((val / 100).toFixed(2));
    else if (val >= 10000000) finalVal = parseFloat((val / 10000000).toFixed(2));
    if (finalVal > 0) suggestedCriteria.twoWorkOrdersValueCr = finalVal;
  } else if (suggestedCriteria.minAverageAnnualTurnoverCr > 0) {
    // 50% threshold
    suggestedCriteria.twoWorkOrdersValueCr = parseFloat((suggestedCriteria.minAverageAnnualTurnoverCr * 0.5).toFixed(2));
  }

  const threeWorksMatch = text.match(/(?:three|3)\s+(?:completed\s+)?(?:similar\s+)?works?(?:\s+orders?)?(?:\s+costing|\s+valued\s+at|\s+each\s+of)?\s*(?:not\s+less\s+than)?\s*(?:(?:INR|Rs\.?|₹)\s*)?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(cr(?:ores?)?|lakhs?|lacs?|crore)?/i);
  if (threeWorksMatch && threeWorksMatch[1]) {
    const rawNum = threeWorksMatch[1].replace(/[^\d.]/g, "");
    const val = parseFloat(rawNum);
    const unit = threeWorksMatch[2]?.toLowerCase() || "";
    let finalVal = val;
    if (unit.startsWith("lakh") || unit.startsWith("lac")) finalVal = parseFloat((val / 100).toFixed(2));
    else if (val >= 10000000) finalVal = parseFloat((val / 10000000).toFixed(2));
    if (finalVal > 0) suggestedCriteria.threeWorkOrdersValueCr = finalVal;
  } else if (suggestedCriteria.minAverageAnnualTurnoverCr > 0) {
    // 40% threshold
    suggestedCriteria.threeWorkOrdersValueCr = parseFloat((suggestedCriteria.minAverageAnnualTurnoverCr * 0.4).toFixed(2));
  }

  // Prior experience period: e.g. "during the last 7 years"
  const priorExpMatch = text.match(/(?:during\s+the\s+last|preceding|past)\s*(\d+|seven|five)\s*(?:\(\d+\)\s*)?years/i);
  if (priorExpMatch) {
    const yr = priorExpMatch[1].toLowerCase();
    suggestedCriteria.priorExperienceYears = yr === "seven" || yr === "7" ? 7 : yr === "five" || yr === "5" ? 5 : parseInt(yr, 10) || 7;
  }

  // Targeted parsing for FINANCIAL fields
  // Net Worth requirement
  if (/positive\s+net\s+worth/i.test(text) || /net\s+worth\s+shall\s+be\s+positive/i.test(text)) {
    suggestedCriteria.netWorthRequirement = "Positive Net Worth as on last audited Financial Year";
    summaryFindings.push("Identified Positive Net Worth requirement");
  } else {
    const nwMatch = text.match(/(?:net\s+worth[^.\n]{10,120})/i);
    if (nwMatch) {
      suggestedCriteria.netWorthRequirement = nwMatch[0].replace(/\s+/g, " ").trim();
      summaryFindings.push(`Identified Net Worth requirement: "${suggestedCriteria.netWorthRequirement.slice(0, 60)}..."`);
    }
  }

  // Working Capital / Credit Limit requirement
  const wcMatch = text.match(/(?:working\s+capital|fund\s+based\s+credit\s+limit|solvency)[^.\n]{10,120}/i);
  if (wcMatch) {
    suggestedCriteria.workingCapitalRequirement = wcMatch[0].replace(/\s+/g, " ").trim();
    summaryFindings.push(`Identified Working Capital / Solvency requirement: "${suggestedCriteria.workingCapitalRequirement.slice(0, 60)}..."`);
  }

  // Targeted parsing for ISO keyword matches
  const uniqueIsoCerts = new Set<string>();
  const isoStandardRegex = /\bISO\s*(9001(?::2015)?|14001(?::2015)?|45001(?::2018)?|27001(?::2013|:2022)?|50001(?::2018)?|22000)\b/gi;
  let m;
  while ((m = isoStandardRegex.exec(text)) !== null) {
    const rawMatch = m[0].toUpperCase().replace(/\s+/g, " ");
    const normalized = rawMatch.includes(":") ? rawMatch : rawMatch.includes("9001") ? "ISO 9001:2015" : rawMatch.includes("14001") ? "ISO 14001:2015" : rawMatch.includes("45001") ? "ISO 45001:2018" : rawMatch;
    uniqueIsoCerts.add(normalized);
  }

  // Check additional statutory registrations
  if (/electrical\s+contractor(?:\s+class[- ]a)?\s+license/i.test(text)) {
    uniqueIsoCerts.add("Electrical Contractor Class-A License");
  }
  if (/epf\s*(?:&|and)\s*esi/i.test(text) || /epfo\s+registration/i.test(text)) {
    uniqueIsoCerts.add("EPF & ESI Registration Certificate");
  }

  if (uniqueIsoCerts.size > 0) {
    suggestedCriteria.mandatoryCertifications = Array.from(uniqueIsoCerts);
    summaryFindings.push(`Identified Certifications & Standards: ${suggestedCriteria.mandatoryCertifications.join(", ")}`);
  }

  // Compute confidence score based on matches
  let score = 25;
  if (matchedKeywords.turnover.length > 0) score += 25;
  if (matchedKeywords.experience.length > 0) score += 20;
  if (matchedKeywords.financial.length > 0) score += 15;
  if (matchedKeywords.ISO.length > 0) score += 15;
  const confidenceScore = Math.min(100, score);

  return {
    sourceFileName: fileName,
    fileType: fileName.split(".").pop()?.toLowerCase() || "doc",
    fileSizeBytes,
    extractedCharCount: text.length,
    rawText: text,
    matchedKeywords,
    detailedMatches,
    suggestedCriteria,
    confidenceScore,
    summaryFindings,
  };
}

/**
 * File parser helper function that uses the native File API to extract text content
 * from uploaded .pdf and .zip files, specifically targeting keywords related to eligibility
 * criteria like 'turnover', 'experience', 'financial', and 'ISO'.
 *
 * @param file Native browser File object (.pdf, .zip, .docx, .xlsx, .txt)
 * @returns Comprehensive EligibilityExtractionResult with structured criteria suggestions
 */
export async function extractEligibilityCriteriaFromFile(
  file: File
): Promise<EligibilityExtractionResult> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  let extractedText = "";

  // 1. Process PDF using native File API (arrayBuffer) and pdfjs-dist
  if (extension === "pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const pdfRes = await extractTextFromPdfData(arrayBuffer, file.name);
    extractedText = pdfRes.text;
  }
  // 2. Process ZIP archive using native File API (arrayBuffer) and JSZip
  else if (extension === "zip") {
    const zipResult = await parseZipArchive(file);
    extractedText = zipResult.text;
  }
  // 3. Process DOCX using native File API (arrayBuffer) and mammoth
  else if (extension === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const docxRes = await mammoth.extractRawText({ arrayBuffer });
    extractedText = (docxRes.value || "").trim();
  }
  // 4. Process Excel using native File API (arrayBuffer) and XLSX
  else if (["xlsx", "xls", "csv"].includes(extension)) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const textParts: string[] = [];
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      textParts.push(`--- SHEET: ${sheetName} ---`);
      textParts.push(XLSX.utils.sheet_to_csv(worksheet));
    });
    extractedText = textParts.join("\n\n").trim();
  }
  // 5. Native text fallback using file.text()
  else {
    extractedText = await file.text();
  }

  // Run targeted keyword extraction on extracted text
  return extractEligibilityCriteriaFromText(extractedText, file.name, file.size);
}
