import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, Home, LayoutDashboard } from 'lucide-react';
import { useAgriPulse } from '../context/AgriPulseContext';
import { AgriPulseLogo } from '../components/AgriPulseLogo';
import { Button } from '../components/ui';

/** 404 page shared by public and portal URLs. */
export const NotFoundPage: React.FC = () => {
  const { session } = useAgriPulse();
  const location = useLocation();
  const portalHome = session ? (session.portalType === 'seller' ? '/seller' : '/home') : null;

  return (
    <div className="min-h-screen bg-warmbg flex flex-col">
      <header className="login-header bg-white border-b border-forest-100 px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link to="/" aria-label="AgriPulse home"><AgriPulseLogo size="md" theme="dark" /></Link>
      </header>
      <main className="flex-1 grid place-items-center px-4 py-16">
        <div className="max-w-md text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-forest-100 text-forest-800"><Compass size={30} aria-hidden="true" /></span>
          <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-forest-700">Page not found</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-forest-950">We could not find that page</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px]">{location.pathname}</code> does not exist or may have moved. Use the links below to get back on track.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {portalHome ? (
              <Button to={portalHome} leadingIcon={<LayoutDashboard size={14} />}>Open dashboard</Button>
            ) : (
              <Button to="/farmer/login" leadingIcon={<LayoutDashboard size={14} />}>Farmer login</Button>
            )}
            <Button to="/" variant="secondary" leadingIcon={<Home size={14} />}>Website home</Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFoundPage;
