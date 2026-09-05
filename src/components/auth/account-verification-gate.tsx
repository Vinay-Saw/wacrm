"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Clock,
  CalendarX2,
  RefreshCw,
  Mail,
  LogOut,
  ShieldCheck,
  Building2,
} from "lucide-react";

interface AccountVerificationGateProps {
  status: "pending" | "expired";
  tillDate: string | null;
}

export function AccountVerificationGate({
  status,
  tillDate,
}: AccountVerificationGateProps) {
  const { signOut, refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      await refreshProfile();
      // Give a tiny moment for context to recalculate
      setTimeout(() => {
        setChecking(false);
      }, 600);
    } catch {
      setChecking(false);
      toast.error("Could not check account status. Please try again.");
    }
  };

  const formattedDate = tillDate
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(tillDate))
    : "recently";

  const isPending = status === "pending";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Subtle radial ambient gradients */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[650px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/15 via-amber-500/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 -z-10 h-[400px] w-[500px] rounded-full bg-gradient-to-br from-primary/10 via-rose-500/5 to-transparent blur-3xl" />

      {/* Brand Header */}
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-emerald-400 shadow-lg shadow-primary/20">
          <Building2 className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-foreground font-sans">
            Automa CRM
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            WhatsApp CRM & Automation
          </span>
        </div>
      </div>

      {/* Main Status Card */}
      <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card/90 p-8 shadow-2xl backdrop-blur-xl transition-all">
        <div className="flex flex-col items-center text-center">
          {/* Status Badge Icon */}
          <div
            className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-inner ${
              isPending
                ? "border border-amber-500/30 bg-amber-500/10 text-amber-500 ring-8 ring-amber-500/5"
                : "border border-rose-500/30 bg-rose-500/10 text-rose-500 ring-8 ring-rose-500/5"
            }`}
          >
            {isPending ? (
              <Clock className="h-8 w-8 animate-pulse" />
            ) : (
              <CalendarX2 className="h-8 w-8" />
            )}
          </div>

          {/* Status Pill */}
          <div
            className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              isPending
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
            }`}
          >
            {isPending ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                Pending Verification
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Access Expired
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isPending
              ? "Account Pending Verification"
              : "Workspace Access Expired"}
          </h1>

          {/* Body description */}
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {isPending ? (
              <>
                Welcome! Your account is pending verification by the Automa team.
                We will activate your workspace shortly.
              </>
            ) : (
              <>
                Your workspace access expired on{" "}
                <span className="font-semibold text-foreground">
                  {formattedDate}
                </span>
                . Please contact our team to extend your subscription or
                reactivate access.
              </>
            )}
          </p>

          {/* Security & Verification Callout */}
          <div className="mt-6 flex w-full items-start gap-3 rounded-xl border border-border/60 bg-muted/40 p-3.5 text-left text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              {isPending
                ? "Our administrators manually review and provision every workspace to guarantee dedicated WhatsApp API throughput and security."
                : "Your customer records, message history, pipelines, and WhatsApp configuration remain safely preserved in your workspace."}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row sm:items-center">
            <Button
              id="gate-check-status-btn"
              onClick={handleCheckStatus}
              disabled={checking}
              className="flex-1 gap-2 font-medium"
            >
              <RefreshCw
                className={`h-4 w-4 ${checking ? "animate-spin" : ""}`}
              />
              {checking ? "Checking..." : "Check Status"}
            </Button>

            <a
              id="gate-contact-support-btn"
              href="mailto:inquiry@automastudio.in?subject=Automa%20CRM%20Workspace%20Activation"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({
                variant: "outline",
                className: "flex-1 gap-2",
              })}
            >
              <Mail className="h-4 w-4" />
              Contact Support
            </a>
          </div>

          {/* Sign Out Button */}
          <button
            id="gate-sign-out-btn"
            type="button"
            onClick={() => signOut()}
            className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign in with a different account
          </button>
        </div>
      </div>

      {/* Footer copyright */}
      <p className="mt-8 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Automa Studio. All rights reserved.
      </p>
    </div>
  );
}
