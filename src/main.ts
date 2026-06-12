import './styles/tokens.css'
import './styles/base.css'
import './styles/ui.css'
import './styles/components.css'
import './styles/sections.css'

import { quality } from './engine/quality'
import { startStage } from './engine/stage'
import { createNebula } from './fx/nebula'
import { createSerpent } from './serpent'
import { initBloom } from './fx/bloom'
import { initMoods } from './fx/moods'
import { runPreloader } from './ui/preloader'
import { initNav } from './ui/nav'
import { initProgress } from './ui/progress'
import { initReveals } from './sections/reveals'
import { initChoreography } from './sections/choreography'
import { initFlow } from './sections/flow'
import { initInteractions } from './sections/interactions'
import { initGame } from './data/game'
import { initContact } from './data/contact'
import { initAudio } from './fx/audio'
import { initCursor } from './ui/cursor'
import { initWatchdog } from './engine/watchdog'
import { initWarp } from './fx/warp'
import { initAtlas } from './ui/atlas'
import { initCollapse } from './sections/collapse'

document.body.dataset.quality = quality.tier
if (quality.reducedMotion) document.body.classList.add('motion-off')

const year = document.getElementById('year')
if (year) year.textContent = String(new Date().getFullYear())

initMoods()
createNebula()
createSerpent()
if (quality.bloom) initBloom()
startStage()
initNav()
initProgress()
initReveals()
initChoreography()
initFlow()
initInteractions()
initGame()
initContact()
initAudio()
initCursor()
initWatchdog()
initWarp()
initAtlas()
initCollapse()

runPreloader().then(() => {
  document.dispatchEvent(new CustomEvent('gtoat:ready'))
})
