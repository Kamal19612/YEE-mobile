import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import {
  canUseWebPushApis,
  platformAllowsPush,
  shouldShowIosInstallHint,
} from '../../lib/pwaInstall'
import {
  disableWebPush,
  enableWebPush,
  wasPushEnabledLocally,
} from '../../lib/webPush'

/** Carte d’activation Web Push (geste utilisateur — requis iOS / bonnes pratiques). */
export function PushEnableCard() {
  const { t } = useTranslation()
  const [status, setStatus] = useState('idle') // idle | loading | subscribed | ...
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    const ok = canUseWebPushApis()
    setSupported(ok)
    if (ok && wasPushEnabledLocally() && platformAllowsPush()) {
      setStatus('subscribed')
    }
  }, [])

  const onEnable = useCallback(async () => {
    setStatus('loading')
    const result = await enableWebPush()
    setStatus(result === 'subscribed' ? 'subscribed' : result)
  }, [])

  const onDisable = useCallback(async () => {
    setStatus('loading')
    await disableWebPush()
    setStatus('idle')
  }, [])

  if (!supported) return null

  const needsInstall = shouldShowIosInstallHint()

  return (
    <div className="bb-card mb-4 p-4">
      <h2 className="m-0 text-bb-md font-semibold text-bb-heading">{t('pwa.pushTitle')}</h2>
      <p className="m-0 mt-1 text-bb-sm text-bb-muted">{t('pwa.pushHelp')}</p>

      {needsInstall && (
        <p className="m-0 mt-2 text-bb-sm text-bb-warning">{t('pwa.iosPushRequiresInstall')}</p>
      )}

      {status === 'subscribed' && (
        <p className="m-0 mt-2 text-bb-sm text-bb-success">{t('pwa.pushEnabled')}</p>
      )}
      {status === 'denied' && (
        <p className="m-0 mt-2 text-bb-sm text-bb-danger">{t('pwa.pushDenied')}</p>
      )}
      {status === 'disabled' && (
        <p className="m-0 mt-2 text-bb-sm text-bb-warning">{t('pwa.pushServerDisabled')}</p>
      )}
      {status === 'error' && (
        <p className="m-0 mt-2 text-bb-sm text-bb-danger">{t('pwa.pushError')}</p>
      )}
      {status === 'os_blocked' && (
        <p className="m-0 mt-2 text-bb-sm text-bb-danger">{t('pwa.pushOsBlocked')}</p>
      )}
      {status === 'unsupported' && (
        <p className="m-0 mt-2 text-bb-sm text-bb-muted">{t('pwa.pushUnsupported')}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {status !== 'subscribed' ? (
          <Button
            type="button"
            size="sm"
            disabled={needsInstall || status === 'loading'}
            onClick={() => onEnable().catch(() => setStatus('error'))}
          >
            {status === 'loading' ? t('pwa.pushEnabling') : t('pwa.enablePush')}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={status === 'loading'}
            onClick={() => onDisable().catch(() => setStatus('idle'))}
          >
            {t('pwa.disablePush')}
          </Button>
        )}
      </div>
    </div>
  )
}
