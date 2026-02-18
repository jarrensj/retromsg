import type { Metadata } from "next";
import Image from "next/image";
import { Special_Elite } from "next/font/google";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import HeaderCredits from "@/components/HeaderCredits";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const specialElite = Special_Elite({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "retromsg",
  description: "retromsg",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={specialElite.className}>
          <header className="flex justify-between items-center p-4 border-b border-[#333]">
            <Image
              src="/logo.png"
              alt="retroAI"
              width={120}
              height={40}
              priority
            />
            <div className="flex items-center gap-4">
              <SignedOut>
                <SignInButton>
                  <button className="px-4 py-2 text-[#ededed] hover:text-[#d4af37] transition-colors">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className="btn-primary">
                    Sign Up
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <HeaderCredits />
                <UserButton />
              </SignedIn>
            </div>
          </header>
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
