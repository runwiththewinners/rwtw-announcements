import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RWTW Announcements",
  description: "Community announcements from Run With The Winners",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
