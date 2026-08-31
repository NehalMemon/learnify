"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-[75vh] items-center justify-center px-4 py-12 font-sans antialiased text-slate-900">
      <Card className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-md text-center">
        <CardContent className="space-y-6 pt-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Payment Proof Submitted!</h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Thank you for submitting your payment proof. Our administration team has received your request and will verify the bank transaction shortly.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-left flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p className="text-xs text-amber-900 leading-relaxed">
              Verification typically takes <strong>1–3 hours</strong>. You will gain full access to your class materials as soon as your payment request is approved.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Link href="/dashboard">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5">
                Go to Dashboard
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/my-courses">
              <Button variant="outline" className="w-full text-xs font-semibold">
                View My Courses
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
