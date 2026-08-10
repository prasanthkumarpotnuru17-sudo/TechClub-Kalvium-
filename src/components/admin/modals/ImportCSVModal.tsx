import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UploadCloud, FileSpreadsheet, AlertCircle } from "lucide-react";
import { EventItem } from "@/lib/services/mockData";
import { registrationService } from "@/services/registrationService";

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEvent: EventItem | undefined;
  onSuccess: (message: string) => void;
}

export function ImportCSVModal({ isOpen, onClose, currentEvent, onSuccess }: ImportCSVModalProps) {
  const [csvText, setCsvText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    success: number;
    duplicates: number;
    errors: { email: string; reason: string }[];
  } | null>(null);

  const handleImport = async () => {
    if (!currentEvent || !csvText) return;
    setIsProcessing(true);
    setImportSummary(null);

    const rows = csvText.split("\n").map(r => r.trim()).filter(Boolean);
    // Assuming CSV: Name, Email, Department, Year
    const headers = rows[0].split(",").map(h => h.trim().toLowerCase());
    
    // Fallback indexes if headers don't strictly match
    const nameIdx = headers.indexOf("name") !== -1 ? headers.indexOf("name") : 0;
    const emailIdx = headers.indexOf("email") !== -1 ? headers.indexOf("email") : 1;
    const deptIdx = headers.indexOf("department") !== -1 ? headers.indexOf("department") : 2;
    const yearIdx = headers.indexOf("year") !== -1 ? headers.indexOf("year") : 3;

    let successCount = 0;
    let duplicateCount = 0;
    const errorsList: { email: string; reason: string }[] = [];

    // Process rows sequentially to respect transactions, though batching is preferred in a real huge CSV
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(",").map(c => c.trim());
      const email = cols[emailIdx];
      const name = cols[nameIdx];
      if (!email || !name) {
        errorsList.push({ email: email || `Row ${i}`, reason: "Missing name or email" });
        continue;
      }

      try {
        await registrationService.addRegistration({
          eventId: currentEvent.id,
          eventName: currentEvent.title,
          name,
          studentName: name,
          email,
          department: cols[deptIdx] || "",
          year: cols[yearIdx] || "",
          source: "import",
          overrideCapacity: true
        });
        successCount++;
      } catch (err: any) {
        const msg = err.message || "";
        if (msg.includes("already registered")) {
          duplicateCount++;
        } else {
          errorsList.push({ email, reason: msg });
        }
      }
    }

    setIsProcessing(false);
    setImportSummary({
      total: rows.length - 1,
      success: successCount,
      duplicates: duplicateCount,
      errors: errorsList
    });
  };

  const handleDownloadErrors = () => {
    if (!importSummary?.errors.length) return;
    let csv = "Email,Reason\n";
    importSummary.errors.forEach(e => {
      csv += `${e.email},"${e.reason}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import_errors.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetState = () => {
    setCsvText("");
    setImportSummary(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-800"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                Bulk Import CSV
              </h3>
              <button onClick={handleClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {!importSummary ? (
                <>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs rounded-xl">
                    <p className="font-bold mb-1">Expected CSV Format (Headers required on line 1):</p>
                    <code className="bg-white dark:bg-black/20 px-2 py-1 rounded block">Name, Email, Department, Year</code>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Paste CSV Data</label>
                    <textarea 
                      rows={6}
                      value={csvText}
                      onChange={e => setCsvText(e.target.value)}
                      placeholder="John Doe, john@example.com, CSE, 3rd Year&#10;Jane Smith, jane@example.com, ECE, 2nd Year"
                      className="w-full p-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-xs"
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
                    <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
                      Cancel
                    </button>
                    <button 
                      disabled={isProcessing || !csvText} 
                      onClick={handleImport}
                      className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-2 disabled:opacity-50"
                    >
                      {isProcessing ? "Importing..." : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          Start Import
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4 text-center py-4">
                  <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">Import Complete</h4>
                  
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Total Rows</p>
                      <p className="text-xl font-bold">{importSummary.total}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <p className="text-[10px] text-emerald-600 uppercase font-bold">Success</p>
                      <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{importSummary.success}</p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                      <p className="text-[10px] text-amber-600 uppercase font-bold">Duplicates</p>
                      <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{importSummary.duplicates}</p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                      <p className="text-[10px] text-red-600 uppercase font-bold">Errors</p>
                      <p className="text-xl font-bold text-red-700 dark:text-red-400">{importSummary.errors.length}</p>
                    </div>
                  </div>

                  {importSummary.errors.length > 0 && (
                    <button onClick={handleDownloadErrors} className="flex items-center gap-2 justify-center w-full py-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-semibold text-sm rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors mt-2">
                      <AlertCircle className="w-4 h-4" />
                      Download Error Report (CSV)
                    </button>
                  )}

                  <button onClick={() => {
                    if (importSummary.success > 0) onSuccess(`${importSummary.success} participants imported.`);
                    handleClose();
                  }} className="w-full mt-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-bold text-sm rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                    Done
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Ensure CheckCircle is in scope, if not import it
import { CheckCircle } from "lucide-react";
