import React from "react";
import ThemeProvider from "@/components/theme/theme-provider";

export const metadata = {
    title: "Lobby"
}

export default function RootLayout({children}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>{children}</>
    );
}
