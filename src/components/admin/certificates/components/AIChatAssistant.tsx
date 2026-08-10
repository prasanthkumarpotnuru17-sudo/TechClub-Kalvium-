"use client";

import React, { useState } from "react";
import { Sparkles, Send, Loader2, Wand2, RefreshCcw, CheckCircle2 } from "lucide-react";
import { CanvasElement } from "@/services/certificateService";

interface AIChatAssistantProps {
  elements: CanvasElement[];
  onUpdateElements: (updatedElements: CanvasElement[]) => void;
}

const QUICK_COMMANDS = [
  "Make participant name bigger",
  "Move event name slightly lower",
  "Change font to a modern style",
  "Center all text",
  "Use a gold-themed heading",
  "Increase line spacing",
];

export function AIChatAssistant({ elements, onUpdateElements }: AIChatAssistantProps) {
  const [chatPrompt, setChatPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<{ role: "user" | "assistant"; text: string }[]>([
    {
      role: "assistant",
      text: "Hello! I am your AI Design Assistant. Click 'Improve Design' or type commands to adjust typography, alignment, positioning, or colors on your canvas in real-time.",
    },
  ]);

  const handleSendRefinement = async (promptToSend?: string) => {
    const text = promptToSend || chatPrompt;
    if (!text.trim() || isProcessing) return;

    try {
      setIsProcessing(true);
      setHistory((prev) => [...prev, { role: "user", text }]);
      if (!promptToSend) setChatPrompt("");

      const res = await fetch("/api/ai/design-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          existingElements: elements,
          isRefinement: true,
        }),
      });

      const data = await res.json();

      let targetElements: CanvasElement[] = [];
      if (data.success) {
        if (Array.isArray(data.layouts) && data.layouts.length > 0) {
          targetElements = data.layouts[0].elements;
        } else if (Array.isArray(data.elements)) {
          targetElements = data.elements;
        }
      }

      if (targetElements.length > 0) {
        onUpdateElements(targetElements);
        setHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `✨ Applied your refinement: "${text}". Canvas layout updated!`,
          },
        ]);
      } else {
        setHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "AI could not confidently apply this layout modification. Please adjust elements manually on the canvas.",
          },
        ]);
      }
    } catch (err) {
      console.error("[AIChatAssistant] Refinement error:", err);
      setHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "AI could not confidently design this certificate. Please adjust it manually.",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3 p-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-200/80 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white">AI Design Assistant</h4>
            <p className="text-[10px] text-gray-400">Refine layout, typography & spacing</p>
          </div>
        </div>

        {/* One-Click "Improve Design" Button */}
        <button
          onClick={() => handleSendRefinement("Optimize layout hierarchy, font pairings, spacing, and color contrast")}
          disabled={isProcessing}
          className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[11px] font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
          title="Auto-refine typography, alignment and contrast"
        >
          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          <span>✨ Improve Design</span>
        </button>
      </div>

      {/* Quick Action Commands */}
      <div className="space-y-1">
        <span className="text-[10px] font-semibold text-gray-400">Quick Commands:</span>
        <div className="flex flex-wrap gap-1">
          {QUICK_COMMANDS.map((cmd, i) => (
            <button
              key={i}
              onClick={() => handleSendRefinement(cmd)}
              disabled={isProcessing}
              className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-amber-500 text-gray-700 dark:text-gray-300 text-[10px] rounded-lg transition-all text-left disabled:opacity-50 cursor-pointer"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto space-y-2 text-xs p-2.5 bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
        {history.map((item, idx) => (
          <div
            key={idx}
            className={`p-2.5 rounded-xl ${
              item.role === "user"
                ? "bg-amber-500/10 text-amber-900 dark:text-amber-200 ml-6 text-right font-medium"
                : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 mr-6 text-left"
            }`}
          >
            {item.text}
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-center gap-2 text-[10px] text-amber-600 font-semibold p-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>AI is updating canvas layout...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={chatPrompt}
          onChange={(e) => setChatPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendRefinement()}
          placeholder="e.g. Make participant name bigger..."
          className="flex-1 px-3 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-xs outline-none focus:border-amber-500"
        />
        <button
          onClick={() => handleSendRefinement()}
          disabled={isProcessing || !chatPrompt.trim()}
          className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl disabled:opacity-50 transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
