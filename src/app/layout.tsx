import type {Metadata} from "next";
import {Inter} from "next/font/google";
import "@/app/globals.css";
import ThemeProvider from "@/components/theme/theme-provider";
import React from "react";
import {QueryClient, QueryClientProvider} from "react-query";

const inter = Inter({subsets: ["latin"]});

export const metadata: Metadata = {
    title: "Chatroom",
    description: "SWS Midterm Project",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                disableTransitionOnChange={false}>
                {children}
            </ThemeProvider>
        </body>
        </html>
    );
}
