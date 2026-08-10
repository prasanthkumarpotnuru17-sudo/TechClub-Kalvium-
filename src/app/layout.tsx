import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Michroma, Orbitron } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { RegistrationProvider } from "@/modules/registration/sync/registrationContext";
import { Preloader } from "@/components/ui/preloader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const michroma = Michroma({
  variable: "--font-michroma",
  subsets: ["latin"],
  weight: "400",
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Tech Club by Kalvium | Future Through Cutting-Edge Technology",
  description: "Join hands-on coding cohorts, hackathons, and cohort projects at Tech Club by Kalvium.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${michroma.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Preloader />
        <AuthProvider>
          <RegistrationProvider>{children}</RegistrationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
