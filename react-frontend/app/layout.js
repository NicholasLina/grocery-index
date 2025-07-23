import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Head from 'next/head';
import Header from '../components/Header';
import ServiceWorkerRegistration from '../components/ServiceWorkerRegistration';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Head>
        <title>Canadian Grocery Index</title>
        <meta name="description" content="Track Canadian grocery prices, trends, and streaks. Visualize price changes for food products across Canada." />
        <meta property="og:title" content="Canadian Grocery Index" />
        <meta property="og:description" content="Track Canadian grocery prices, trends, and streaks. Visualize price changes for food products across Canada." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://grocery-index.example.com/" />
        <meta property="og:image" content="/file.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Canadian Grocery Index" />
        <meta name="twitter:description" content="Track Canadian grocery prices, trends, and streaks. Visualize price changes for food products across Canada." />
        <meta name="twitter:image" content="/file.svg" />
        {/* Performance optimizations */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//localhost:3000" />
      </Head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
