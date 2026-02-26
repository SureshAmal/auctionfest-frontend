import type { Metadata, Viewport } from "next";
import {
  Inter,
  Press_Start_2P,
  Orbitron,
  Rajdhani,
  Russo_One,
  Black_Ops_One,
  Bangers,
  Space_Grotesk,
  Pacifico,
  Playfair_Display,
  Satisfy,
} from "next/font/google";
import "./globals.css";
import { SocketProvider } from "../context/socket-context";
import { ThemeProvider } from "../context/ThemeProvider";
import Head from "next/head";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});
const orbitron = Orbitron({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-orbitron",
});
const rajdhani = Rajdhani({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-rajdhani",
});
const russoOne = Russo_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-russo",
});
const blackOpsOne = Black_Ops_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-blackops",
});
const bangers = Bangers({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bangers",
});
const spaceGrotesk = Space_Grotesk({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-space",
});
const pacifico = Pacifico({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pacifico",
});
const playfairDisplay = Playfair_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-playfair",
});
const satisfy = Satisfy({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-satisfy",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FF4D00",
};

export const metadata: Metadata = {
  title: "Planomics Auction",
  description: "Real-time Plot Auction Simulator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Black+Ops+One&family=Inter:wght@400;700&family=Orbitron:wght@400;700&family=Pacifico&family=Playfair+Display:wght@400;700&family=Rajdhani:wght@400;700&family=Russo+One&family=Satisfy&family=Space+Grotesk:wght@400;700&family=Press+Start+2P&display=swap" rel="stylesheet" />
      </Head>
      <body
        style={{ fontFamily: "var(--font-family)" }}
        className={`${inter.variable} ${pressStart2P.variable} ${orbitron.variable} ${rajdhani.variable} ${russoOne.variable} ${blackOpsOne.variable} ${bangers.variable} ${spaceGrotesk.variable} ${pacifico.variable} ${playfairDisplay.variable} ${satisfy.variable}`}
      >
        <SocketProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
