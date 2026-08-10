"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQ() {
  const faqList: FAQItem[] = [
    {
      question: "Who can join the Tech Club by Kalvium?",
      answer: "Tech Club by Kalvium is open to all students of the university, regardless of their branch or major. Whether you are a complete beginner writing your first lines of HTML, a hardware designer, or a researcher building advanced neural networks, you are welcome to apply!",
    },
    {
      question: "Are there any membership fees?",
      answer: "No, there are no membership fees. All our core labs, workshops, bootcamps, and hackathons are fully funded through university grants and corporate sponsorships from AWS, Vercel, and local tech partner firms. Hardware kits are also provided for labs.",
    },
    {
      question: "I am a complete beginner. Will I fit in?",
      answer: "Absolutely! We host dedicated starter cohorts in Python, Web Development, UI/UX Design, and basic IoT electronics. You will be matched with senior student mentors who will guide you from the fundamentals to building your first portfolio-ready projects.",
    },
    {
      question: "How often does the club meet?",
      answer: "We hold domain labs weekly (typically Wednesday/Thursday evenings) and host large events, bootcamps, or hackathons once or twice a month. You can participate in whichever domain labs align with your goals; there are no mandatory hours.",
    },
    {
      question: "Can I publish research papers through the club?",
      answer: "Yes, our faculty advisors actively mentor student projects. We regularly collaborate on publications in machine learning architectures, containerized cloud networks, IoT mesh protocols, and cybersecurity auditing standards.",
    },
  ];

  return (
    <section id="faq" className="relative py-24 bg-white">
      <div className="container mx-auto max-w-4xl px-4 md:px-6">
        
        {/* Section Heading */}
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
            Frequently Asked Questions
          </h2>
          <p className="text-sm md:text-base text-gray-500">
            Clear answers to common questions about membership, workshops, projects, and domain labs.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {faqList.map((item, idx) => (
            <AccordionItem key={idx} question={item.question} answer={item.answer} />
          ))}
        </div>

      </div>
    </section>
  );
}

function AccordionItem({ question, answer }: FAQItem) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="rounded-2xl border border-gray-150 overflow-hidden bg-slate-50/50 hover:bg-white transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[52px] flex items-center justify-between p-5 md:p-6 text-left font-bold text-gray-900 transition-colors duration-250 cursor-pointer active:scale-[0.99]"
      >
        <span className="text-sm md:text-base pr-4 leading-snug">{question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-400 shrink-0 min-h-[44px] flex items-center justify-center"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-5 pb-5 md:px-6 md:pb-6 text-xs md:text-sm text-gray-500 leading-relaxed font-medium border-t border-gray-100/50 pt-4">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
