import './styles/tokens.css'
import './styles/base.css'
import './styles/ui.css'
import './styles/components.css'
import './styles/sections.css'

import { quality } from './engine/quality'
import { startStage } from './engine/stage'
import { createNebula } from './fx/nebula'
import { runPreloader } from './ui/preloader'
import { initNav } from './ui/nav'
import { initProgress } from './ui/progress'
import { initReveals } from './sections/reveals'

document.body.dataset.quality = quality.tier
if (quality.reducedMotion) document.body.classList.add('motion-off')

const year = document.getElementById('year')
if (year) year.textContent = String(new Date().getFullYear())

createNebula()
startStage()
initNav()
initProgress()
initReveals()

runPreloader().then(() => {
  document.dispatchEvent(new CustomEvent('gtoat:ready'))
})
