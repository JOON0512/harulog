import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'하루로그 · 함께 기록하는 하루', description:'오늘의 할 일을 기록하고, 친구와 서로의 하루를 나누세요.', icons:{ icon:'/favicon.svg?v=2', shortcut:'/favicon.svg?v=2' } };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ko"><body>{children}</body></html>}
