export const smoothEase = [0.22, 1, 0.36, 1] as const;
export const standardEase = [0.4, 0, 0.2, 1] as const;

export const transitions = {
  pageEnter: { duration: 0.18, ease: smoothEase } as const,
  panelEnter: { duration: 0.18, ease: smoothEase } as const,
  overlay: { duration: 0.16, ease: standardEase } as const,
  dropdown: { duration: 0.14, ease: standardEase } as const,
  microSpring: { type: 'spring', stiffness: 340, damping: 32, mass: 0.65 } as const,
};
