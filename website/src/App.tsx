import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Hero from './components/Hero';
import PrivacyPolicy from './pages/PrivacyPolicy';

function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Hero />
      <footer className="bg-black py-6 text-center text-neutral-600 text-xs border-t border-neutral-900">
        <div className="flex gap-4 justify-center mt-2">
          <Link to="/privacy" className="hover:text-emerald-500 transition-colors">Privacy Policy</Link>
          <a href="mailto:support@splitsync.app" className="hover:text-emerald-500 transition-colors">Contact</a>
        </div>
        <p className="mt-4">© 2026 SplitSync. All rights reserved.</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
