import type { Metadata } from "next";
import "./globals.css";
import "./portal.css";
import { FavoriteProvider } from "./components/FavoriteButton";

export const metadata: Metadata = {
  title: "한곳 | 새롬고등학교 동아리 플랫폼",
  description: "새롬고의 모든 동아리, 한곳에서.",
  metadataBase: new URL("https://saerom-on.cocoa-horse-1721.chatgpt.site"),
  openGraph: {
    title: "한곳 | 새롬고등학교 동아리 플랫폼",
    description: "2026 새롬고 동아리 58개를 한눈에 확인하세요.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "한곳 | 새롬고등학교 동아리 플랫폼",
    description: "2026 새롬고 동아리 58개를 한눈에 확인하세요.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body><FavoriteProvider>{children}</FavoriteProvider></body></html>;
}
