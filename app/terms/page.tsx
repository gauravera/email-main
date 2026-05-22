import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Mail by GPSERP',
  description: 'Terms of Service for Mail by GPSERP, an AI-powered email outreach tool.',
};

export default function TermsOfService() {
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
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated: May 22, 2026 &nbsp;|&nbsp; App: <strong className="text-foreground">Mail by GPSERP</strong>
          </p>
        </div>

        {/* Content sections */}
        <div className="space-y-10 text-sm sm:text-base leading-relaxed text-muted-foreground">
          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">1. Agreement to Terms</h2>
            <p className="mb-4">
              By accessing or using <strong>Mail by GPSERP</strong> (<a href="https://mail.gpserp.com" className="text-primary hover:underline font-medium">https://mail.gpserp.com</a>), 
              you agree to be bound by these Terms of Service and all applicable local, national, and international laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing our software interface.
            </p>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">2. Use License &amp; Restrictions</h2>
            <p className="mb-4">
              Permission is granted to access our software platform to manage your active email outreach, campaigns, and inbox tracking. Under this license, you agree NOT to:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>Attempt to decompile, reverse engineer, or extract the source code of any proprietary components contained within the application.</li>
              <li>Use the platform or its automated AI features to conduct unsolicited commercial email campaigns (spam) in violation of the CAN-SPAM Act, GDPR, or other local anti-spam regulations.</li>
              <li>Transfer or mirror the software materials, templates, or design assets on any other server or interface without prior written authorization.</li>
              <li>Abuse the generative AI features or use prompts designed to generate malicious code, phishing scripts, or abusive materials.</li>
            </ul>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">3. Gmail Integration &amp; Campaign Responsibility</h2>
            <p className="mb-4">
              Our platform connects directly with your Gmail account via secure OAuth credentials. 
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>You are solely responsible for the configuration of your campaign limits, schedules, and recipient selections.</li>
              <li>You acknowledge that Gmail enforces daily sending thresholds and account security standards. We are not responsible for any domain reputation damage, email suspension, or Google account limitations resulting from your outreach activity.</li>
              <li>You agree to comply with Google's Acceptable Use Policies and Developer Terms of Service at all times.</li>
            </ul>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">4. Disclaimer of Warranties</h2>
            <p className="mb-4">
              The application and all generated email content are provided on an &quot;as is&quot; and &quot;as available&quot; basis. We make no express or implied warranties regarding:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The absolute accuracy or conversion performance of AI-generated outreach templates.</li>
              <li>Uninterrupted access to Google APIs, or the guarantee that recipient email servers will accept transmissions.</li>
              <li>Complete preservation of temporary in-memory dashboard states during backend system updates.</li>
            </ul>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">5. Limitation of Liability</h2>
            <p className="mb-4">
              In no event shall <strong>Mail by GPSERP</strong>, its operators, or suppliers be liable for any consequential, indirect, or incidental damages (including, without limitation, loss of business profits, domain suspension, or operational downtime) arising out of the use or inability to use the outreach interface.
            </p>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">6. Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right to revise or update these Terms of Service at any time without prior notice. By continuing to use the software following modifications, you agree to be bound by the then-current version of these terms.
            </p>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">7. Contact Support</h2>
            <p className="mb-4">
              If you have any questions or require support regarding these Terms of Service, please contact us at:
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
            <Link href="/privacy" className="hover:text-foreground transition-colors font-medium">Privacy Policy</Link>
          </div>
          <div>
            <strong>Mail by GPSERP</strong> &copy; {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}
