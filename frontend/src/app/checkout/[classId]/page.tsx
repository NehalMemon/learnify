"use client";

import React, { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Copy,
  CreditCard,
  FileCheck,
  HelpCircle,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { CloudinaryUploader } from "@/components/ui/CloudinaryUploader";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@/components/ui";

interface CheckoutPageProps {
  params: Promise<{ classId: string }>;
}

export default function CheckoutPage({ params }: CheckoutPageProps) {
  const { classId } = use(params);
  const router = useRouter();

  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  // Class Details (Fallback placeholder or fetched details)
  const classDetails = {
    id: classId,
    title: "Advanced Medical Physiology & Clinical Case Studies",
    instructor: "Dr. Sarah Khan, MBBS, FCPS",
    priceFormatted: "$150.00",
    features: [
      "Access to 24+ Live Interactive Sessions",
      "Comprehensive Study Notes & Slides",
      "High-Yield Clinical Case Reviews",
      "Official Certificate of Completion",
    ],
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (currentUser) {
          setUser({ id: currentUser.id, email: currentUser.email });
        }
      } catch (err) {
        console.error("Error verifying user session:", err);
      }
    };

    checkAuth();
  }, []);

  const handleCopyAccount = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handlePaymentSuccess = (url: string) => {
    setReceiptUrl(url);
    toast.success("Payment receipt uploaded successfully!");
  };

  const handleSubmitEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receiptUrl) {
      toast.error("Please upload your payment receipt before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      let currentUserId = user?.id;

      if (!currentUserId) {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) {
          toast.error("You must be logged in to submit an enrollment request.");
          router.push("/login");
          return;
        }
        currentUserId = authUser.id;
      }

      // Write record to payment_requests table in Supabase
      const { error } = await supabase
        .from("payment_requests")
        .insert({
          class_id: classId,
          user_id: currentUserId,
          receipt_url: receiptUrl,
          status: "PENDING",
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Error inserting payment_requests record:", error);
        toast.error(`Submission error: ${error.message}`);
      } else {
        toast.success("Enrollment request submitted successfully!");
        router.push("/checkout/success");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during submission.";
      console.error("Unexpected error submitting payment request:", err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const paymentsPreset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_PAYMENTS;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 font-sans text-slate-900 antialiased">
      <Toaster position="top-center" toastOptions={{ style: { background: "#0f172a", color: "#fff" } }} />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Secure Checkout</span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Complete Your Enrollment</h1>
          </div>
        </div>

        <div className="hidden items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full sm:flex">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Bank Transfer Verification
        </div>
      </div>

      {/* Two-Column Responsive Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Side: Order Summary */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="rounded-xl border border-slate-200/90 bg-white shadow-xs">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px] font-bold">
                  Class Enrollment
                </Badge>
                <span className="text-xs font-semibold text-slate-400">ID: {classId.slice(0, 8)}</span>
              </div>
              <CardTitle className="mt-2 text-lg font-bold text-slate-950 leading-snug">
                {classDetails.title}
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                Instructor: {classDetails.instructor}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-5">
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">What&apos;s Included:</h4>
                <ul className="space-y-2 text-xs text-slate-700">
                  {classDetails.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Class Fee</span>
                  <span className="font-semibold text-slate-900">{classDetails.priceFormatted}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Processing Fee</span>
                  <span className="font-semibold text-emerald-600">FREE ($0.00)</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-extrabold text-slate-950">
                  <span>Total Amount Due</span>
                  <span className="text-indigo-600">{classDetails.priceFormatted}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-blue-50/60 border border-blue-100 p-3 rounded-lg">
                <HelpCircle className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                <span>
                  After submitting your payment proof, our administration team will verify the transaction and activate your class access within 1-3 hours.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Payment Instructions & Cloudinary Upload */}
        <div className="space-y-6 lg:col-span-7">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-4.5 w-4.5 text-indigo-600" />
                1. Payment Instructions
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Please transfer <strong className="text-slate-900">{classDetails.priceFormatted}</strong> to the official bank account details below.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bank Name</span>
                    <p className="text-sm font-bold text-slate-900">Meezan Bank Limited</p>
                  </div>
                  <Badge className="bg-indigo-600 text-white text-[10px]">Official Account</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-indigo-100/80">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Account Title</span>
                    <p className="text-xs font-bold text-slate-900">Learnify LMS Pvt Ltd</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Account Number</span>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-mono font-bold text-slate-900">0102 9384 7561 00</p>
                      <button
                        type="button"
                        onClick={() => handleCopyAccount("01029384756100")}
                        className="text-slate-500 hover:text-indigo-600 transition-colors p-1 cursor-pointer"
                        title="Copy Account Number"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">IBAN</span>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-mono font-bold text-slate-900">PK36 MEZN 0001 0293 8475 6100</p>
                    <button
                      type="button"
                      onClick={() => handleCopyAccount("PK36MEZN0001029384756100")}
                      className="text-slate-500 hover:text-indigo-600 transition-colors p-1 cursor-pointer"
                      title="Copy IBAN"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Proof & Submission Form */}
          <form onSubmit={handleSubmitEnrollment}>
            <Card className="rounded-xl border border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-4.5 w-4.5 text-indigo-600" />
                  2. Upload Payment Receipt
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Upload your transaction receipt or deposit slip image using the Cloudinary widget.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center transition-colors hover:border-indigo-300">
                  {receiptUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative h-32 w-48 overflow-hidden rounded-lg border border-emerald-300 shadow-xs">
                        <Image
                          src={receiptUrl}
                          alt="Uploaded Payment Receipt"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        <FileCheck className="h-4 w-4 text-emerald-600" />
                        Receipt Attached
                      </div>
                      <CloudinaryUploader
                        preset={paymentsPreset}
                        onSuccess={handlePaymentSuccess}
                        buttonText="Change Receipt Image"
                        className="bg-slate-800 hover:bg-slate-900 text-xs py-1.5 px-3 shadow-xs"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600">
                          PNG, JPG or WEBP proof image
                        </p>
                      </div>
                      <CloudinaryUploader
                        preset={paymentsPreset}
                        onSuccess={handlePaymentSuccess}
                        buttonText="Upload Payment Receipt"
                        className="bg-indigo-600 hover:bg-indigo-700 text-xs py-2.5 px-5 shadow-xs font-semibold"
                      />
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    {receiptUrl ? "Receipt ready. Click to submit enrollment." : "Upload receipt to enable submission."}
                  </span>

                  <Button
                    type="submit"
                    disabled={!receiptUrl || submitting}
                    isLoading={submitting}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-6 min-w-[160px] shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Submitting..." : "Submit Enrollment"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </main>
  );
}
