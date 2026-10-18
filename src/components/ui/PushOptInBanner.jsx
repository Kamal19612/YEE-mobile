import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import {
  canUseWebPushApis,
  platformAllowsPush,
  shouldShowIosInstallHint,
} from '../../lib/pwaInstall'
import { enableWebPush, wasPushEnabledLocally } from '../../lib/webPush'

const DISMISS_KEY = 'yee.push.optin.dismissed'

/**
 * Bandeau global : invite à activer le Web Push (Android / iOS installé)
 * ou à installer la PWA (iOS Safari).
 */
export function PushOptInBanner() {
  const { t } = useTranslation()
  const { isAuthenticated, isBootstrapping } = useAuth()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (isBootstrapping || !isAuthenticated) {
      setVisible(false)
      return
    }
    if (!canUseWebPushApis()) {
      setVisible(false)
      return
    }
    if (wasPushEnabledLocally()) {
      setVisible(false)
      return
    }
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') {
        setVisible(false)
        return
      }
    } catch {
      /* ignore */
    }
    setVisible(true)
  }, [isAuthenticated, isBootstrapping])

  const dismiss = useCallback(() => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [])

  const onEnable = useCallback(async () => {
    setBusy(true)
    setMessage(null)
    try {
      if (shouldShowIosInstallHint()) {
        setMessage(t('pwa.iosPushRequiresInstall'))
        return
      }
      const result = await enableWebPush()
      if (result === 'subscribed') {
        setVisible(false)
        return
      }
      if (result === 'needs_install') {
        setMessage(t('pwa.iosPushRequiresInstall'))
      } else if (result === 'denied') {
        setMessage(t('pwa.pushDenied'))
      } else if (result === 'os_blocked') {
        setMessage(t('pwa.pushOsBlocked'))
      } else if (result === 'disabled') {
        setMessage(t('pwa.pushServerDisabled'))
      } else if (result === 'unsupported') {
        setMessage(t('pwa.pushUnsupported'))
      } else {
        setMessage(t('pwa.pushError'))
      }
    } finally {
      setBusy(false)
    }
  }, [t])

  if (!visible) return null

  const iosHint = shouldShowIosInstallHint()
  const canEnable = platformAllowsPush() || iosHint

  if (!canEnable) return null

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-2 bg-[rgba(0,102,163,0.12)] px-4 py-2.5 text-center text-bb-sm text-bb-heading"
    >
      <span>
        {iosHint ? t('pwa.iosInstallHint') : t('pwa.pushOptInHint')}
      </span>
      {!iosHint && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onEnable().catch(() => setMessage(t('pwa.pushError')))}
          className="rounded-bb-inner bg-bb-primary px-2.5 py-1 text-bb-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? t('pwa.pushEnabling') : t('pwa.enablePush')}
        </button>
      )}
      {message && <span className="w-full text-bb-warning">{message}</span>}
      <button
        type="button"
        onClick={dismiss}
        className="text-bb-sm font-medium text-bb-muted underline"
      >
        {t('pwa.dismiss')}
      </button>
    </div>
  )
}
