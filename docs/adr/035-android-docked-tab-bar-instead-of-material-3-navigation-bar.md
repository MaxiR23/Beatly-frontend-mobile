# 035. Android docked tab bar instead of the Material 3 navigation bar

## Context

ADR 027 item 11 planned "A Material 3 navigation bar with the mini player resting on it" and said items 11 and 12 "get their own records before their issues". Android today draws the iOS pill (`FloatingTabBar`) with the mini player floating above it. The player sheet's Android tabs (ADR 027 item 7) already depart from Material 3 on purpose: no divider, the fade on press, the selected label heavier.

## Decision

- On Android the tab bar is one block docked to the bottom edge, full width, with no surface of its own: a vertical fade from `color.overlay.clear` to `color.surface.base` that starts `spacing.xl` above its top element and is fully opaque in the bottom inset.
- Four equal tabs with the icon above the name, both from the `tabs` i18n keys. The selected tab is `color.text.primary` with `typography.tabLabelSelected` and Home's icon filled; the others are `color.text.secondary` with `typography.meta`. No indicator. The press is `pressFeedback`'s `android: "fade"`. Each tab is at least `layout.controlHeight` tall.
- The mini player rests inside the block, `spacing.sm` from the sides and `spacing.xs` above the tabs, with its Android shape, height and tint.
- One function, `dockedTabBarHeight`, gives the block's height and the screens' clearance on Android.
- iOS 26+ (native tabs, ADR 017) and iOS before 26 (the pill) do not change.
- Deliberate departures from Material 3, not to be "fixed": no pill active indicator, no surface container of its own (the fade instead), the fade on press instead of the ripple, the heavier selected label.
- Why: consistency with the player sheet's tabs and with the rest of the app, whose surfaces are the base surface and fades into it.
- Rejected: the Material 3 navigation bar (an 80-tall surface-container bar with a pill indicator, foreign to the app's other surfaces); keeping the iOS pill on Android (ADR 027 already rejected iOS shapes on Android); native tabs on Android (they cannot host the mini player above the tabs inside the same block in our style).

## Consequences

- This record supersedes item 11 of ADR 027. 027 stays as written; the README corrects it.
- A change to the bar's layout changes `dockedTabBarHeight` and nothing in the screens.
- The Android bottom room of every tab screen, and the floating `Notice` offset, go from `inset + 88 (+60)` to `inset + 84 (+60)`: the clearance now equals the block's height, with the last item resting at the top of the fade. Intended.
- The bar is checked on an Android phone.
