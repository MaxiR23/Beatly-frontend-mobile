// INFO: shadow tokens, one per elevation role. All black, iOS reads
// opacity/radius/offset, Android reads elevation.
export const shadow = {
  cover: {
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  floating: {
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  control: {
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
} as const;
