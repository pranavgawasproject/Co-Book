import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-neutral-300 font-sans py-20 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl text-white font-bold mb-4">Privacy Policy</h1>
        <p className="text-neutral-500 mb-8">Last updated: March 1, 2026</p>

        <div className="space-y-8 leading-relaxed">
          <section>
            <h2 className="text-2xl text-white font-semibold mb-3">1. Introduction</h2>
            <p>
              Welcome to SplitSync. We respect your privacy and are committed to protecting the personal data of our users. 
              This Privacy Policy explains how SplitSync ("we", "our", or "the Extension") collects, uses, and safeguards your 
              information when you use our Chrome Extension and associated services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl text-white font-semibold mb-3">2. Data We Collect The "Single Purpose"</h2>
            <p className="mb-3">
              SplitSync is built with a strict "Single Purpose" principle: <strong>to allow users to track, vote on, and evenly split the cost of travel properties on partnered sites among a group of friends.</strong>
            </p>
            <p className="mb-3">To accomplish this, we collect the minimum amount of data necessary:</p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-400">
              <li><strong>Profile Information:</strong> We store the Display Name and UPI ID/Payment Handle you voluntarily provide in the extension popup. This is shared only within active sessions you join to facilitate peer-to-peer reimbursement.</li>
              <li><strong>Authentication Data:</strong> We utilize secure Supabase backend authentication to generate unique user IDs, linking your profile securely to your sessions.</li>
              <li><strong>Browser/Website Content:</strong> When you initiate or vote in a session on a supported platform (e.g., Airbnb, MakeMyTrip), our extension temporarily reads the DOM to extract the <strong>property title, page URL, and total price</strong> to calculate the split cost.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl text-white font-semibold mb-3">3. How We Use Your Data</h2>
            <p className="mb-3">Your data is strictly used to provide the core functionality of SplitSync:</p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-400">
              <li>To synchronize the active session status across your tabs using Chrome Local Storage.</li>
              <li>To broadcast payment statuses and voting changes in real-time to the friends in your active session.</li>
            </ul>
            <p className="mt-3 font-semibold text-emerald-400">
              We do not sell your personal data to third parties, nor do we use it for advertising, credit scoring, or lending.
            </p>
          </section>

          <section>
            <h2 className="text-2xl text-white font-semibold mb-3">4. Permissions Required</h2>
            <p className="mb-3">The SplitSync extension requests specific browser permissions, justified as follows:</p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-400">
              <li><code>storage</code>: Used strictly to save your active Session ID and Profile details locally, allowing seamless navigation without losing your current split session.</li>
              <li><code>activeTab</code>: Required so you can open and interact with the SplitSync interface while viewing travel listings.</li>
              <li><strong>Host Permissions</strong>: Required to read the basic property details (title and cost) directly from the travel platform's webpage to auto-calculate the split.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl text-white font-semibold mb-3">5. Data Retention & Deletion</h2>
            <p>
              Session data and voting history are stored securely on our Supabase backend. Users can delete past sessions from their "My Trips" history at any time. If you wish to completely delete your profile and all associated data, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl text-white font-semibold mb-3">6. Cookies and Tracking</h2>
            <p>
              SplitSync does not track your routine browsing history or use third-party marketing cookies. We only interact with pages when you explicitly create or interact with a SplitSync session.
            </p>
          </section>

          <section>
            <h2 className="text-2xl text-white font-semibold mb-3">7. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or our data practices, please reach out via our primary 
              communication channels on the SplitSync homepage.
            </p>
          </section>

          <div className="pt-8 mt-8 border-t border-neutral-800">
            <Link to="/" className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-2 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
