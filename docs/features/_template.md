# <Screen>

One line: what the screen is.

## Purpose

What the user does here and why.

## Layout

Token names only, never values: spacing, radius, typography, color, layout.

## Platform differences

What differs between iOS and Android, or "None".

## States

| State            | What is drawn | i18n keys |
| ---------------- | ------------- | --------- |
| Loading          |               |           |
| With data        |               |           |
| Expected empty   |               |           |
| Error with retry |               |           |

## Data

Per route: paginated or not, `Cache-Control`, reasons listed, reasons the screen
branches on and the i18n key each one maps to.

## Navigation

The route, how it is reached and where it leads.

## i18n namespace

The namespaces the screen reads.

## Checked by hand

What no automated test covered.
