import { AnimatePresence, motion } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import AppShell from './components/AppShell'
import { EASE } from './lib/motion'
import ClosetPage from './pages/ClosetPage'
import HomePage from './pages/HomePage'
import MixMatchPage from './pages/MixMatchPage'
import NotFoundPage from './pages/NotFoundPage'
import UploadPage from './pages/UploadPage'

export default function App() {
  const location = useLocation()
  return (
    <AppShell>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/closet" element={<ClosetPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/mix" element={<MixMatchPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </AppShell>
  )
}
