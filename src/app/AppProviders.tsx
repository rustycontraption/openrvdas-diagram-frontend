'use client';

import { usePathname } from "next/navigation";
import { createTheme, MantineProvider, CSSVariablesResolver } from '@mantine/core';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { DiagramSessionProvider } from "@/diagramSession/DiagramSessionProvider";

const FULL_WINDOW_PATHS = ["/diagram"];

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

export default function AppProviders({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathWithoutTrailingSlash = usePathname().replace(/(.)\/$/, "$1");
  const isFullWindowPage = FULL_WINDOW_PATHS.includes(pathWithoutTrailingSlash);

  return (
    <MantineProvider theme={theme} cssVariablesResolver={resolver}>
      <DiagramSessionProvider>
        <Header />
        <div style={isFullWindowPage ? undefined : { padding: '2% 5%' }}>
          {children}
        </div>
        {!isFullWindowPage && <Footer />}
      </DiagramSessionProvider>
    </MantineProvider>
  );
}
