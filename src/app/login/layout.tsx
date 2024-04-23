import React from "react";
import ThemeProvider from "@/components/theme/theme-provider";

export const metadata = {
    title: "Login"
}

export default function RootLayout({children}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="!font-medium">{children}</div>
    );
}
