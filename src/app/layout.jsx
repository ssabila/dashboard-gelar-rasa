import '@/app/globals.css'
import { Navbar } from '@/components/layout/Navbar'

export const metadata = {
  title: 'AQMS Dashboard — DA Gelar Rasa 2026',
  description:
    'Dashboard interaktif kualitas udara dari 27 stasiun AQMS di Indonesia ' +
    'dan dampaknya terhadap kesehatan masyarakat.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
