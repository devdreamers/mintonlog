import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = {
  title: 'MintonLog — 배드민턴 대회 이력',
  description: '나의 배드민턴 대회 이력과 수상 결과를 한 곳에서 관리',
  openGraph: {
    title: 'MintonLog',
    description: '배드민턴 대회 이력 관리',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">
        <NavBar />
        {children}
      </body>
    </html>
  )
}
