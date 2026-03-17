export const smoothEase = [0.22, 1, 0.36, 1] as const;
export const standardEase = [0.4, 0, 0.2, 1] as const;

export const transitions = {
  pageEnter: { duration: 0.38, ease: smoothEase } as const,
  panelEnter: { duration: 0.34, ease: smoothEase } as const,
  overlay: { duration: 0.28, ease: standardEase } as const,
  dropdown: { duration: 0.2, ease: standardEase } as const,
  microSpring: { type: 'spring', stiffness: 300, damping: 28, mass: 0.7 } as const,
};
