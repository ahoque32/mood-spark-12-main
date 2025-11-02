import { BottomNav } from "@/components/BottomNav";
import { Providers } from "./providers";
import "@/index.css";

export const metadata = {
  title: "Mood Spark",
  description: "Track your mood and emotions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="w-full min-h-screen">
            {children}
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
