'use client';

import { Raleway } from "next/font/google";
import Header from "../components/Header";
import Footer from "../components/Footer";

import "./globals.css";
// core styles are required for all packages
import '@mantine/core/styles.css';
import { createTheme, MantineProvider, CSSVariablesResolver, ColorSchemeScript, mantineHtmlProps } from '@mantine/core';


const raleway = Raleway({
  variable: "--font-raleway-sans",
  subsets: ["latin"],
});


const theme = createTheme({
  primaryColor: "gray",
  primaryShade: { light: 8, dark: 4 },
});

const resolver: CSSVariablesResolver = (theme) => ({
  variables: {},
  light: {
    '--mantine-color-gray': theme.colors.dark[8],
    '--mantine-color-body': '#fffcf5',
    '--background-color': theme.colors.dark[1],
    '--foreground-color': theme.colors.dark[8],
    '--mantine-color-secondary': '#e1dacc',
    '--mantine-color-hover': theme.colors.teal[4],
  },
  dark: {
    '--mantine-color-gray': theme.colors.gray[4],
    '--mantine-color-body': theme.colors.dark[9],
    '--background-color': theme.colors.dark[4],
    '--foreground-color': theme.colors.gray[4],
    '--mantine-color-secondary': theme.colors.dark[5],
    '--mantine-color-hover': theme.colors.pink[8],
  },
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <body
        className={`${raleway.variable} antialiased`}
      >
        <ColorSchemeScript />
        <MantineProvider theme={theme} cssVariablesResolver={resolver}>
          <Header />
          <div style={{ padding: '2% 5%' }}>
            {children}
          </div>
          <Footer />
        </MantineProvider>
      </body>
    </html>
  );
}
