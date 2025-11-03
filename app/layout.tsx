import { AppLayout } from "@/components/layout/AppLayout";
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
          <AppLayout>
            {children}
          </AppLayout>
        </Providers>
      </body>
    </html>
  );
}
