import React, { Suspense, lazy } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AgriPulseProvider, useAgriPulse } from './context/AgriPulseContext';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { SellerSignUpPage } from './pages/SellerSignUpPage';
import { FarmerLoginPage } from './pages/FarmerLoginPage';
import { FarmerSignUpPage } from './pages/FarmerSignUpPage';
import { HomeDashboardPage } from './pages/HomeDashboardPage';
import { FarmManagementPage } from './pages/FarmManagementPage';
import { WeatherIntelligencePage } from './pages/WeatherIntelligencePage';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { DeviceManagementPage } from './pages/DeviceManagementPage';
import { DeviceDetailsPage } from './pages/DeviceDetailsPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { FarmTwinPage } from './pages/FarmTwinPage';
import { InsightsPage } from './pages/InsightsPage';
import { IrrigationPage } from './pages/IrrigationPage';
import { SoilHealthPage } from './pages/SoilHealthPage';
import { CropHealthPage } from './pages/CropHealthPage';
import { AlertsPage } from './pages/AlertsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PublicLayout } from './components/public/PublicLayout';
import { PortalType } from './types';
import { RouteFallback } from './components/ui';

/* Route-level code splitting: knowledge, market, seller and public-site pages load on demand. */
const SellerPortalPage = lazy(() => import('./pages/SellerPortalPage').then((m) => ({ default: m.SellerPortalPage })));
const DictionaryPage = lazy(() => import('./pages/DictionaryPage').then((m) => ({ default: m.DictionaryPage })));
const DiseaseAnalysisPage = lazy(() => import('./pages/DiseaseAnalysisPage').then((m) => ({ default: m.DiseaseAnalysisPage })));
const StorePage = lazy(() => import('./pages/StorePage').then((m) => ({ default: m.StorePage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const CartAndCheckoutPage = lazy(() => import('./pages/CartAndCheckoutPage').then((m) => ({ default: m.CartAndCheckoutPage })));
const OrdersPage = lazy(() => import('./pages/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const WishlistPage = lazy(() => import('./pages/WishlistPage').then((m) => ({ default: m.WishlistPage })));
const OffersPage = lazy(() => import('./pages/OffersPage').then((m) => ({ default: m.OffersPage })));
const NewsPage = lazy(() => import('./pages/NewsPage').then((m) => ({ default: m.NewsPage })));
const SchemesPage = lazy(() => import('./pages/SchemesPage').then((m) => ({ default: m.SchemesPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const AssistantPage = lazy(() => import('./pages/AssistantPage').then((m) => ({ default: m.AssistantPage })));
const HomePage = lazy(() => import('./pages/public/HomePage').then((m) => ({ default: m.HomePage })));
const PlatformPage = lazy(() => import('./pages/public/PlatformPage').then((m) => ({ default: m.PlatformPage })));
const DigitalTwinPage = lazy(() => import('./pages/public/DigitalTwinPage').then((m) => ({ default: m.DigitalTwinPage })));
const AiCapabilitiesPage = lazy(() => import('./pages/public/AiCapabilitiesPage').then((m) => ({ default: m.AiCapabilitiesPage })));
const HowItWorksPage = lazy(() => import('./pages/public/HowItWorksPage').then((m) => ({ default: m.HowItWorksPage })));
const TechnologyPage = lazy(() => import('./pages/public/TechnologyPage').then((m) => ({ default: m.TechnologyPage })));
const ImpactPage = lazy(() => import('./pages/public/ImpactPage').then((m) => ({ default: m.ImpactPage })));
const RoadmapPage = lazy(() => import('./pages/public/RoadmapPage').then((m) => ({ default: m.RoadmapPage })));
const AboutPage = lazy(() => import('./pages/public/AboutPage').then((m) => ({ default: m.AboutPage })));
const FaqPage = lazy(() => import('./pages/public/FaqPage').then((m) => ({ default: m.FaqPage })));
const ContactPage = lazy(() => import('./pages/public/ContactPage').then((m) => ({ default: m.ContactPage })));

/** Every farmer-portal path prefix; used to pick the right login screen for unauthenticated visits. */
export const FARMER_ROUTE_PREFIXES = [
  '/home', '/alerts', '/farm', '/monitoring', '/twin', '/insights', '/irrigation', '/soil', '/crop-health', '/weather',
  '/devices', '/reports', '/assistant', '/dictionary', '/disease', '/news', '/schemes',
  '/store', '/cart', '/checkout', '/orders', '/wishlist', '/offers', '/account',
];

const ProtectedRouteGuard: React.FC<{ children: React.ReactNode; portal?: PortalType }> = ({ children, portal }) => {
  const { session, sessionLoading, workspaceHydrated } = useAgriPulse();
  const location = useLocation();

  if (sessionLoading || (session && !workspaceHydrated)) {
    return <div role="status" className="min-h-screen grid place-items-center bg-warmbg text-forest-900 font-semibold">Loading secure AGRIPULSE session…</div>;
  }

  if (!session) {
    const isFarmerPath = FARMER_ROUTE_PREFIXES.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
    return <Navigate to={isFarmerPath || portal === 'farmer' ? '/farmer/login' : '/login'} state={{ from: location.pathname }} replace />;
  }

  if (portal && session.portalType !== portal) {
    return <Navigate to={session.portalType === 'seller' ? '/seller' : '/home'} replace />;
  }

  return <>{children}</>;
};

/** Sends an authenticated user to their portal; unauthenticated visitors to the farmer login. */
const PortalEntryRedirect: React.FC = () => {
  const { session, sessionLoading, workspaceHydrated } = useAgriPulse();
  if (sessionLoading || (session && !workspaceHydrated)) {
    return <div role="status" className="min-h-screen grid place-items-center bg-warmbg text-forest-900 font-semibold">Loading secure AGRIPULSE session…</div>;
  }
  if (!session) {
    return <Navigate to="/farmer/login" replace />;
  }
  return <Navigate to={session.portalType === 'seller' ? '/seller' : '/home'} replace />;
};

export const App: React.FC = () => {
  return (
    <AgriPulseProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public Authentication Routes */}
          {/* Seller Log In */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/seller/login" element={<LoginPage />} />

          {/* Seller Sign Up */}
          <Route path="/signup" element={<SellerSignUpPage />} />
          <Route path="/seller/signup" element={<SellerSignUpPage />} />

          {/* Farmer Sign In & Sign Up */}
          <Route path="/farmer/login" element={<FarmerLoginPage />} />
          <Route path="/farmer/signup" element={<FarmerSignUpPage />} />

          {/* Public website */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/platform" element={<PlatformPage />} />
            <Route path="/digital-twin" element={<DigitalTwinPage />} />
            <Route path="/ai-capabilities" element={<AiCapabilitiesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/technology" element={<TechnologyPage />} />
            <Route path="/impact" element={<ImpactPage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Route>

          {/* Portal entry shortcut */}
          <Route path="/portal" element={<PortalEntryRedirect />} />
          <Route path="/dashboard" element={<PortalEntryRedirect />} />

          {/* Dedicated Seller Portal */}
          <Route
            path="/seller"
            element={
              <ProtectedRouteGuard portal="seller">
                <SellerPortalPage />
              </ProtectedRouteGuard>
            }
          />
          <Route
            path="/seller/dashboard"
            element={
              <ProtectedRouteGuard portal="seller">
                <SellerPortalPage />
              </ProtectedRouteGuard>
            }
          />

          {/* Protected Farmer Portal Routes */}
          <Route
            element={
              <ProtectedRouteGuard portal="farmer">
                <AppShell />
              </ProtectedRouteGuard>
            }
          >
            <Route path="/home" element={<HomeDashboardPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/farm" element={<FarmManagementPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/twin" element={<FarmTwinPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/irrigation" element={<IrrigationPage />} />
            <Route path="/soil" element={<SoilHealthPage />} />
            <Route path="/crop-health" element={<CropHealthPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/weather" element={<WeatherIntelligencePage />} />
            <Route path="/devices" element={<DeviceManagementPage />} />
            <Route path="/devices/:deviceId" element={<DeviceDetailsPage />} />
            <Route path="/dictionary" element={<DictionaryPage />} />
            <Route path="/disease" element={<DiseaseAnalysisPage />} />
            <Route path="/disease/:diseaseId" element={<DiseaseAnalysisPage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/store/product/:productId" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartAndCheckoutPage />} />
            <Route path="/checkout" element={<CartAndCheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrdersPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/schemes" element={<SchemesPage />} />
            <Route path="/account" element={<AccountSettingsPage />} />
          </Route>

          {/* Fallback for unknown routes */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AgriPulseProvider>
  );
};
