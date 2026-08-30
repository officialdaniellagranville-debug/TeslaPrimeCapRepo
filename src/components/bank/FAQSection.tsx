'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'How do I open a new bank account?',
    answer:
      'Opening an account with VaultEdge Bank is simple. You can apply online through our website in under 10 minutes, or visit any of our 50+ branch locations. You will need a valid government-issued ID, proof of address, and an initial deposit depending on the account type you choose.',
  },
  {
    question: 'Is my money safe with VaultEdge Bank?',
    answer:
      'Absolutely. VaultEdge Bank is fully insured by the FDIC, meaning your deposits are protected up to $250,000 per depositor. We also employ bank-grade 256-bit encryption, multi-factor authentication, and 24/7 fraud monitoring to keep your funds secure at all times.',
  },
  {
    question: 'What types of loans do you offer?',
    answer:
      'We offer a comprehensive range of loan products including personal loans, home mortgages, auto loans, small business loans, and student loans. Each product comes with competitive interest rates and flexible repayment terms tailored to your financial situation.',
  },
  {
    question: 'How does the mobile banking app work?',
    answer:
      'Our mobile app, available on both iOS and Android, lets you check balances, transfer funds, deposit checks with your camera, pay bills, and manage investments from anywhere. It features biometric login, real-time notifications, and budgeting tools to help you stay on track.',
  },
  {
    question: 'Are there any monthly maintenance fees?',
    answer:
      'Our Essential Checking account has no monthly fees and no minimum balance requirement. Premium and Business accounts may have nominal fees that are easily waived by maintaining a minimum balance or setting up direct deposit. We believe in transparent pricing with no hidden charges.',
  },
  {
    question: 'Can I access my account internationally?',
    answer:
      'Yes. VaultEdge Bank accounts can be accessed worldwide through our mobile app and online banking portal. We offer fee-free ATM withdrawals at over 40,000 locations globally, and our currency conversion rates are among the most competitive in the industry.',
  },
];

export default function FAQSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Everything you need to know about banking with VaultEdge. Can&apos;t find what you&apos;re
            looking for? Contact our support team.
          </p>
        </div>

        <div className="max-w-3xl mx-auto rounded-xl border border-white/10 dark:border-white/10 bg-white/5 dark:bg-white/5 backdrop-blur">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-b border-white/10 dark:border-white/10 last:border-b-0"
              >
                <AccordionTrigger className="px-6 py-4 text-left text-gray-900 dark:text-white hover:no-underline hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
