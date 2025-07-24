import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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

export const metadata = {
  title: 'Canadian Grocery Index',
  description: 'Track Canadian grocery prices, trends, and streaks. Visualize price changes for food products across Canada.',
  openGraph: {
    title: 'Canadian Grocery Index',
    description: 'Track Canadian grocery prices, trends, and streaks. Visualize price changes for food products across Canada.',
    type: 'website',
    url: 'https://grocery-index.example.com/',
    images: ['/file.svg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Canadian Grocery Index',
    description: 'Track Canadian grocery prices, trends, and streaks. Visualize price changes for food products across Canada.',
    images: ['/file.svg'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Performance optimizations */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//localhost:3000" />
      </head>
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
