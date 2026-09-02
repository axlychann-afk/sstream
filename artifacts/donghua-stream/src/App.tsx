import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider, useIsFetching } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Route, Switch, Router as WouterRouter } from "wouter";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { TopLoadingBar } from "@/components/TopLoadingBar";

// Lazy-loaded pages — each route is a separate chunk downloaded only when visited
const Home      = lazy(() => import("@/pages/home"));
const Ongoing   = lazy(() => import("@/pages/ongoing"));
const Completed = lazy(() => import("@/pages/completed"));
const Upcoming  = lazy(() => import("@/pages/upcoming"));
const Schedule  = lazy(() => import("@/pages/schedule"));
const SearchPage = lazy(() => import("@/pages/search"));
const Detail    = lazy(() => import("@/pages/detail"));
const Watch     = lazy(() => import("@/pages/watch"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

/** Minimal dark placeholder shown while a page chunk is downloading */
function PageFallback() {
  return (
    <div className="min-h-screen w-full bg-background" aria-hidden />
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
      <p className="text-muted-foreground mb-8">The page you are looking for doesn't exist or has been moved.</p>
      <a href="/" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium hover:bg-primary/90 transition-colors">
        Return Home
      </a>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <TopLoadingBar />
          <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
            <Navbar />
            <main className="flex-1 w-full">
              <Suspense fallback={<PageFallback />}>
                <Switch>
                  <Route path="/"                                    component={Home} />
                  <Route path="/ongoing"                             component={Ongoing} />
                  <Route path="/completed"                           component={Completed} />
                  <Route path="/upcoming"                            component={Upcoming} />
                  <Route path="/schedule"                            component={Schedule} />
                  <Route path="/search"                              component={SearchPage} />
                  <Route path="/donghua/:slug"                       component={Detail} />
                  <Route path="/watch/:seriesSlug/:episodeSlug"      component={Watch} />
                  <Route                                             component={NotFound} />
                </Switch>
              </Suspense>
            </main>
            <Footer />
          </div>
        </WouterRouter>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
