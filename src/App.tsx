import { useState } from 'react'
import LandingPage from './pages/LandingPage'
import { HPPCalculator } from '../src/components/hpp/HPPCalculator'

function App() {
  // State untuk melacak user ada di halaman mana
  const [currentPage, setCurrentPage] = useState<'home' | 'calculator'>('home')

  return (
    <>
      {currentPage === 'home' ? (
        <LandingPage onStart={() => setCurrentPage('calculator')} />
      ) : (
        <HPPCalculator />
      )}
    </>
  )
}

export default App