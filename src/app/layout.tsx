import { Raleway } from "next/font/google";
import AppProviders from "./AppProviders";

import "./globals.css";
import '@mantine/core/styles.css';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';


// A server component, so the font's class name is generated once on the server and matches in the browser
const raleway = Raleway({
  variable: "--font-raleway-sans",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body
        className={`${raleway.variable} antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
