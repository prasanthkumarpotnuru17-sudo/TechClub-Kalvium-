import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type as SchemaType } from "@google/genai";
import { CanvasElement } from "@/services/certificateTemplateService";

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Mandatory Placeholders that MUST exist on every certificate template layout
const MANDATORY_PLACEHOLDERS = [
  { key: "participant_name", label: "Participant Name", defaultY: 46, fontSize: 38, bold: true },
  { key: "event_name", label: "Event Name", defaultY: 62, fontSize: 20, bold: true },
  { key: "organizer", label: "Organizer Name", defaultY: 72, fontSize: 13, bold: false },
  { key: "issue_date", label: "Issue Date", defaultY: 84, fontSize: 12, bold: false, align: "left" as const, x: 20 },
  { key: "certificate_number", label: "Certificate Number", defaultY: 84, fontSize: 12, bold: false, align: "right" as const, x: 80 },
];

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      backgroundImageUrl,
      canvasSettings,
      existingElements,
      isRefinement,
    } = await req.json();

    const userPrompt = prompt || "Design a professional certificate of completion.";

    // Try calling Gemini 2.5 Flash if API Key is configured
    if (ai) {
      try {
        const systemInstruction = `
You are an expert certificate designer and graphics layout engine.
Your task is to analyze the certificate background image and user prompt, then generate 3 distinct layout variations (Classic, Modern, Minimal) and an auto-generated template name.

CRITICAL MANDATORY REQUIREMENT:
Every single layout variation MUST contain ALL 5 of these required placeholder keys:
1. "participant_name" (Main recipient name, largest font, centered)
2. "event_name" (Workshop/event title, below participant name)
3. "issue_date" (Date of issue, bottom-left)
4. "certificate_number" (Unique ID, bottom-right)
5. "organizer" (Issuing organization/signatory)

Analyze the image for:
- Decorative borders & margins (keep elements safely inside printable areas)
- Existing logos or seals (avoid overlapping them)
- Signature lines (place organizer name appropriately)
- Blank printable regions
- Color harmony (match typography colors to background accents)

Structure of each CanvasElement JSON object:
{
  "id": "string",
  "type": "placeholder" | "text" | "shape",
  "placeholderKey": "participant_name" | "event_name" | "issue_date" | "certificate_number" | "organizer",
  "label": "string",
  "x": number (0 to 100 percentage),
  "y": number (0 to 100 percentage),
  "width": number (optional percentage width for divider lines),
  "zIndex": number,
  "content": "string" (only for text elements e.g. "CERTIFICATE OF COMPLETION"),
  "shapeType": "line",
  "styles": {
    "fontFamily": "Inter" | "Playfair Display" | "Montserrat" | "Cinzel",
    "fontSize": number (32-44 for participant_name, 18-22 for event_name, 12-14 for details),
    "fontWeight": "bold" | "semibold" | "medium" | "normal",
    "fontColor": "hex color string e.g. #1E293B, #D97706, #0F172A",
    "textAlign": "left" | "center" | "right",
    "letterSpacing": number,
    "lineHeight": number
  }
}

Output strict JSON containing:
{
  "templateName": "Auto-generated descriptive template name e.g. AI Workshop 2026 Certificate",
  "layouts": [
    { "name": "Classic", "elements": [ ... ] },
    { "name": "Modern", "elements": [ ... ] },
    { "name": "Minimal", "elements": [ ... ] }
  ]
}
`;

        const contents: any[] = [];
        if (backgroundImageUrl && backgroundImageUrl.startsWith("data:image/")) {
          const base64Data = backgroundImageUrl.split(",")[1];
          const mimeType = backgroundImageUrl.split(";")[0].split(":")[1] || "image/png";
          contents.push({
            inlineData: {
              data: base64Data,
              mimeType,
            },
          });
        }
        contents.push(userPrompt);

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config: {
            systemInstruction,
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        });

        const textResponse = response.text || "";
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed && Array.isArray(parsed.layouts) && parsed.layouts.length > 0) {
            // Guarantee mandatory placeholders in every layout
            const verifiedLayouts = parsed.layouts.map((layout: any) => ({
              name: layout.name || "Layout",
              elements: ensureMandatoryPlaceholders(layout.elements || []),
            }));

            return NextResponse.json({
              success: true,
              templateName: parsed.templateName || generateAutoTemplateName(userPrompt),
              layouts: verifiedLayouts,
              aiGenerated: true,
            });
          }
        }
      } catch (geminiErr) {
        console.warn("[AI Certificate Designer] Gemini API call notice:", geminiErr);
      }
    }

    // Smart Fallback Engine: Generates 3 layout variations (Classic, Modern, Minimal) and template name
    const fallbackLayouts = [
      {
        name: "Classic",
        elements: generateSmartLayoutVariation("classic", userPrompt, existingElements, isRefinement),
      },
      {
        name: "Modern",
        elements: generateSmartLayoutVariation("modern", userPrompt, existingElements, isRefinement),
      },
      {
        name: "Minimal",
        elements: generateSmartLayoutVariation("minimal", userPrompt, existingElements, isRefinement),
      },
    ];

    return NextResponse.json({
      success: true,
      templateName: generateAutoTemplateName(userPrompt),
      layouts: fallbackLayouts,
      aiGenerated: false,
    });
  } catch (err: any) {
    console.error("[AI Certificate Designer] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "AI could not confidently design this certificate. Please adjust it manually.",
      },
      { status: 500 }
    );
  }
}

