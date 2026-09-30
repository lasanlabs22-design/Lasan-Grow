import { Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Only for the "Powered by Lasan Labs" signature; the app itself uses the system's Segoe UI.
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], weight: ["600"] });

export const metadata = {
  title: { default: "Lasan Grow — Sales CRM", template: "%s · Lasan Grow" },
  description: "Sales CRM for pipeline, leads, contacts, companies and follow-ups.",
};

export const viewport = { themeColor: "#0e2a47" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
