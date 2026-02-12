import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Kandan from "./Kandan"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Kandan></Kandan>
  </StrictMode>,
)
