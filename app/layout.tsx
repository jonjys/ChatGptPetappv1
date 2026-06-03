import type { Metadata } from "next";
import "./globals.css";
import "@/styles/brutalism.css";
import "@/styles/animations.css";
import { AppProvider } from "@/context/AppContext";
import BottomNav from "@/components/ui/BottomNav";
import FloatingPet from "@/components/pet/FloatingPet";

export const metadata: Metadata = {
  title: "KARMA — Real-Life Game Engine",
  description: "Level up your life. Complete bounties, grow your pet, earn karma.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <main className="page-wrapper">{children}</main>
          <FloatingPet />
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  );
}
