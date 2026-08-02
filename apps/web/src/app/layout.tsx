import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.mysryear.net'),
  applicationName: 'MySRYear',
  title: {
    default: 'MySRYear',
    template: '%s | MySRYear',
  },
  description:
    'MySRYear helps students and families plan high school, college, careers, scholarships, documents, and next steps in one place.',
  openGraph: {
    type: 'website',
    siteName: 'MySRYear',
    url: 'https://www.mysryear.net',
    title: 'MySRYear',
    description:
      'Plan high school, college, careers, scholarships, documents, and next steps in one place.',
    images: [
      {
        url: '/brand/mysryear-social-preview.png',
        width: 1200,
        height: 630,
        alt: 'MySRYear logo with graduation cap and pathway',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MySRYear',
    description:
      'Plan high school, college, careers, scholarships, documents, and next steps in one place.',
    images: ['/brand/mysryear-social-preview.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
