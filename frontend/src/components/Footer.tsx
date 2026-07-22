// src/components/Footer.tsx
// import { Link } from "react-router-dom";
import LogoMark from "./LogoMark";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <LogoMark size={28} />
              <span className="text-white font-bold text-lg">LEDGER|FLOW</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              AI-powered accounting platform that automates bookkeeping,
              reconciliation, and financial reporting for modern businesses.
            </p>
            <div className="flex items-center gap-1 text-yellow-400">
              {"★★★★★"} <span className="text-white text-sm ml-1">5.0</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              "Cut our month-end close from 5 days to 8 hours" — Sarah C., CFO
            </p>
            <p className="text-xs text-gray-400 mt-1">
              "The automated reconciliation is a game-changer" — Michael R.,
              Owner
            </p>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="font-semibold text-white mb-3">Solutions</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-primary-400">
                  For Small Businesses
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400">
                  For Medium-Sized Businesses
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400">
                  For Enterprises & Large Business
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400">
                  For Accountants
                </a>
              </li>
            </ul>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-white mb-3">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-primary-400">
                  Pricing
                </a>
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
          <div>
            <h4 className="font-semibold text-white mb-3">Tools</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-primary-400">
                  ROI Calculator
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400">
                  Cost Savings Calculator
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400">
                  Tax Strategist
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>

          {/* Resources & Company */}
          <div>
            <h4 className="font-semibold text-white mb-3">Resources</h4>
            <ul className="space-y-2 text-sm mb-4">
              <li>
                <a href="#" className="hover:text-primary-400">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400">
                  FAQ
                </a>
              </li>
            </ul>
            <h4 className="font-semibold text-white mb-3">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-primary-400">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-400">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500">
          <p>© 2026 LedgerFlow. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
