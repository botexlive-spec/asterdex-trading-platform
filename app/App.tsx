import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import OrderlyProvider from "@/components/orderlyProvider";
import { HttpsRequiredWarning } from "@/components/HttpsRequiredWarning";
import { withBasePath } from "./utils/base-path";
import { getSEOConfig, getUserLanguage } from "./utils/seo";
import ImpersonationBanner from "./components/ImpersonationBanner";
import MobileBottomNav from "./components/MobileBottomNav";

export default function App() {
  const seoConfig = getSEOConfig();
  const defaultLanguage = getUserLanguage();

  return (
    <>
      <Helmet>
        <html lang={seoConfig.language || defaultLanguage} />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <link rel="icon" type="image/webp" href={withBasePath("/favicon.webp")} />
      </Helmet>
      <HttpsRequiredWarning />
      <ImpersonationBanner />
      <OrderlyProvider>
        <div className="pb-0 md:pb-0">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400">Loading...</p>
              </div>
            </div>
          }>
            <Outlet />
          </Suspense>
        </div>
        <MobileBottomNav />
      </OrderlyProvider>
    </>
  );
}

