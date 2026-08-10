import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { CanvasSettings } from "./certificateTemplateService";

export const certificatePDFService = {
  /**
   * Render an HTML element containing a certificate template layout into a high-DPI PDF Blob.
   */
  async generatePDFBlob(
    containerElement: HTMLElement,
    canvasSettings?: Partial<CanvasSettings>
  ): Promise<Blob> {
    try {
      if (!containerElement) {
        throw new Error("Container DOM element is null or undefined.");
      }

      // 1. Wait for all <img> elements inside container to download & decode
      const imgElements = Array.from(containerElement.querySelectorAll("img"));
      await Promise.all(
        imgElements.map((img) => {
          if (img.complete && img.naturalWidth !== 0) {
            return img.decode().catch(() => {});
          }
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      // 2. Preload CSS background image if present
      const bgStyle = containerElement.style.backgroundImage || "";
      const bgMatch = bgStyle.match(/url\(['"]?(.*?)['"]?\)/);
      if (bgMatch && bgMatch[1]) {
        await new Promise((resolve) => {
          const tempImg = new Image();
          tempImg.crossOrigin = "anonymous";
          tempImg.onload = resolve;
          tempImg.onerror = resolve;
          tempImg.src = bgMatch[1];
        });
      }

      console.log("[3] Assets Loaded");

      // 3. Pre-render Computed Style Scan for Color Level 4 Functions (lab, oklab, oklch, lch)
      const allDomNodes = [containerElement, ...Array.from(containerElement.querySelectorAll("*"))];
      const unsupportedColorFuncRegex = /(?:oklch|oklab|lab|lch)\([^)]+\)/gi;

      allDomNodes.forEach((node) => {
        const el = node as HTMLElement;
        if (!el || !window.getComputedStyle) return;

        const computed = window.getComputedStyle(el);
        const propertiesToScan = [
          "color",
          "backgroundColor",
          "borderColor",
          "outlineColor",
          "textDecorationColor",
          "boxShadow",
          "textShadow",
          "fill",
          "stroke",
          "filter",
          "backdropFilter",
        ];

        propertiesToScan.forEach((prop) => {
          const val = (computed as any)[prop];
          if (typeof val === "string" && unsupportedColorFuncRegex.test(val)) {
            console.warn(`[certificatePDFService] Scan detected unsupported CSS color on <${el.tagName.toLowerCase()}> [${prop}]: "${val}". Sanitizing for html2canvas.`);
            unsupportedColorFuncRegex.lastIndex = 0;

            // Sanitize in-place on element
            if (prop === "color") el.style.color = "#1E293B";
            else if (prop === "backgroundColor") el.style.backgroundColor = "#FFFFFF";
            else if (prop === "borderColor") el.style.borderColor = "#E2E8F0";
            else if (prop === "boxShadow") el.style.boxShadow = "none";
            else if (prop === "textShadow") el.style.textShadow = "none";
            else if (prop === "filter") el.style.filter = "none";
            else if (prop === "backdropFilter") el.style.backdropFilter = "none";
          }
        });
      });

      console.log(`[4] html2canvas Started - Container tag: <${containerElement.tagName}>, Dimensions: ${containerElement.offsetWidth}x${containerElement.offsetHeight}px`);

      const orientation = canvasSettings?.orientation || "landscape";
      const isPortrait = orientation === "portrait";

      // 4. Render DOM container to HTML5 Canvas at scale 2 (high DPI ~300 DPI)
      const canvas = await html2canvas(containerElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: canvasSettings?.backgroundColor || "#FFFFFF",
        logging: false,
        onclone: (clonedDoc) => {
          // Walk every node in the cloned DOM tree and sanitize CSS Color Level 4 values
          const clonedNodes = clonedDoc.querySelectorAll("*");
          clonedNodes.forEach((node) => {
            const el = node as HTMLElement;
            if (!el || !el.style) return;

            // Disable unsupported visual effects
            el.style.boxShadow = "none";
            el.style.textShadow = "none";
            el.style.filter = "none";
            el.style.backdropFilter = "none";

            // Sanitize text, background, and border colors
            if (el.style.color && /oklch|oklab|lab|lch/i.test(el.style.color)) {
              el.style.color = "#1E293B";
            }
            if (el.style.backgroundColor && /oklch|oklab|lab|lch/i.test(el.style.backgroundColor)) {
              el.style.backgroundColor = "#FFFFFF";
            }
            if (el.style.borderColor && /oklch|oklab|lab|lch/i.test(el.style.borderColor)) {
              el.style.borderColor = "#E2E8F0";
            }
          });
        },
      });

      console.log(`[5] Canvas Generated (${canvas.width} × ${canvas.height})`);

      if (!canvas.width || !canvas.height) {
        throw new Error(`html2canvas produced blank canvas with width ${canvas.width} and height ${canvas.height}`);
      }

      // 4. Convert Canvas to High-Quality Compressed JPEG (90% size reduction while preserving crisp text & visuals)
      const imgData = canvas.toDataURL("image/jpeg", 0.85);

      // 5. Initialize jsPDF in A4 format
      const pdf = new jsPDF({
        orientation: isPortrait ? "portrait" : "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // 6. Add Image to PDF fitting A4 dimensions exactly
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

      // 7. Output PDF as Blob
      const pdfArrayBuffer = pdf.output("arraybuffer");
      const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

      const sizeBytes = pdfBlob.size;
      const sizeKB = (sizeBytes / 1024).toFixed(2);
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

      console.log(`[PDF Generator] Certificate PDF Blob created successfully: ${sizeBytes} bytes (${sizeKB} KB / ${sizeMB} MB)`);
      return pdfBlob;
    } catch (error: any) {
      console.error("[certificatePDFService] Error generating PDF blob:", error);
      throw new Error(`Failed to render certificate PDF: ${error.message || error}`);
    }
  }
};
