"use client";

import React, { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle2, ArrowRight } from "lucide-react";
import { FaGithub, FaLinkedin, FaInstagram } from "react-icons/fa";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { contactMessageService } from "@/services/contactMessageService";
import { useAuth } from "@/hooks/useAuth";

export function Contact() {
  const { user, firebaseUser } = useAuth();
  const [formState, setFormState] = useState({
    name: user?.name || firebaseUser?.displayName || "",
    email: user?.email || firebaseUser?.email || "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (user || firebaseUser) {
      setFormState((prev) => ({
        ...prev,
        name: prev.name || user?.name || firebaseUser?.displayName || "",
        email: prev.email || user?.email || firebaseUser?.email || "",
      }));
    }
  }, [user, firebaseUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim() || !formState.email.trim() || !formState.message.trim()) return;

    if (loading) return; // Prevent duplicate rapid clicks

    setLoading(true);
    setErrorMsg(null);

    try {
      await contactMessageService.createMessage({
        fullName: formState.name,
        email: formState.email,
        subject: formState.subject,
        message: formState.message,
        userId: user?.uid || null,
      });

      setLoading(false);
      setSuccess(true);
      setFormState({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      console.error("[Contact Form] Error submitting message:", err);
      setLoading(false);
      setErrorMsg(err.message || "Failed to send message. Please try again.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <section id="contact" className="relative py-24 bg-slate-50/50 overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full radial-glow-purple opacity-40 pointer-events-none" />

      <div className="container mx-auto max-w-7xl px-4 md:px-6 relative z-10">
        
        {/* Section Heading */}
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            Get In Touch
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
            Have Questions? Contact Us
          </h2>
          <p className="text-sm md:text-base text-gray-500">
            Reach out if you are interested in sponsorships, speaking opportunities, or general membership inquiries.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {/* LEFT SIDE: Contact info (5 Columns) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Tech Lab by Kalvium Coordinates</h3>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">
                Our main physical lab and hardware workshop center are located in the Department of Computer Science. Drop in during weeknights to meet students.
              </p>

              <div className="space-y-4 pt-4">
                {/* Location */}
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 shadow-inner">
                    <MapPin className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Physical Lab Location</h5>
                    <p className="text-sm text-gray-950 font-semibold mt-0.5">
                      Lab 402, 4th Floor, CS Building <br />
                      Kalvium Tech Campus
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 shadow-inner">
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Email Coordinates</h5>
                    <p className="text-sm text-gray-950 font-semibold mt-0.5">
                      contact@apextechclub.org <br />
                      support@apextechclub.org
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
                    <Phone className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Phone Coordinates</h5>
                    <p className="text-sm text-gray-950 font-semibold mt-0.5">
                      +1 (555) 349-8092 <br />
                      Ext. 4021 (Tech Lab Desk)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Connect buttons */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-bold text-gray-900">Connect Online</h4>
              <div className="flex gap-3">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="h-11 w-11 rounded-2xl bg-white border border-gray-200 text-gray-600 hover:text-black hover:border-black active:scale-95 transition-all duration-200 flex items-center justify-center shadow-sm"
                  aria-label="Tech Club by Kalvium GitHub"
                >
                  <FaGithub className="h-4.5 w-4.5" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="h-11 w-11 rounded-2xl bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-600 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-sm"
                  aria-label="Tech Club by Kalvium LinkedIn"
                >
                  <FaLinkedin className="h-4.5 w-4.5" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="h-11 w-11 rounded-2xl bg-white border border-gray-200 text-gray-600 hover:text-pink-600 hover:border-pink-600 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-sm"
                  aria-label="Tech Club by Kalvium Instagram"
                >
                  <FaInstagram className="h-4.5 w-4.5" />
                </a>
              </div>
            </div>

          </div>

          {/* RIGHT SIDE: Interactive form (7 Columns) */}
          <div className="lg:col-span-7">
            <Card className="rounded-[32px] bg-white border border-gray-200 p-8 shadow-md relative overflow-hidden h-full flex flex-col justify-center">
              
              {success ? (
                <div className="text-center py-12 space-y-6 max-w-sm mx-auto">
                  <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto shadow-inner">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-gray-900">Your message has been sent successfully.</h4>
                    <p className="text-xs md:text-sm text-gray-600 font-medium leading-relaxed">
                      Our Tech Club team will contact you soon.
                    </p>
                  </div>
                  <Button onClick={() => setSuccess(false)} variant="outline" className="px-6 py-2.5">
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label htmlFor="form-name" className="text-xs font-bold text-gray-700">Full Name</label>
                      <input
                        type="text"
                        name="name"
                        id="form-name"
                        required
                        value={formState.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className="w-full min-h-[48px] rounded-2xl border border-gray-200/80 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50 hover:bg-white focus:bg-white transition-colors duration-200"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label htmlFor="form-email" className="text-xs font-bold text-gray-700">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        id="form-email"
                        required
                        value={formState.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        className="w-full min-h-[48px] rounded-2xl border border-gray-200/80 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50 hover:bg-white focus:bg-white transition-colors duration-200"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <label htmlFor="form-subject" className="text-xs font-bold text-gray-700">Subject</label>
                    <input
                      type="text"
                      name="subject"
                      id="form-subject"
                      value={formState.subject}
                      onChange={handleChange}
                      placeholder="Sponsorship proposal / Member query"
                      className="w-full min-h-[48px] rounded-2xl border border-gray-200/80 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50 hover:bg-white focus:bg-white transition-colors duration-200"
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label htmlFor="form-message" className="text-xs font-bold text-gray-700">Message</label>
                    <textarea
                      name="message"
                      id="form-message"
                      required
                      rows={5}
                      value={formState.message}
                      onChange={handleChange}
                      placeholder="Hi, I am interested in collaborating with the club for..."
                      className="w-full min-h-[120px] rounded-2xl border border-gray-200/80 px-4 py-3.5 text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50 hover:bg-white focus:bg-white transition-colors duration-200 resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    loading={loading}
                    className="w-full min-h-[52px] py-4 rounded-2xl text-sm font-bold flex justify-center items-center gap-1.5 active:scale-97 transition-all cursor-pointer"
                  >
                    Send Message
                    <Send className="h-4 w-4" />
                  </Button>

                </form>
              )}

            </Card>
          </div>

        </div>

      </div>
    </section>
  );
}
