import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Mail by GPSERP',
  description: 'Privacy policy for Mail by GPSERP, an AI-powered email outreach tool.',
};

export default function PrivacyPolicy() {
  return (
    <div className="w-full h-screen overflow-y-auto bg-background text-foreground">
      <div className="max-w-4xl mx-auto py-16 px-6 sm:px-8 w-full">
        {/* Back Link */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-accent transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Header Block */}
        <div className="mb-12 border-b border-border pb-8">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-accent to-purple-500 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated: May 22, 2026 &nbsp;|&nbsp; App: <strong className="text-foreground">Mail by GPSERP</strong>
          </p>
        </div>

        {/* Content sections */}
        <div className="space-y-10 text-sm sm:text-base leading-relaxed text-muted-foreground">
          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">1. Introduction</h2>
            <p className="mb-4">
              Welcome to <strong>Mail by GPSERP</strong> (<a href="https://mail.gpserp.com" className="text-primary hover:underline font-medium">https://mail.gpserp.com</a>).
              We are deeply committed to protecting your personal data and respect your privacy. This policy explains how we collect, use, and safeguard your information
              when you use our AI-powered email outreach platform.
            </p>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">2. Data We Collect</h2>
            <p className="mb-4">
              When you authenticate with our app using your Google Account, we collect and process only the minimum required data necessary to perform our service:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong className="text-foreground">Google Account Profile</strong>: your name, email address, and profile photo (retrieved via secure Google OAuth).
              </li>
              <li>
                <strong className="text-foreground">Gmail Access Permission</strong>: We request the <code>https://www.googleapis.com/auth/gmail.modify</code> scope. This secure integration allows us to display your outreach inbox, monitor inbound replies or bounce notifications, draft and send personalized campaigns, and toggle read/unread status on your behalf.
              </li>
              <li>
                <strong className="text-foreground">Uploaded Campaign Data</strong>: Recipient details (such as names and email addresses) that you provide via CSV upload or manual text input to personalize your outreach. This data is handled in-memory and is never shared.
              </li>
            </ul>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">3. How We Use Your Data</h2>
            <p className="mb-4">
              We process your data strictly to enable the features of our email outreach service:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>To authenticate you securely via Google OAuth and manage your active application session.</li>
              <li>To display and synchronize your outreach inbox threads, tracking client responses in real time.</li>
              <li>To compose, send, and manage the read/unread statuses of campaign emails through your Gmail account.</li>
              <li>To auto-detect delivery failures (e.g. bounce responses from mailer-daemon) to provide accurate outreach delivery metrics.</li>
              <li>To generate personalized, high-converting email copy powered by the AI model of your choice.</li>
            </ul>
            <p className="mt-4 border-t border-border pt-4 text-sm font-semibold text-foreground">
              We do NOT sell, lease, rent, or distribute your email content or personal data to third parties, advertising networks, or data brokers.
            </p>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">4. Google API Services — Limited Use Disclosure</h2>
            <p className="mb-4">
              <strong>Mail by GPSERP</strong>'s use and transfer of information received from Google APIs to any other app will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                className="text-primary hover:underline font-medium"
                target="_blank"
                rel="noreferrer"
              >
                Google API Services User Data Policy
              </a>
              , including the <strong>Limited Use</strong> requirements.
            </p>
            <p className="mt-2">
              Specifically: Data obtained from Google APIs is used strictly to provide the email automation interface and is never utilized to develop, refine, or train generalized, consumer-facing AI/ML models.
            </p>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">5. Data Retention &amp; Security</h2>
            <p className="mb-4">
              OAuth tokens are encrypted and stored in your secure user session. We transiently cache inbox and thread details to render your active dashboard. We do not maintain copies of your email messages, templates, or outreach contents on our servers beyond what is required to transmit drafts and track campaign statistics.
            </p>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">6. Your Rights &amp; Access Revocation</h2>
            <p className="mb-4">
              You are in full control of your Google integrations. You may disconnect your Gmail account or completely revoke our platform access at any time through your{' '}
              <a href="https://myaccount.google.com/permissions" className="text-primary hover:underline font-medium" target="_blank" rel="noreferrer">
                Google Security Permissions console
              </a>. Once access is revoked, we will immediately lose the ability to send emails or sync threads on your behalf.
            </p>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">7. Contact Us</h2>
            <p className="mb-4">
              If you have any questions, feedback, or concerns regarding our privacy practices or data handling, please reach out to us:
            </p>
            <a href="mailto:support@gpserp.com" className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-muted transition-colors">
              support@gpserp.com
            </a>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex gap-4">
            <Link href="/" className="hover:text-foreground transition-colors font-medium">Home</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-foreground transition-colors font-medium">Terms of Service</Link>
          </div>
          <div>
            <strong>Mail by GPSERP</strong> &copy; {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}
