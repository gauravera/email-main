"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Sparkles, Zap, Shield, BarChart2 } from "lucide-react";
import { toast } from "sonner";

const features = [
    { icon: Sparkles, title: "AI-Personalized Emails", desc: "Gemini writes a unique email for every recipient." },
    { icon: Zap, title: "Bulk Dispatch", desc: "Send thousands of emails directly from your Gmail." },
    { icon: Shield, title: "Your Data, Your Inbox", desc: "Emails go out from your own account — no shared relays." },
    { icon: BarChart2, title: "Campaign Tracking", desc: "Every campaign and draft is saved to your account." },
];

export default function SignInPage() {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const error = params.get("error");
            
            if (error === "MissingPermissions") {
                toast.error("Please grant the requested permissions to continue.");
                if (status === "authenticated") {
                    signOut({ callbackUrl: "/auth/signin" });
                } else {
                    router.replace("/auth/signin");
                }
            } else if (status === "authenticated") {
                router.push("/");
            }
        }
    }, [status, router]);

    if (status === "loading") return null;

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left: Branding Panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1a1040] via-[#0f0a30] to-[#050505] p-12 flex-col justify-between relative overflow-hidden">
                {/* Blurred glow accents */}
                <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-16">
                        <Image src="/logo.jpg" alt="Logo" width={80} height={80} className="w-20 h-20 object-contain rounded-xl shadow-lg shadow-indigo-500/20 border border-white/10 bg-white" priority />
                        <span className="text-3xl font-bold text-white tracking-tight">Mail by GPSERP</span>
                    </div>

                    <h1 className="text-4xl font-bold text-white leading-tight mb-4">
                        Turn cold emails into<br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
                            warm conversations.
                        </span>
                    </h1>
                    <p className="text-white/60 text-lg leading-relaxed max-w-sm">
                        Upload your contacts, write one prompt, and let Gemini craft a perfectly personalized email for every single person.
                    </p>
                </div>

                <div className="relative z-10 grid grid-cols-1 gap-4">
                    {features.map((f, i) => (
                        <motion.div
                            key={f.title}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + i * 0.1 }}
                            className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
                        >
                            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 shrink-0">
                                <f.icon className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">{f.title}</p>
                                <p className="text-xs text-white/50 mt-0.5">{f.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Right: Sign-in Panel */}
            <div className="flex-1 flex items-center justify-center p-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    {/* Mobile logo */}
                    <div className="flex items-center gap-4 mb-10 lg:hidden">
                        <Image src="/logo.jpg" alt="Logo" width={64} height={64} className="w-16 h-16 object-contain rounded-xl shadow-md bg-white border border-border" priority />
                        <span className="text-2xl font-bold text-foreground">Mail by GPSERP</span>
                    </div>

                    <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back</h2>
                    <p className="text-muted-foreground mb-8">
                        Connect your Google account to get started. We'll only use Gmail to send the emails you approve.
                    </p>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => signIn("google", { callbackUrl: "/" })}
                        className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl border border-border bg-card hover:bg-secondary transition-colors text-foreground font-semibold shadow-sm group"
                    >
                        {/* Google Logo SVG */}
                        <svg viewBox="0 0 24 24" className="w-5 h-5">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </motion.button>

                    <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
                        By continuing, you agree to our{" "}
                        <a href="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</a>
                        {" "}and{" "}
                        <a href="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</a>.
                        <br />
                        We request Gmail Send permission — we never read your inbox.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
