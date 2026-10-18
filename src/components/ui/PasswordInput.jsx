import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconEye, IconEyeOff } from '../icons'

const inputClassName =
  'bb-input h-11 w-full rounded-bb-input border border-bb-border bg-bb-content py-2 pl-3 pr-11 text-bb-base text-bb-heading outline-none'

export function PasswordInput({ className = inputClassName, ...props }) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input type={visible ? 'text' : 'password'} className={className} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-bb-muted hover:text-bb-heading"
        aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
        aria-pressed={visible}
        tabIndex={-1}
      >
        {visible ? <IconEyeOff className="h-5 w-5" /> : <IconEye className="h-5 w-5" />}
      </button>
    </div>
  )
}
