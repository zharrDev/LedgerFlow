// src/components/Footer.tsx
import { Link } from "react-router-dom";
import logo from "../assets/ledgerflow.webp";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-5 gap-x-3 gap-y-8 sm:gap-x-6">
          {/* Brand Column */}
          <div className="col-span-5 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img
                src={logo}
                alt="LedgerFlow"
                className="w-8 h-8 object-contain flex-shrink-0"
              />
              <span className="text-white font-bold text-lg">LedgerFlow</span>
            </div>
            <p className="text-sm text-gray-400">
              AI-powered accounting platform that automates bookkeeping,
              reconciliation, and financial reporting for modern businesses.
            </p>
            <div className="mt-3 flex items-center gap-1 text-yellow-400">
              {"★★★★★"} <span className="text-white text-sm ml-1">5.0</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs text-gray-400 mt-3">
                "Cut our month-end close from 5 days to 8 hours" — Sarah C. CFO
              </p>
              <p className="text-xs text-gray-400 mt-1">
                "Automated reconciliation is a game-changer" — Michael R. Owner
              </p>
            </div>
          </div>

          {/* Solutions */}
          <div className="col-span-1 min-w-0">
            <h4 className="font-semibold text-white mb-3 text-sm sm:text-base">
              Solutions
            </h4>
            <ul className="space-y-2 text-[11px] sm:text-sm">
              <li>
                <a href="#" className="hover:text-primary-400">
                  Small Businesses
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400">
                  Mid-Market
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400">
                  Enterprises
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400">
                  Accountants
                </a>
              </li>
            </ul>
          </div>

          {/* Product */}
          <div className="col-span-1 min-w-0">
            <h4 className="font-semibold text-white mb-3 text-sm sm:text-base">
              Product
            </h4>
            <ul className="space-y-2 text-[11px] sm:text-sm">
              <li>
                <Link to="/pricing" className="hover:text-primary-400">
                  Pricing
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400">
                  Integrations
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400">
                  Security
                </a>
              </li>
            </ul>
          </div>

          {/* Tools */}
          <div className="col-span-1 min-w-0">
            <h4 className="font-semibold text-white mb-3 text-sm sm:text-base">
              Tools
            </h4>
            <ul className="space-y-2 text-[11px] sm:text-sm">
              <li>
                <a href="#" className="hover:text-primary-400">
                  ROI Calculator
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400">
                  Tax Strategist
                </a>
              </li>
              <li>
                <Link to="/help" className="hover:text-primary-400">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources & Company */}
          <div className="col-span-1 min-w-0">
            <h4 className="font-semibold text-white mb-3 text-sm sm:text-base">
              Resources
            </h4>
            <ul className="space-y-2 text-[11px] sm:text-sm mb-4">
              <li>
                <a href="#" className="hover:text-primary-400">
                  Blog
                </a>
              </li>
              <li>
                <Link to="/help" className="hover:text-primary-400">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-primary-400">
                  Help Center
                </Link>
              </li>
            </ul>
            <h4 className="font-semibold text-white mb-3 text-sm sm:text-base">
              Company
            </h4>
            <ul className="space-y-2 text-[11px] sm:text-sm">
              <li>
                <a href="#" className="hover:text-primary-400">
                  About Us
                </a>
              </li>
              <li>
                <Link to="/help" className="hover:text-primary-400">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-5 text-center text-sm text-gray-500">
          <p>© 2026 LedgerFlow. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;