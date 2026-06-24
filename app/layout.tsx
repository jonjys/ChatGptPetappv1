import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import "@/styles/brutalism.css";
import "@/styles/animations.css";
import { AppProvider } from "@/context/AppContext";
import BottomNav from "@/components/ui/BottomNav";
import WorldGate from "@/components/onboarding/WorldGate";
import PetCreationModal from "@/components/onboarding/PetCreationModal";
import DailyReward from "@/components/ui/DailyReward";
import TapEffect from "@/components/ui/TapEffect";
import PetCompanion from "@/components/ui/PetCompanion";
import OnboardingOverlay from "@/components/ui/OnboardingOverlay";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KARMA — Real-Life Game Engine",
  description: "Level up your life. Complete bounties, grow your pet, earn karma.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body>
        <AppProvider>
          <WorldGate>
            <PetCreationModal />
            <main className="page-wrapper">{children}</main>
            <DailyReward />
            <OnboardingOverlay />
            <BottomNav />
            <PetCompanion />
            <TapEffect />
          </WorldGate>
        </AppProvider>
      </body>
    </html>
  );
}
