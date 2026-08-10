import React, { useState, useEffect } from "react";
import { EventItem, RegistrationConfig, FormField, TeamMemberDetails } from "@/lib/services/mockData";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Users, Plus, Trash2, QrCode, Upload, ArrowRight, ArrowLeft, Copy, Check } from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { registrationService } from "@/services/registrationService";
import { paymentService } from "@/services/paymentService";
import { useRegistrations } from "@/modules/registration/sync/registrationContext";
import { isRegistrationOpen } from "@/lib/eventUtils";

interface DynamicRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
}

export function DynamicRegistrationModal({ isOpen, onClose, event }: DynamicRegistrationModalProps) {
  const { user } = useAuthContext();
  const { refresh } = useRegistrations();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step state for paid events: "details" | "payment"
  const [step, setStep] = useState<"details" | "payment">("details");

  // Form State
  const [existingReg, setExistingReg] = useState<any | null>(null);
  const [basicData, setBasicData] = useState<Record<string, string>>({});
  const [customData, setCustomData] = useState<Record<string, any>>({});
  const [teamMembers, setTeamMembers] = useState<TeamMemberDetails[]>([]);

  // Payment Form State
  const [transactionId, setTransactionId] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && event) {
      setLoading(false);
      setSuccess(false);
      setError(null);
      setExistingReg(null);
      setStep("details");
      setTransactionId("");
      setScreenshotFile(null);
      setScreenshotPreview(null);
      setCopiedUpi(false);

      const initForm = async () => {
        const defaultBasic = {
          fullName: user?.name || "",
          email: user?.email || "",
          registerNumber: "",
          phoneNumber: "",
          department: (user as any)?.department || "",
          year: (user as any)?.year || "",
        };

        const defaultCustomData: Record<string, any> = {};
        if (event.registrationConfig?.customFields) {
          event.registrationConfig.customFields.forEach(field => {
            if (field.type === 'checkbox') {
              defaultCustomData[field.id] = [];
            } else {
              defaultCustomData[field.id] = "";
            }
          });
        }

        const currentUid = user?.uid || "";
        const currentEmail = user?.email || "";
        console.log("[Auth]");
        console.log("uid:", currentUid);
        console.log("email:", currentEmail);

        let foundReg: any = null;
        if (currentUid || currentEmail) {
          foundReg = await registrationService.getUserRegistration(event.id, currentUid, currentEmail);
        }

        if (!isMounted) return;

        if (foundReg) {
          console.log("[Duplicate Check]");
          console.log("Current User UID:", currentUid);
          console.log("Current Event ID:", event.id);
          console.log("Matched Registration UID:", foundReg.userId);
          console.log("Matched Registration Event ID:", foundReg.eventId);
          console.log("Should Match?:", foundReg.userId === currentUid && foundReg.eventId === event.id);

          setExistingReg(foundReg);
          setBasicData({
            fullName: foundReg.studentName || foundReg.name || user?.name || "",
            email: foundReg.email || user?.email || "",
            registerNumber: foundReg.registerNumber || (foundReg as any).basicData?.registerNumber || "",
            phoneNumber: foundReg.phoneNumber || (foundReg as any).basicData?.phoneNumber || "",
            department: foundReg.department || (foundReg as any).basicData?.department || (user as any)?.department || "",
            year: foundReg.year || (foundReg as any).basicData?.year || (user as any)?.year || "",
          });

          const populatedCustomData: Record<string, any> = { ...defaultCustomData };
          if (event.registrationConfig?.customFields) {
            event.registrationConfig.customFields.forEach(field => {
              if (foundReg[field.id] !== undefined) {
                populatedCustomData[field.id] = foundReg[field.id];
              } else if (foundReg.customData && foundReg.customData[field.id] !== undefined) {
                populatedCustomData[field.id] = foundReg.customData[field.id];
              }
            });
          }
          setCustomData(populatedCustomData);

          if (foundReg.teamMembers && Array.isArray(foundReg.teamMembers)) {
            setTeamMembers(foundReg.teamMembers);
          }

          // Fetch associated payment document for paid events
          if (event.isPaid) {
            let foundPay: any = null;
            if (foundReg.paymentId) {
              foundPay = await paymentService.getPayment(foundReg.paymentId);
            }
            if (!foundPay) {
              const allPay = await paymentService.getPayments();
              foundPay = allPay.find(
                (p) => p.registrationId === foundReg.id || p.userId === (user?.uid || (user as any)?.id)
              );
            }

            if (!isMounted) return;

            if (foundPay) {
              setTransactionId(foundPay.transactionId || "");
              setScreenshotPreview(foundPay.paymentScreenshotUrl || null);

              // Auto-jump to payment step if payment proof was rejected
              if (foundReg.paymentStatus === "Rejected" || foundPay.status === "Rejected") {
                setStep("payment");
              }
            }
          }
        } else {
          setBasicData(defaultBasic);
          setCustomData(defaultCustomData);
          const config = event.registrationConfig;
          if (config?.isTeamEvent) {
            const initialMembers: TeamMemberDetails[] = [];
            const requiredAdditional = Math.max(0, config.minTeamSize - 1);
            for (let i = 0; i < requiredAdditional; i++) {
              initialMembers.push({ fullName: "", email: "" });
            }
            setTeamMembers(initialMembers);
          } else {
            setTeamMembers([]);
          }
        }
      };

      initForm();
    }
    return () => { isMounted = false; };
  }, [isOpen, event, user]);

  if (!isOpen || !event) return null;

  const config = event.registrationConfig;
  if (!config) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Registration Error">
        <div className="p-4 text-center text-red-500">
          <AlertCircle className="w-10 h-10 mx-auto mb-2" />
          <p>This event is missing registration configuration.</p>
        </div>
      </Modal>
    );
  }

  // Capacity Check
  if (!existingReg && event.capacity > 0 && event.registeredCount >= event.capacity) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Registration Closed">
        <div className="p-4 text-center text-amber-600">
          <AlertCircle className="w-10 h-10 mx-auto mb-2" />
          <p>Sorry, this event has reached its maximum capacity.</p>
        </div>
      </Modal>
    );
  }

  const handleCustomFieldChange = (id: string, value: any, isCheckboxMultiple = false) => {
    if (isCheckboxMultiple) {
      setCustomData(prev => {
        const current = prev[id] || [];
        if (current.includes(value)) {
          return { ...prev, [id]: current.filter((v: any) => v !== value) };
        } else {
          return { ...prev, [id]: [...current, value] };
        }
      });
    } else {
      setCustomData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleTeamMemberChange = (index: number, field: keyof TeamMemberDetails, value: string) => {
    setTeamMembers(prev => {
      const newMembers = [...prev];
      newMembers[index] = { ...newMembers[index], [field]: value };
      return newMembers;
    });
  };

  const addTeamMember = () => {
    if (teamMembers.length + 1 < config.maxTeamSize) {
      setTeamMembers(prev => [...prev, { fullName: "", email: "" }]);
    }
  };

  const removeTeamMember = (index: number) => {
    if (teamMembers.length + 1 > config.minTeamSize) {
      setTeamMembers(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleScreenshotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ["image/png", "image/jpeg", "image/jpg"];
      if (!validTypes.includes(file.type.toLowerCase())) {
        setError("Only PNG, JPG, and JPEG image files are supported.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5 MB. Please select a smaller screenshot.");
        return;
      }
      setError(null);
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = () => setScreenshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const regOpenCheck = isRegistrationOpen(event);
  const isRegClosed = !regOpenCheck.isOpen && !existingReg;

  const validateDetailsStep = () => {
    if (!existingReg && !regOpenCheck.isOpen) {
      throw new Error(regOpenCheck.reason || "Registrations are currently closed for this event.");
    }
    if (!basicData.fullName || !basicData.email) {
      throw new Error("Please fill out your name and email address.");
    }
    for (const field of config.customFields) {
      if (field.required && !customData[field.id]) {
        throw new Error(`Please fill out the required field: ${field.label}`);
      }
      if (field.required && field.type === "checkbox" && (!customData[field.id] || customData[field.id].length === 0)) {
        throw new Error(`Please select at least one option for: ${field.label}`);
      }
    }
  };

  const handleNextToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      validateDetailsStep();
      setStep("payment");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmitFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      validateDetailsStep();

      // If Paid Event, validate payment input & proof image format/size
      if (event.isPaid) {
        if (!transactionId.trim()) {
          throw new Error("Please enter your 12-digit UTR / Transaction ID.");
        }
        if (!screenshotFile && !screenshotPreview) {
          throw new Error("Please upload your payment proof screenshot.");
        }
        if (screenshotFile) {
          const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
          if (!allowedTypes.includes(screenshotFile.type)) {
            throw new Error("Invalid image format. Only PNG, JPG, or JPEG files are accepted.");
          }
          if (screenshotFile.size > 5 * 1024 * 1024) {
            throw new Error("Screenshot image size exceeds 5 MB. Please select a smaller image file.");
          }
        }
      }

      // Construct Registration Payload
      const payload: any = {
        ...customData,
        eventId: event.id,
        eventName: event.title,
        userId: user?.uid || (user as any)?.id || basicData.email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, "_"),
        studentName: basicData.fullName,
        name: basicData.fullName,
        email: basicData.email,
        eventDate: event.date || "TBD",
        eventTime: event.time || "Scheduled Time",
        venue: event.venue || "Tech Club Main Auditorium",
        department: basicData.department,
        year: basicData.year,
        source: "website",
        teamMembers: config.isTeamEvent ? teamMembers : undefined,
      };

      if (event.isPaid) {
        payload.paymentRequired = true;
        payload.paymentStatus = "Pending";
        payload.status = "PENDING_PAYMENT";
      } else {
        payload.paymentRequired = false;
        payload.paymentStatus = "NA";
        payload.status = "CONFIRMED";
      }

      if (basicData.email && typeof window !== "undefined") {
        localStorage.setItem("last_registered_email", basicData.email.toLowerCase().trim());
      }

      let createdReg: any = null;
      if (existingReg) {
        createdReg = await registrationService.updateRegistration(existingReg.id, payload);
      } else {
        createdReg = await registrationService.addRegistration(payload);
      }

      const regId = createdReg?.id || createdReg?.registrationId || existingReg?.id || `reg_${Date.now()}`;

      // Handle Payment Record Creation / Resubmission if Paid Event
      if (event.isPaid) {
        console.log("[Payment Pipeline] Submit clicked");
        let uploadedScreenshotUrl = screenshotPreview || "";
        if (screenshotFile) {
          uploadedScreenshotUrl = await paymentService.uploadPaymentScreenshot(screenshotFile, regId);
        }

        const paymentPayload = {
          registrationId: regId,
          eventId: event.id,
          eventTitle: event.title,
          userId: user?.uid || (user as any)?.id || null,
          studentName: basicData.fullName,
          studentEmail: basicData.email,
          amount: event.registrationFee || 0,
          transactionId: transactionId.trim(),
          paymentScreenshotUrl: uploadedScreenshotUrl,
        };

        const existingPayId = existingReg?.paymentId || createdReg?.paymentId;
        if (existingReg && existingPayId) {
          console.log("[Payment Pipeline] Resubmitting payment proof for existing payment:", existingPayId);
          await paymentService.resubmitPaymentProof(existingPayId, transactionId.trim(), uploadedScreenshotUrl);
          await registrationService.updateRegistration(regId, {
            paymentStatus: "Pending",
            status: "Payment Pending",
          });
        } else {
          console.log("[Payment Pipeline] Calling createPayment()");
          console.log("[Payment Pipeline] Payment payload:", paymentPayload);
          await paymentService.createPayment(paymentPayload);
        }
      }

      try {
        await refresh();
      } catch (refErr) {
        console.warn("[DynamicRegistrationModal] refresh() notice:", refErr);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      if (err.code === "ALREADY_REGISTERED" || err.status === 409 || (err.message && err.message.toLowerCase().includes("already registered"))) {
        setError("You have already registered for this event.");
      } else {
        setError(err.message || "An error occurred during registration.");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyUpiToClipboard = () => {
    if (event.upiId) {
      navigator.clipboard.writeText(event.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const upiDeepLink = event.upiId
    ? `upi://pay?pa=${encodeURIComponent(event.upiId.trim())}&pn=${encodeURIComponent(
        event.receiverName?.trim() || "Tech Club"
      )}&am=${event.registrationFee || 0}&cu=INR&tn=${encodeURIComponent(
        (event.title.trim() || "Event") + " Registration"
      )}`
    : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        event.isPaid && step === "payment"
          ? `Complete Payment for ${event.title}`
          : existingReg
          ? `Edit Registration for ${event.title}`
          : `Register for ${event.title}`
      }
    >
      {success ? (
        <div className="text-center py-6 space-y-4">
          <div className="h-14 w-14 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-gray-900">
              {event.isPaid
                ? "Payment Submitted for Verification!"
                : existingReg
                ? "Registration Updated!"
                : "Registration Confirmed!"}
            </h4>
            <p className="text-xs text-gray-500 font-medium max-w-sm mx-auto">
              {event.isPaid
                ? "Your payment proof has been submitted successfully. Your registration ticket will be activated once verified by an Admin."
                : existingReg
                ? "Your registration details have been updated successfully."
                : "We've saved your spot. You will receive an email confirmation shortly."}
            </p>
          </div>
        </div>
      ) : (
        <form
          onSubmit={event.isPaid && step === "details" ? handleNextToPayment : handleSubmitFinal}
          className="space-y-6 pt-2 max-h-[75vh] overflow-y-auto px-1 pb-4"
        >
          {existingReg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-sm">
              <span className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                You are registered for this event.
              </span>
              <span className="font-mono text-[11px] bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md font-bold shrink-0">
                {existingReg.registrationId || existingReg.id}
              </span>
            </div>
          )}

          {!existingReg && !regOpenCheck.isOpen && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200">Registrations Not Accepted</p>
                <p className="text-[11px] opacity-90 mt-0.5">{regOpenCheck.reason}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs border border-red-100 flex gap-2 items-center">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: PARTICIPANT DETAILS */}
          {step === "details" && (
            <div className="space-y-6">
              {/* Basic Fields */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Participant Information</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Full Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={basicData.fullName || ""}
                      onChange={(e) => setBasicData({ ...basicData, fullName: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs md:text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Email Address <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      required
                      value={basicData.email || ""}
                      onChange={(e) => setBasicData({ ...basicData, email: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs md:text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {config.basicFields.department && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Department <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={basicData.department || ""}
                        onChange={(e) => setBasicData({ ...basicData, department: e.target.value })}
                        placeholder="e.g. CSE / IT / ECE"
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs md:text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50"
                      />
                    </div>
                  )}

                  {config.basicFields.year && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Academic Year <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={basicData.year || ""}
                        onChange={(e) => setBasicData({ ...basicData, year: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs md:text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50"
                      >
                        <option value="">Select Academic Year</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Fields */}
              {config.customFields && config.customFields.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Event Specific Questionnaire</h4>
                  {config.customFields.map((field) => (
                    <div key={field.id} className="space-y-1">
                      <label className="text-xs font-bold text-gray-700">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {field.type === "text" || field.type === "number" || field.type === "email" || field.type === "phone" || field.type === "date" ? (
                        <input
                          type={field.type === "phone" ? "tel" : field.type}
                          required={field.required}
                          value={customData[field.id] ?? ""}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs md:text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50"
                        />
                      ) : field.type === "dropdown" ? (
                        <select
                          required={field.required}
                          value={customData[field.id] ?? ""}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs md:text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50"
                        >
                          <option value="">Select an option</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === "radio" ? (
                        <div className="space-y-2">
                          {field.options?.map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={field.id}
                                value={opt}
                                required={field.required}
                                checked={(customData[field.id] ?? "") === opt}
                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : field.type === "checkbox" ? (
                        <div className="space-y-2">
                          {field.options?.map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                name={field.id}
                                value={opt}
                                checked={(customData[field.id] ?? []).includes(opt)}
                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value, true)}
                                className="text-blue-600 focus:ring-blue-500 rounded border-gray-300"
                              />
                              <span className="text-sm text-gray-700">{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {/* Submit / Next Button */}
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={isRegClosed || loading}
                className="w-full py-3.5 rounded-xl font-bold mt-2 cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegClosed ? (
                  regOpenCheck.badgeText || "Registrations Closed"
                ) : event.isPaid ? (
                  <>
                    Proceed to Payment (₹{event.registrationFee})
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : existingReg ? (
                  "Update Registration"
                ) : (
                  "Confirm Free Registration"
                )}
              </Button>
            </div>
          )}

          {/* STEP 2: PAID EVENT PAYMENT SCREEN */}
          {event.isPaid && step === "payment" && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-4 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold uppercase">
                      Paid Registration
                    </span>
                    <h4 className="text-lg font-extrabold text-white mt-1">{event.title}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">Total Fee</span>
                    <div className="text-2xl font-black text-emerald-400">₹{event.registrationFee}</div>
                  </div>
                </div>

                {/* Scannable Dynamic UPI QR Code */}
                <div className="bg-white p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-5 text-gray-900 shadow-xl">
                  <div className="p-2 bg-slate-50 rounded-xl border border-gray-200 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiDeepLink)}`}
                      alt="UPI QR Code"
                      className="w-36 h-36 object-contain"
                    />
                  </div>

                  <div className="space-y-2 text-center sm:text-left flex-grow">
                    <div className="text-xs text-gray-500 font-semibold uppercase">Scan to Pay using Any UPI App</div>
                    
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <span className="font-mono text-sm font-bold text-gray-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-gray-200">
                        {event.upiId}
                      </span>
                      <button
                        type="button"
                        onClick={copyUpiToClipboard}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-slate-100 transition-colors"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="text-xs text-gray-600">
                      Receiver: <strong>{event.receiverName || "Tech Club Kalvium"}</strong>
                    </div>

                    {upiDeepLink && (
                      <a
                        href={upiDeepLink}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 mt-1"
                      >
                        Pay via UPI App (GPay / PhonePe / Paytm)
                      </a>
                    )}
                  </div>
                </div>

                {event.paymentInstructions && (
                  <p className="text-xs text-gray-300 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                    💡 <strong>Instructions:</strong> {event.paymentInstructions}
                  </p>
                )}
              </div>

              {/* Payment Proof Verification Fields */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Payment Verification Proof</h4>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">
                    12-Digit Transaction ID / UTR Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 987654321012 or UPI Ref No."
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs md:text-sm font-mono focus:border-blue-500 focus:outline-none bg-slate-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">
                    Upload Payment Proof Screenshot <span className="text-red-500">*</span> (PNG, JPG, JPEG max 5MB)
                  </label>
                  
                  <div className="flex items-center gap-4">
                    <label className="flex-1 border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-4 text-center cursor-pointer bg-slate-50/50 hover:bg-white transition-all">
                      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                      <span className="text-xs font-bold text-gray-700">Click to choose image file</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleScreenshotFileChange}
                        className="hidden"
                      />
                    </label>

                    {screenshotPreview && (
                      <div className="w-20 h-20 rounded-2xl border border-gray-200 overflow-hidden shadow-sm shrink-0 relative bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={screenshotPreview} alt="Screenshot Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("details")}
                  className="py-3 px-4 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  className="flex-1 py-3.5 rounded-xl font-bold cursor-pointer shadow-md"
                >
                  Submit Payment Proof & Register
                </Button>
              </div>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}
