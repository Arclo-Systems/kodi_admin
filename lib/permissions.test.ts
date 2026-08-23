import { describe, it, expect } from 'vitest';
import { can, canWithScope } from './permissions';

describe('permissions', () => {
  it('admin puede todo', () => {
    expect(can('admin', 'user:delete')).toBe(true);
    expect(can('admin', 'admin:invite')).toBe(true);
  });

  it('support NO puede tocar email/delete/bot pero sí ban', () => {
    expect(can('support', 'user:email-change')).toBe(false);
    expect(can('support', 'user:delete')).toBe(false);
    expect(can('support', 'user:toggle-bot')).toBe(false);
    expect(can('support', 'user:ban')).toBe(true);
  });

  it('editor solo ve áreas básicas', () => {
    expect(can('editor', 'view:dashboard')).toBe(true);
    expect(can('editor', 'view:users')).toBe(false);
  });

  it('canWithScope bloquea acciones globales si scope regional', () => {
    expect(canWithScope('admin', false, 'admin:invite')).toBe(false);
    expect(canWithScope('admin', true, 'admin:invite')).toBe(true);
  });

  it('canWithScope no afecta acciones sin requisito de scope', () => {
    expect(canWithScope('admin', false, 'user:ban')).toBe(true);
  });

  // Identidad del correo y textos legales salen a TODOS los usuarios (y a las
  // fichas de las tiendas): el backend los tiene con @RequireRole(admin) y el
  // gating de UX no puede aflojarse sin que alguien lo note acá.
  it('mensajería/legal: identidad del correo y documentos legales son admin-only', () => {
    const adminOnly = ['messaging:brand', 'view:legal', 'legal:write'] as const;
    for (const action of adminOnly) {
      expect(can('admin', action)).toBe(true);
      expect(can('editor', action)).toBe(false);
      expect(can('commercial', action)).toBe(false);
      expect(can('support', action)).toBe(false);
    }
  });

  // La corona de la ruleta es una sola para todos los módulos y países: el editor puede tocar
  // los sectores de su módulo, pero no algo que le cambia la partida a todo el mundo.
  it('juego: la corona de la ruleta es admin-only', () => {
    expect(can('admin', 'game:wheel-config:write')).toBe(true);
    expect(can('editor', 'game:wheel-config:write')).toBe(false);
    expect(can('commercial', 'game:wheel-config:write')).toBe(false);
    expect(can('support', 'game:wheel-config:write')).toBe(false);
  });

  // Material de repaso: el editor carga y edita, pero publicar es lo que ven los
  // usuarios y el backend lo tiene con @RequireRole(admin).
  it('material de repaso: escribe el editor, publica solo el admin', () => {
    expect(can('editor', 'content:review-material:write')).toBe(true);
    expect(can('editor', 'content:review-material:publish')).toBe(false);
    expect(can('admin', 'content:review-material:publish')).toBe(true);
    expect(can('support', 'content:review-material:write')).toBe(false);
    expect(can('commercial', 'content:review-material:write')).toBe(false);
  });

  it('economía: roles alineados al RBAC del backend', () => {
    expect(can('commercial', 'economy:sponsor:write')).toBe(true);
    expect(can('commercial', 'economy:achievement:read')).toBe(false);
    expect(can('editor', 'economy:banner:write')).toBe(true);
    expect(can('editor', 'economy:sponsor:read')).toBe(false);
    expect(can('support', 'view:economy')).toBe(false);
    expect(can('admin', 'economy:raffle:manage')).toBe(true);
  });

  // Configurar la economía acuña moneda que se vende por dinero real: el backend lo
  // exige con @RequireGlobalScope y la UI tiene que reflejar el mismo corte, o le
  // ofrece a un admin regional botones que el servidor le va a rechazar.
  it.each([
    ['economy:rewards:write'],
    ['economy:energy:write'],
    ['economy:mission:write'],
    ['economy:store:write'],
    ['economy:referral:write'],
    ['economy:achievement:regrant'],
    ['economy:kokos-pack:write'],
    ['economy:subscription-price:write'],
  ] as const)('economía global: %s exige scope global', (action) => {
    expect(canWithScope('admin', true, action)).toBe(true);
    expect(canWithScope('admin', false, action)).toBe(false);
  });

  // El backend corta ADENTRO del handler y solo sobre los campos económicos, para no
  // bloquear al editor regional en lo cosmético (achievements-admin.controller.ts).
  it('economía: editar un logro NO exige scope global (el corte es por campo)', () => {
    expect(canWithScope('admin', false, 'economy:achievement:write')).toBe(true);
  });

});
