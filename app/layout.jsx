import "./globals.css";
import { Inter } from 'next/font/google';
import Header from "./components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "ViRA - Vendor Insights Recommender Agent",
  description: "AI-powered vendor selection built with Next.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <Header />
        {children}
      </body>
    </html>
  );
}
