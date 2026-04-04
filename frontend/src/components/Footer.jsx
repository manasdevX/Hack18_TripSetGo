export default function Footer() {
  return (
    <footer className="mt-auto py-6 border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
        <p>© 2026 TripSetGo. AI-Powered Travel.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-slate-800 transition-colors">
            Help Center
          </a>
          <a href="#" className="hover:text-slate-800 transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-slate-800 transition-colors">
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
}
