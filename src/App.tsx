import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Zones from "./pages/Zones";
import Affectations from "./pages/Affectations";
import Analysis from "./pages/Analysis";
import DataManagement from "./pages/DataManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/site-occupancy-hub">
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/zones" element={<Zones />} />
              <Route path="/affectations" element={<Affectations />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/data" element={<DataManagement />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