/**
 * Ensure all 5 mandatory placeholders exist on every layout without exception
 */
function ensureMandatoryPlaceholders(elements: CanvasElement[]): CanvasElement[] {
  const verified = [...elements];

  MANDATORY_PLACEHOLDERS.forEach((mp) => {
    const exists = verified.some(
      (el) => el.type === "placeholder" && (el.placeholderKey === mp.key || el.placeholderKey === mp.key.replace(/_([a-z])/g, (_, g) => g.toUpperCase()))
    );

    if (!exists) {
      verified.push({
        id: `el-mandatory-${mp.key}-${Date.now()}`,
        type: "placeholder",
        placeholderKey: mp.key,
        label: mp.label,
        x: mp.x ?? 50,
        y: mp.defaultY,
        zIndex: 10,
        styles: {
          fontFamily: mp.key === "participant_name" ? "Playfair Display" : "Inter",
          fontSize: mp.fontSize,
          fontWeight: mp.bold ? "bold" : "normal",
          fontColor: mp.key === "event_name" ? "#D97706" : "#1E293B",
          textAlign: mp.align || "center",
        },
      });
    }
  });

  return verified;
}

/**
 * Auto-generate descriptive template name from user prompt
 */
function generateAutoTemplateName(prompt: string): string {
  const p = prompt.trim();
  if (p.toLowerCase().includes("web dev")) return "Web Development Workshop Certificate";
  if (p.toLowerCase().includes("ai")) return "AI Workshop 2026 Certificate";
  if (p.toLowerCase().includes("participation")) return "Certificate of Participation";
  if (p.toLowerCase().includes("appreciation")) return "Certificate of Appreciation";
  if (p.length > 5 && p.length < 40) return `${p} Certificate`;
  return "Official Certificate of Completion";
}

/**
 * Smart Fallback Engine: Generates Classic, Modern, or Minimal layout variations
 */
