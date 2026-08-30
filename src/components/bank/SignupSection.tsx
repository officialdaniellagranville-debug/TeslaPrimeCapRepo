'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, GraduationCap, Briefcase } from 'lucide-react';

interface SignupSectionProps {
  onNavigate: (page: string) => void;
}

const accountTypes = [
  {
    id: 'personal',
    title: 'Personal',
    description: 'Everyday banking for individuals with competitive rates and full digital access.',
    icon: User,
  },
  {
    id: 'student',
    title: 'Student',
    description: 'No minimum balance, no monthly fees, plus exclusive student benefits.',
    icon: GraduationCap,
  },
  {
    id: 'business',
    title: 'Business',
    description: 'Tailored solutions for businesses with dedicated support and higher limits.',
    icon: Briefcase,
  },
];

export default function SignupSection({ onNavigate }: SignupSectionProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    accountType: 'personal',
    termsAccepted: false,
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleCreateAccount = () => {
    onNavigate('dashboard');
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-10">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step <= currentStep
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step < currentStep ? '\u2713' : step}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 hidden sm:block">
                  {step === 1 ? 'Personal Info' : step === 2 ? 'Account Type' : 'Verify'}
                </span>
              </div>
              {step < 3 && (
                <div
                  className={`w-16 sm:w-24 h-0.5 mx-2 transition-colors ${
                    step < currentStep ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-white/10'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="border rounded-2xl p-8 bg-white dark:bg-[#111827]">
          {/* Step 1 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Personal Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    placeholder="John"
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    placeholder="Doe"
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="john@example.com"
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Choose Account Type</h2>
              <div className="space-y-3">
                {accountTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.accountType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => updateField('accountType', type.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                          : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-emerald-500/50'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-emerald-500' : 'bg-gray-100 dark:bg-white/10'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                          {type.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{type.description}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                          isSelected ? 'border-emerald-500' : 'border-gray-300 dark:border-white/20'
                        }`}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Verify & Create</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Review your information and agree to our terms to create your account.
              </p>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Name</span>
                  <span className="text-gray-900 dark:text-white font-medium">{formData.firstName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Email</span>
                  <span className="text-gray-900 dark:text-white font-medium">{formData.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Phone</span>
                  <span className="text-gray-900 dark:text-white font-medium">{formData.phone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Account</span>
                  <span className="text-gray-900 dark:text-white font-medium capitalize">{formData.accountType}</span>
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.termsAccepted}
                  onChange={(e) => updateField('termsAccepted', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  I agree to the{' '}
                  <span className="text-emerald-500 hover:underline cursor-pointer">Terms of Service</span>{' '}
                  and{' '}
                  <span className="text-emerald-500 hover:underline cursor-pointer">Privacy Policy</span>
                </span>
              </label>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {currentStep > 1 ? (
              <Button type="button" variant="outline" onClick={handleBack} className="rounded-xl px-6">Back</Button>
            ) : (
              <div />
            )}
            {currentStep < 3 ? (
              <Button type="button" onClick={handleNext} className="bg-emerald-500 text-white rounded-xl px-8 hover:bg-emerald-600 transition-colors font-semibold">Next</Button>
            ) : (
              <Button type="button" onClick={handleCreateAccount} disabled={!formData.termsAccepted} className="bg-emerald-500 text-white rounded-xl px-8 hover:bg-emerald-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed">Create Account</Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
