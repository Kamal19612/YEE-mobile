# Rapport UX Sidebar / Header — AfrEA-YEE

## Diagnostic (problèmes réels uniquement)

1. **Panel replié désaligné** — `BuddyPanel.jsx` : logo AY + bouton toggle empilés dans `h-header` → hauteur incohérente avec le header sticky.
2. **z-index en dur** — `z-[620]` / `z-[621]` / `z-[630]` au lieu des tokens Tailwind (`z-mobile`, etc.).
3. **Continuité visuelle** — bandeau panel sans `bg-bb-header` / même `border-b` que le masthead → rupture au coin.
4. **Largeurs panel** — `68px` / `230px` dupliqués dans Tailwind au lieu de variables CSS.

Non-problèmes confirmés : sticky vs fixed (pattern BuddyBoss OK), breakpoint `bb:` partagé, scroll interne sidebar, états actifs NavLink.

## Corrections

| Cause racine | Correctif |
|---|---|
| Panel replié trop haut | Une seule pastille AY cliquable pour ouvrir (plus d’empilement) |
| z-index dupliqués | Tokens `--bb-z-*` + `z-header` / `z-panel` / `z-mobile` / `z-mobile-panel` / `z-search` / `z-dropdown` |
| Bandeaux désynchronisés | `panel-head` et headers : `h-header` + `bg-bb-header` + `border-b border-bb-border` |
| Largeurs hardcodées | `--bb-panel-width` / `--bb-panel-width-open` → `w-panel` / `ml-panel` |

## Source de vérité unique

```
--bb-header-height
--bb-panel-width / --bb-panel-width-open
--bb-z-header / --bb-z-panel / --bb-z-mobile-overlay / --bb-z-mobile-panel / --bb-z-search / --bb-z-dropdown
screens.bb = 800px  (header + sidebar + margin page)
```
