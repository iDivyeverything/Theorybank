import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Theorybank — A space to study chess",description:"Explore chess at your own pace on a 3D board by a peaceful tropical shore.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>;}
