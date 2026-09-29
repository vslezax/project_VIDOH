import localFont from "next/font/local";

export const codeNext = localFont({
    src: [
        { path: "./../public/fonts/CodeNext-ExtraBold.woff2", weight: "800", style: "normal" },
        { path: "./../public/fonts/CodeNext-ExtraBoldItalic.woff2", weight: "800", style: "italic" }
    ],
    display: "swap",
    variable: "--font-codenext",
});

export const onest = localFont({
    src: './../public/fonts/Onest.woff2',
    display: 'swap',
    variable: '--font-onest',
});