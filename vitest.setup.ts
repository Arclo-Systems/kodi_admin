import '@testing-library/jest-dom/vitest';

// jsdom no implementa scrollIntoView y Radix lo llama al abrir cualquier menú (Select, Dropdown):
// sin esto no se puede probar ninguna interacción con un desplegable.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

// Misma historia con ResizeObserver: Radix lo usa para medir (Switch, Popover) y jsdom no lo trae.
globalThis.ResizeObserver ??= class ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};
