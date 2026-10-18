import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  isAndroidDevice,
  isStandaloneDisplay,
  shouldShowIosInstallHint,
} from '../../lib/pwaInstall'

const DISMISS_KEY = 'yee.pwa.install.dismissed'

/**
 * Guidage installation PWA :
 * - iOS : instructions Partager → Sur l’écran d’accueil (requis pour push)
 * - Android : bouton d’install natif si beforeinstallprompt
 */
export function PwaInstallBanner() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [mode, setMode] = useState(null) // 'ios' | 'android'
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    if (isStandaloneDisplay()) return undefined
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return undefined
    } catch {
      /* ignore */
    }

    if (shouldShowIosInstallHint()) {
      setMode('ios')
      setVisible(true)
      return undefined
    }

    if (!isAndroidDevice()) return undefined

    const onBip = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setMode('android')
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  if (!visible || !mode) return null

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const installAndroid = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    try {
      await deferredPrompt.userChoice
    } catch {
      /* ignore */
    }
    setDeferredPrompt(null)
    dismiss()
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-2 bg-[rgba(0,102,163,0.1)] px-4 py-2 text-center text-bb-sm text-bb-heading"
    >
      {mode === 'ios' && (
        <span>
          {t('pwa.iosInstallHint')}
        </span>
      )}
      {mode === 'android' && (
        <>
          <span>{t('pwa.androidInstallHint')}</span>
          <button
            type="button"
            onClick={() => installAndroid().catch(() => {})}
            className="rounded-bb-inner bg-bb-primary px-2.5 py-1 text-bb-sm font-medium text-white"
          >
            {t('pwa.install')}
          </button>
        </>
      )}
      <button
        type="button"
        onClick={dismiss}
        className="text-bb-sm font-medium text-bb-muted underline"
        aria-label={t('pwa.dismiss')}
      >
        {t('pwa.dismiss')}
      </button>
    </div>
  )
}
