# 033. Spanish strings use voseo

## Context

The Spanish strings mixed two forms of address: the newer ones used voseo ("Elegí al menos 5",
"Álbumes para vos") while older ones used tú ("Busca o explora para empezar a escuchar"). ADR 009
holds the i18n conventions and does not say which form to use.

## Decision

- Every Spanish string uses voseo, in every `es` namespace.
- Imperative: "Buscá", "Elegí", "Intentá", "Creá", "Usá".
- Present: "tenés", "podés", "querés".
- Pronoun: "vos", also after a preposition ("para vos", not "para ti").
- Forms shared with tú stay as they are: "tu", "tus", "te".
- Only the `es` values change. Keys, interpolations and plural variants are not affected, and `en` is
  not affected.

## Consequences

- One form of address across the app.
- Rejected: tú everywhere (the newer strings and the audience already use voseo).
