/** @type {import('tailwindcss').Config} */
/**
 * Tokens extraits de buddyboss-theme v2.21.0
 * - inc/admin/options/custom-css.php
 * - inc/admin/options-init.php (presets default)
 * - assets/css/theme.css
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bb: {
          primary: 'var(--bb-primary-color)',
          'primary-hover': 'var(--bb-primary-button-background-hover)',
          body: 'var(--bb-body-background-color)',
          content: 'var(--bb-content-background-color)',
          alt: 'var(--bb-content-alternate-background-color)',
          border: 'var(--bb-content-border-color)',
          cover: 'var(--bb-cover-image-background-color)',
          heading: 'var(--bb-headings-color)',
          text: 'var(--bb-body-text-color)',
          muted: 'var(--bb-alternate-text-color)',
          header: 'var(--bb-header-background)',
          'header-alt': 'var(--bb-header-alternate-background)',
          'header-link': 'var(--bb-header-links)',
          'header-link-hover': 'var(--bb-header-links-hover)',
          sidenav: 'var(--bb-sidenav-background)',
          'sidenav-text': 'var(--bb-sidenav-text-regular)',
          'sidenav-hover': 'var(--bb-sidenav-menu-background-color-hover)',
          'sidenav-active': 'var(--bb-sidenav-menu-background-color-active)',
          footer: 'var(--bb-footer-background)',
          'footer-text': 'var(--bb-footer-text-color)',
          success: 'var(--bb-success-color)',
          warning: 'var(--bb-warning-color)',
          danger: 'var(--bb-danger-color)',
          label: 'var(--bb-label-background-color)',
          'label-text': 'var(--bb-label-text-color)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen-Sans',
          'Ubuntu',
          'Cantarell',
          '"Helvetica Neue"',
          'sans-serif',
        ],
      },
      fontSize: {
        'bb-xs': ['0.75rem', { lineHeight: '1.4' }],
        'bb-sm': ['0.8125rem', { lineHeight: '1.45' }],
        'bb-base': ['0.9375rem', { lineHeight: '1.5' }],
        'bb-md': ['1rem', { lineHeight: '1.5' }],
        'bb-lg': ['1.125rem', { lineHeight: '1.4' }],
        'bb-xl': ['1.5rem', { lineHeight: '1.3' }],
      },
      spacing: {
        'bb-1': '0.25rem',
        'bb-2': '0.5rem',
        'bb-3': '0.75rem',
        'bb-4': '1rem',
        'bb-5': '1.25rem',
        'bb-6': '1.5rem',
        'bb-7': '1.875rem',
        'bb-8': '2.1875rem',
        header: 'var(--bb-header-height)',
        panel: 'var(--bb-panel-width)',
        'panel-open': 'var(--bb-panel-width-open)',
      },
      maxWidth: {
        container: '1200px',
        content: '900px',
      },
      borderRadius: {
        bb: 'var(--bb-block-radius)',
        'bb-inner': 'var(--bb-block-radius-inner)',
        'bb-input': 'var(--bb-input-radius)',
        'bb-btn': 'var(--bb-button-radius)',
        'bb-option': 'var(--bb-option-radius)',
      },
      boxShadow: {
        header: 'inset 0 -1px 0 0 #dcdfe3',
        panel: '0 3px 13px 0 rgba(18, 43, 70, 0.1)',
        dropdown: '0 2px 8px rgba(18, 43, 70, 0.12)',
        card: '0 1px 2px rgba(18, 43, 70, 0.06)',
      },
      height: {
        header: 'var(--bb-header-height)',
      },
      width: {
        panel: 'var(--bb-panel-width)',
        'panel-open': 'var(--bb-panel-width-open)',
      },
      screens: {
        bb: '800px',
      },
      zIndex: {
        header: 'var(--bb-z-header)',
        panel: 'var(--bb-z-panel)',
        mobile: 'var(--bb-z-mobile-overlay)',
        'mobile-panel': 'var(--bb-z-mobile-panel)',
        search: 'var(--bb-z-search)',
        dropdown: 'var(--bb-z-dropdown)',
      },
      transitionDuration: {
        panel: '200ms',
      },
    },
  },
  plugins: [],
}
