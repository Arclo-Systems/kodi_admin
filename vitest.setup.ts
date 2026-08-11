import '@testing-library/jest-dom/vitest';

// jsdom no implementa scrollIntoView y Radix lo llama al abrir cualquier menú (Select, Dropdown):
// sin esto no se puede probar ninguna interacción con un desplegable.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
