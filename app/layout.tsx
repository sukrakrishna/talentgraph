import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavBar } from "@/components/nav-bar";
import { ThemeProvider } from "@/components/theme-provider";

const bricolage = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TalentGraph",
  description: "AI talent discovery and internal mobility",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${dmSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TooltipProvider>
            <NavBar />
            <main className="flex-1">{children}</main>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
