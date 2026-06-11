import emailjs from '@emailjs/browser'

// public identifiers — same EmailJS service the 2.x site shipped in-page
const SERVICE_ID = 'service_7zuc9uf'
const TEMPLATE_ID = 'template_i8cfmmc'
const PUBLIC_KEY = 'kgGZFZlIe8-RoS2vx'

export function initContact() {
  const form = document.getElementById('contactForm') as HTMLFormElement | null
  const send = document.getElementById('cfSend') as HTMLButtonElement | null
  const status = document.getElementById('cfStatus')
  if (!form || !send || !status) return

  emailjs.init({ publicKey: PUBLIC_KEY })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!form.reportValidity()) return

    send.disabled = true
    send.textContent = 'TRANSMITTING…'
    status.className = 'fst mono'
    status.textContent = ''

    const data = new FormData(form)
    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
        inGameName: String(data.get('inGameName') ?? ''),
        discordUsername: String(data.get('discordUsername') ?? ''),
        message: String(data.get('message') ?? ''),
      })
      status.classList.add('ok')
      status.textContent = 'Message transmitted.'
      form.reset()
    } catch {
      status.classList.add('er')
      status.textContent = 'Transmission failed — check your connection and try again.'
    } finally {
      send.disabled = false
      send.textContent = 'SEND MESSAGE'
    }
  })
}
