import React from 'react';
import { Github, Twitter, Send, Film } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4 text-xl font-bold text-slate-900 dark:text-slate-100 font-heading">
              Pirate69 🏴‍☠️
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm">
              Pirate69 is an advanced media information extractor providing high-speed direct download links for the latest Hollywood, Bollywood, and Web series.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li><a href="#" className="hover:text-indigo-500 transition-colors">Home</a></li>
              <li><a href="#" className="hover:text-indigo-500 transition-colors">Hollywood</a></li>
              <li><a href="#" className="hover:text-indigo-500 transition-colors">Bollywood</a></li>
              <li><a href="#" className="hover:text-indigo-500 transition-colors">Request Movie</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li><a href="#" className="hover:text-indigo-500 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-indigo-500 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-indigo-500 transition-colors">DMCA</a></li>
              <li><a href="#" className="hover:text-indigo-500 transition-colors">Contact Us</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-500 text-center md:text-left">
            &copy; {new Date().getFullYear()} Pirate69. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="https://t.me/piratedcult" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#229ED9] transition-colors p-2" aria-label="Telegram">
              <Send className="w-5 h-5" />
            </a>
            <a href="https://github.com/7xmovies" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2" aria-label="GitHub">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
