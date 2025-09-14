import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Auth0Provider } from '@auth0/nextjs-auth0';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My SR Year",
  description: "Your senior year, organized and stress-less.",
  metadataBase: new URL("https://mysryear.example.com")
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Auth0Provider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </Auth0Provider>
      </body>
    </html>
  );
}
