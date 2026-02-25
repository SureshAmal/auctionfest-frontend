import type { Metadata } from "next";
import { Inter, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "../context/socket-context";
import { ThemeProvider } from "../context/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });
const pressStart2P = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-pixel" });

export const metadata: Metadata = {
  title: "AU-FEST 2026 Auction",
  description: "Real-time Plot Auction Simulator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${pressStart2P.variable}`}>
        <SocketProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
