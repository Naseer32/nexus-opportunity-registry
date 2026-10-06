import "./globals.css";
export const metadata = { title: "NEXUS - Verified Web3 Opportunities", description: "Evidence-bound registry of Web3 opportunities, verified by GenLayer validators." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