function generateSmartLayoutVariation(
  styleVariant: "classic" | "modern" | "minimal",
  prompt: string,
  existingElements?: CanvasElement[],
  isRefinement?: boolean
): CanvasElement[] {
  const p = prompt.toLowerCase();
  const timestamp = Date.now();

  // If refinement action ("✨ Improve Design"), refine existing elements
  if (isRefinement && existingElements && existingElements.length > 0) {
    const refined = existingElements.map((el) => {
      const isName = el.placeholderKey === "participant_name" || el.placeholderKey === "participantName";
      const isEvent = el.placeholderKey === "event_name" || el.placeholderKey === "eventName";

      if (p.includes("bigger") && isName) {
        return { ...el, styles: { ...el.styles, fontSize: Math.min(50, (el.styles.fontSize || 36) + 4) } };
      }
      if (p.includes("lower") && isEvent) {
        return { ...el, y: Math.min(80, el.y + 5) };
      }
      if (p.includes("center")) {
        return { ...el, x: 50, styles: { ...el.styles, textAlign: "center" as const } };
      }
      if (p.includes("gold") && (isName || isEvent)) {
        return { ...el, styles: { ...el.styles, fontColor: "#D97706" } };
      }
      return el;
    }) as CanvasElement[];

    return ensureMandatoryPlaceholders(refined);
  }

  let fontFamily = "Playfair Display";
  let primaryColor = "#1E293B";
  let accentColor = "#D97706";
  let subColor = "#64748B";

  if (styleVariant === "modern") {
    fontFamily = "Montserrat";
    primaryColor = "#0F172A";
    accentColor = "#2563EB";
  } else if (styleVariant === "minimal") {
    fontFamily = "Inter";
    primaryColor = "#1E293B";
    accentColor = "#059669";
  }

  const baseElements: CanvasElement[] = [
    {
      id: `ai-header-${styleVariant}-${timestamp}`,
      type: "text",
      label: "Certificate Header",
      content: "CERTIFICATE OF COMPLETION",
      x: 50,
      y: styleVariant === "minimal" ? 24 : 22,
      zIndex: 5,
      styles: {
        fontFamily,
        fontSize: styleVariant === "minimal" ? 18 : 22,
        fontWeight: "bold",
        fontColor: primaryColor,
        textAlign: "center",
        letterSpacing: styleVariant === "minimal" ? 3 : 2,
        uppercase: true,
      },
    },
    {
      id: `ai-subtitle-${styleVariant}-${timestamp}`,
      type: "text",
      label: "Presented Subtitle",
      content: "This is proudly presented to",
      x: 50,
      y: 34,
      zIndex: 6,
      styles: {
        fontFamily,
        fontSize: 14,
        fontWeight: "medium",
        fontColor: subColor,
        textAlign: "center",
        fontStyle: styleVariant === "classic" ? "italic" : "normal",
      },
    },
    {
      id: `ai-name-${styleVariant}-${timestamp}`,
      type: "placeholder",
      placeholderKey: "participant_name",
      label: "Participant Name",
      x: 50,
      y: 46,
      zIndex: 10,
      styles: {
        fontFamily,
        fontSize: styleVariant === "classic" ? 40 : styleVariant === "modern" ? 38 : 34,
        fontWeight: "bold",
        fontColor: primaryColor,
        textAlign: "center",
        letterSpacing: styleVariant === "minimal" ? 1 : 0.5,
      },
    },
    {
      id: `ai-divider-${styleVariant}-${timestamp}`,
      type: "shape",
      shapeType: "line",
      label: "Accent Line",
      x: 50,
      y: 55,
      width: styleVariant === "minimal" ? 40 : 55,
      height: 1,
      zIndex: 4,
      styles: {
        borderColor: accentColor,
        borderWidth: 2,
        opacity: 0.9,
      },
    },
    {
      id: `ai-event-${styleVariant}-${timestamp}`,
      type: "placeholder",
      placeholderKey: "event_name",
      label: "Event Name",
      x: 50,
      y: 62,
      zIndex: 9,
      styles: {
        fontFamily,
        fontSize: 20,
        fontWeight: "semibold",
        fontColor: accentColor,
        textAlign: "center",
      },
    },
    {
      id: `ai-organizer-${styleVariant}-${timestamp}`,
      type: "placeholder",
      placeholderKey: "organizer",
      label: "Organizer Name",
      x: 50,
      y: 72,
      zIndex: 8,
      styles: {
        fontFamily,
        fontSize: 13,
        fontWeight: "medium",
        fontColor: subColor,
        textAlign: "center",
      },
    },
    {
      id: `ai-date-${styleVariant}-${timestamp}`,
      type: "placeholder",
      placeholderKey: "issue_date",
      label: "Issue Date",
      x: 20,
      y: 84,
      zIndex: 7,
      styles: {
        fontFamily,
        fontSize: 12,
        fontColor: subColor,
        textAlign: "left",
      },
    },
    {
      id: `ai-certno-${styleVariant}-${timestamp}`,
      type: "placeholder",
      placeholderKey: "certificate_number",
      label: "Certificate Number",
      x: 80,
      y: 84,
      zIndex: 7,
      styles: {
        fontFamily,
        fontSize: 12,
        fontColor: subColor,
        textAlign: "right",
      },
    },
  ];

  return ensureMandatoryPlaceholders(baseElements);
}
