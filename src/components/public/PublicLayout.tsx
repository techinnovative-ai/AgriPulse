import React, { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronRight, Github, Menu, X } from 'lucide-react';
import { AgriPulseLogo } from '../AgriPulseLogo';
import { useAgriPulse } from '../../context/AgriPulseContext';
import { Button, RouteFallback } from '../ui';
import { GITHUB_REPO_URL, PUBLIC_NAV } from '../../data/publicContent';
import './public.css';

const PAGE_TITLES: Record<string, string> = {
  '/': 'AgriPulse — See More. Predict Earlier. Grow Smarter.',
  '/platform': 'Platform · AgriPulse',
  '/digital-twin': 'Digital Farm Twin · AgriPulse',
  '/ai-capabilities': 'AI Capabilities · AgriPulse',
  '/how-it-works': 'How It Works · AgriPulse',
  '/technology': 'Technology · AgriPulse',
  '/impact': 'Innovation & Impact · AgriPulse',
  '/roadmap': 'Roadmap · AgriPulse',
  '/about': 'About · AgriPulse',
  '/faq': 'FAQ · AgriPulse',
  '/contact': 'Contact · AgriPulse',
};

export const PublicLayout: React.FC = () => {
  const { session } = useAgriPulse();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
    document.title = PAGE_TITLES[location.pathname] || 'AgriPulse';
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const portalHome = session ? (session.portalType === 'seller' ? '/seller' : '/home') : null;

  return (
    <div className="public-page">
      <a href="#public-main" className="skip-link">Skip to content</a>
      <header className="public-header">
        <div className="public-header__inner">
          <Link to="/" aria-label="AgriPulse home" className="shrink-0">
            <AgriPulseLogo size="md" theme="dark" />
          </Link>
          <nav className="public-nav" aria-label="Main">
            {PUBLIC_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="public-header__actions">
            {portalHome ? (
              <Button size="sm" to={portalHome} trailingIcon={<ArrowRight size={14} />}>Open dashboard</Button>
            ) : (
              <>
                <Button size="sm" variant="secondary" to="/farmer/login" className="hidden sm:inline-flex">Log in</Button>
                <Button size="sm" to="/farmer/signup" className="hidden sm:inline-flex">Create account</Button>
              </>
            )}
            <button type="button" className="public-menu-toggle" aria-expanded={menuOpen} aria-controls="public-drawer" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((open) => !open)}>
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div id="public-drawer" className="public-drawer">
            <nav aria-label="Main (mobile)">
              {PUBLIC_NAV.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                  {item.label}
                  <ChevronRight size={16} aria-hidden="true" />
                </NavLink>
              ))}
            </nav>
            <div className="mt-5 grid gap-2">
              {portalHome ? (
                <Button to={portalHome} block>Open dashboard</Button>
              ) : (
                <>
                  <Button to="/farmer/signup" block>Create farmer account</Button>
                  <Button to="/farmer/login" variant="secondary" block>Log in</Button>
                  <Button to="/login" variant="ghost" block>Seller portal login</Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main id="public-main" className="public-main">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="public-footer">
        <div className="public-footer__inner">
          <div className="public-footer__brand">
            <AgriPulseLogo size="md" theme="light" />
            <p>Intelligent Farm Digital Twin & Early Crop-Stress Detection System. Built for farmers who want honest data: measured values, estimates and rule-based guidance are always told apart.</p>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white hover:underline">
              <Github size={16} aria-hidden="true" />Source on GitHub
            </a>
          </div>
          <div className="public-footer__cols">
            <div>
              <h4>Product</h4>
              <Link to="/platform">Platform</Link>
              <Link to="/digital-twin">Digital twin</Link>
              <Link to="/ai-capabilities">AI capabilities</Link>
              <Link to="/how-it-works">How it works</Link>
            </div>
            <div>
              <h4>Learn</h4>
              <Link to="/technology">Technology</Link>
              <Link to="/impact">Innovation & impact</Link>
              <Link to="/roadmap">Roadmap</Link>
              <Link to="/faq">FAQ</Link>
            </div>
            <div>
              <h4>Company</h4>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
              <a href={`${GITHUB_REPO_URL}/blob/main/SECURITY.md`} target="_blank" rel="noreferrer">Security policy</a>
            </div>
            <div>
              <h4>Account</h4>
              <Link to="/farmer/login">Farmer login</Link>
              <Link to="/farmer/signup">Create farmer account</Link>
              <Link to="/login">Seller login</Link>
              <Link to="/signup">Seller registration</Link>
            </div>
          </div>
          <div className="public-footer__bottom">
            <span>© {new Date().getFullYear()} AgriPulse. Decision support for farmers — not a substitute for qualified agronomic advice.</span>
            <span>See More. Predict Earlier. Grow Smarter.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
