"use client";

import React, { forwardRef } from "react";
import { CanvasElement, CanvasSettings } from "@/services/certificateTemplateService";
import { DEFAULT_SYSTEM_TEMPLATES } from "@/services/certificateTemplateService";

export interface RecipientPrintData {
  studentName: string;
  certNumber: string;
  verificationCode: string;
  issuedDate: string;
  eventTitle: string;
  organizer?: string;
}

export interface CertificatePrintViewProps {
  canvasSettings?: Partial<CanvasSettings>;
  elements?: CanvasElement[];
  backgroundImageUrl?: string;
  recipient?: Partial<RecipientPrintData>;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Isolated Printable Certificate View
 * 
 * Guarantees a pure, isolated DOM tree for html2canvas rendering.
 * Uses 100% standard inline CSS (#HEX, rgb(), rgba()) with ZERO Tailwind v4 oklch/lab
 * color variables or visual effects (boxShadow, filter, ring, backdrop-blur).
 */
export const CertificatePrintView = forwardRef<HTMLDivElement, CertificatePrintViewProps>(
  function CertificatePrintView(
    { canvasSettings, elements, backgroundImageUrl, recipient, className, style },
    ref
  ) {
    const activeElements = (elements && elements.length > 0)
      ? elements
      : DEFAULT_SYSTEM_TEMPLATES[0].elements;

    const bgUrl = backgroundImageUrl || canvasSettings?.backgroundImageUrl || "";
    const bgColor = canvasSettings?.backgroundColor || "#FFFFFF";

    return (
      <div
        ref={ref}
        data-pdf-render-container="true"
        className={className || ""}
        style={{
          width: "1123px",
          height: "794px",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px",
          backgroundColor: bgColor,
          backgroundImage: bgUrl ? `url(${bgUrl})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "#1E293B",
          borderColor: "#E2E8F0",
          boxShadow: "none",
          textShadow: "none",
          filter: "none",
          outline: "none",
          fontFamily: "Inter, Arial, sans-serif",
          boxSizing: "border-box",
          ...style,
        }}
      >
        {activeElements.map((el) => {
          if (el.isHidden) return null;

          let textContent = el.content || el.label || "";
          if (el.type === "placeholder") {
            const key = el.placeholderKey;
            if (key === "participant_name" || key === "participantName") {
              textContent = recipient?.studentName || "Prasanth Kumar";
            } else if (key === "event_name" || key === "eventName") {
              textContent = recipient?.eventTitle || "Full Stack Development Workshop";
            } else if (key === "issue_date" || key === "issueDate") {
              textContent = recipient?.issuedDate || "07 Aug 2026";
            } else if (key === "certificate_number" || key === "certificateNumber") {
              textContent = recipient?.certNumber || "TC-2026-000123";
            } else if (key === "verification_code" || key === "verificationCode") {
              textContent = recipient?.verificationCode || "VERIFIED-TC-2026-000123";
            } else if (key === "organizer" || key === "organizerName") {
              textContent = recipient?.organizer || "Tech Club";
            } else {
              textContent = `{{${key}}}`;
            }
          }

          const fontColor = el.styles?.fontColor || "#1E293B";
          const fontSize = el.styles?.fontSize ? `${el.styles.fontSize}px` : "16px";
          const fontFamily = el.styles?.fontFamily || "Inter, sans-serif";
          const fontWeight = el.styles?.fontWeight || "normal";
          const textAlign = el.styles?.textAlign || "center";

          return (
            <div
              key={el.id}
              style={{
                position: "absolute",
                left: `${el.x}%`,
                top: `${el.y}%`,
                transform: "translate(-50%, -50%)",
                width: el.width ? `${el.width}%` : "auto",
                height: el.height ? `${el.height}%` : "auto",
                fontSize,
                fontFamily,
                fontWeight,
                color: fontColor,
                textAlign,
                backgroundColor: "transparent",
                borderColor: "transparent",
                boxShadow: "none",
                textShadow: "none",
                filter: "none",
                outline: "none",
                zIndex: el.zIndex || 1,
                userSelect: "none",
                whiteSpace: "nowrap",
                lineHeight: "1.2",
              }}
            >
              {textContent}
            </div>
          );
        })}
      </div>
    );
  }
);
