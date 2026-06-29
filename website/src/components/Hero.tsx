import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

// Live typing simulation
const scenarios = [
  { city: 'Goa Villa',        total: 48000, people: 4, currency: '₹' },
  { city: 'Bali Airbnb',      total: 72000, people: 6, currency: '₹' },
  { city: 'Manali Homestay',  total: 18000, people: 3, currency: '₹' },
  { city: 'Paris Apartment',  total:  1200, people: 4, currency: '€' },
];

interface MemberRowProps {
  name: string;
  amount: number;
  status: string;
  currency: string;
  delay?: number;
}

// Animated payment status item
function MemberRow({ name, amount, status, currency, delay = 0 }: MemberRowProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : 10 }}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-3 rounded-lg p-2.5 border transition-all ${
        status === 'paid'
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-amber-500/5 border-amber-500/20 border-l-2 border-l-amber-400'
      }`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
      }`}>
        {name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold">{name}</p>
        <p className="text-neutral-500 text-[11px]">{currency}{amount.toLocaleString()}</p>
      </div>
      {status === 'paid' ? (
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20">
          ✓ Paid
        </span>
      ) : (
        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse border border-amber-500/20">
          Pending
        </span>
      )}
    </motion.div>
  );
}

// The live product mockup
function ProductMockup() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [paidState, setPaidState] = useState([true, true, false]);
  const scenario = scenarios[scenarioIdx];
  const perPerson = Math.ceil(scenario.total / scenario.people);

  // Cycle scenarios
  useEffect(() => {
    const t = setInterval(() => {
      setScenarioIdx(i => (i + 1) % scenarios.length);
      setPaidState([true, true, false]);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // Auto-pay the third member after 3s
  useEffect(() => {
    const t = setTimeout(() => {
      setPaidState([true, true, true]);
    }, 3000);
    return () => clearTimeout(t);
  }, [scenarioIdx]);

  const members = [
    { name: 'You', status: paidState[0] ? 'paid' : 'pending' },
    { name: 'Rahul S.', status: paidState[1] ? 'paid' : 'pending' },
    { name: 'Priya K.', status: paidState[2] ? 'paid' : 'pending' },
  ];
  const paidCount = members.filter(m => m.status === 'paid').length;
  const allPaid   = paidCount === members.length;

  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-4 bg-emerald-500/10 rounded-3xl blur-2xl pointer-events-none" />

      {/* Card */}
      <div className="relative bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center text-[10px]">✈</div>
          <span className="text-white font-bold text-xs">SplitSync</span>
          <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Live
          </span>
        </div>

        {/* Property */}
        <AnimatePresence mode="wait">
          <motion.div
            key={scenario.city}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="bg-neutral-800/60 rounded-xl p-3 mb-4 border border-neutral-800"
          >
            <p className="text-white font-semibold text-sm">{scenario.city}</p>
            <div className="flex justify-between items-center mt-2">
              <div>
                <p className="text-neutral-500 text-[10px]">Total</p>
                <p className="text-white font-bold">{scenario.currency}{scenario.total.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-neutral-500 text-[10px]">Per person ({scenario.people})</p>
                <p className="text-emerald-400 font-bold">{scenario.currency}{perPerson.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Members */}
        <div className="space-y-2 mb-4">
          {members.map((m, i) => (
            <MemberRow
              key={`${scenarioIdx}-${m.name}`}
              name={m.name}
              amount={perPerson}
              status={m.status}
              currency={scenario.currency}
              delay={i * 100}
            />
          ))}
        </div>

        {/* Progress */}
        <div className="bg-neutral-800/60 rounded-lg p-2.5 border border-neutral-800">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-neutral-500">{paidCount}/{members.length} paid</span>
            <span className="text-[10px] text-neutral-500">
              {allPaid ? '🎉 Ready to book!' : 'Waiting...'}
            </span>
          </div>
          <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              animate={{ width: `${(paidCount / members.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {allPaid && (
          <motion.button
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 w-full py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-sm"
          >
            🎉 Unlock Booking Button
          </motion.button>
        )}
      </div>
    </div>
  );
}

interface StepProps {
  number: string | number;
  title: string;
  desc: string;
}

// Step card
function Step({ number, title, desc }: StepProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm flex-shrink-0">
          {number}
        </div>
        <p className="text-white font-semibold text-sm">{title}</p>
      </div>
      <p className="text-neutral-500 text-sm pl-11">{desc}</p>
    </div>
  );
}

interface QuoteProps {
  text: string;
  author: string;
  trip: string;
}

// Testimonial
function Quote({ text, author, trip }: QuoteProps) {
  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
      <p className="text-neutral-300 text-sm leading-relaxed mb-3">"{text}"</p>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-400 text-[10px] font-bold">
          {author[0]}
        </div>
        <div>
          <p className="text-white text-xs font-semibold">{author}</p>
          <p className="text-neutral-600 text-[10px]">{trip}</p>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const CHROME_STORE_URL = 'https://chromewebstore.google.com/search/splitsync';

  return (
    <div className="bg-[#080808] text-white font-sans overflow-hidden">

      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <div className="relative min-h-screen flex items-center px-6 sm:px-12 py-20">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/8 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-7"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-semibold tracking-wide">Free Chrome Extension</span>
            </div>

            <div>
              <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.05] mb-4">
                Stop being{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
                    the friend
                  </span>
                  <span className="absolute inset-x-0 bottom-1 h-3 bg-emerald-500/15 -z-0 rounded" />
                </span>
                <br />
                who fronts the bill.
              </h1>
              <p className="text-lg text-neutral-400 leading-relaxed max-w-lg">
                SplitSync makes everyone pay <em>before</em> you book. No more
                chasing friends for their share. No more awkward WhatsApp messages.
                Works on Airbnb and MakeMyTrip.
              </p>
            </div>

            {/* Pain → solution */}
            <div className="flex flex-col gap-2">
              {[
                { bad: 'Fronting ₹40,000 for a Goa villa',     good: 'Everyone pays before you click Book' },
                { bad: 'Chasing "I\'ll pay you back" for weeks', good: 'UPI request sent instantly to each person' },
                { bad: 'Arguments about who owes what',          good: 'Cost split calculated automatically' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-red-400/70 line-through text-neutral-600">{item.bad}</span>
                  <span className="text-neutral-700">→</span>
                  <span className="text-emerald-400">{item.good}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group px-7 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-base transition-all flex items-center gap-2.5 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
              >
                Add to Chrome — Free
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
              <div className="flex flex-col gap-0.5 pt-1">
                <p className="text-xs text-neutral-500">No account required · 2 minute setup</p>
                <p className="text-xs text-neutral-600">Works on Airbnb & MakeMyTrip</p>
              </div>
            </div>
          </motion.div>

          {/* Right — live mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-sm mx-auto w-full lg:ml-auto"
          >
            <ProductMockup />
            <p className="text-center text-[10px] text-neutral-700 mt-3">
              ↑ Live demo — watch Priya's payment come in
            </p>
          </motion.div>
        </div>
      </div>

      {/* ─── How it works ────────────────────────────────────────────────────── */}
      <div className="px-6 sm:px-12 py-20 bg-neutral-900/30 border-t border-neutral-900">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-4">How it works</p>
          <h2 className="text-3xl font-black mb-12">From link to paid in 3 steps</h2>
          <div className="flex flex-col gap-8">
            <Step
              number="1"
              title="Open any Airbnb or MakeMyTrip listing"
              desc="SplitSync automatically detects the property title and total cost — no copy-pasting needed."
            />
            <Step
              number="2"
              title="Share your session ID on WhatsApp"
              desc='One tap generates a WhatsApp message with instructions. Friends install the extension, paste the ID, and join your session.'
            />
            <Step
              number="3"
              title="Lock the session and collect payment"
              desc="Each person confirms their share via UPI. Once everyone has paid, the Airbnb booking button unlocks. You book knowing you're already covered."
            />
          </div>
        </div>
      </div>

      {/* ─── Testimonials ────────────────────────────────────────────────────── */}
      <div className="px-6 sm:px-12 py-20 border-t border-neutral-900">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-4">Early users</p>
          <h2 className="text-3xl font-black mb-8">What people say</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Quote
              text="Finally someone solved this. I always ended up fronting ₹30k+ for group trips. SplitSync changed that."
              author="Arjun M."
              trip="Goa trip, 5 people"
            />
            <Quote
              text="The WhatsApp share button is genius. My friends actually paid before I booked for once."
              author="Sneha R."
              trip="Coorg homestay, 4 people"
            />
          </div>
        </div>
      </div>

      {/* ─── Bottom CTA ──────────────────────────────────────────────────────── */}
      <div className="px-6 sm:px-12 py-24 text-center border-t border-neutral-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-500/5 blur-[80px]" />
        </div>
        <div className="relative max-w-lg mx-auto">
          <h2 className="text-4xl font-black mb-4">
            Your next group trip starts here.
          </h2>
          <p className="text-neutral-500 text-base mb-8">
            Free forever for up to 3 sessions/month. Pro plan coming soon.
          </p>
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-base transition-all shadow-[0_0_60px_rgba(16,185,129,0.3)]"
          >
            Add to Chrome — It's Free
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
          <p className="text-neutral-700 text-xs mt-4">Works on Airbnb · MakeMyTrip · More platforms coming</p>
        </div>
      </div>

    </div>
  );
}
