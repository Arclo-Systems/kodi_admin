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

  it('economía: roles alineados al RBAC del backend', () => {
    expect(can('commercial', 'economy:sponsor:write')).toBe(true);
    expect(can('commercial', 'economy:achievement:read')).toBe(false);
    expect(can('editor', 'economy:banner:write')).toBe(true);
    expect(can('editor', 'economy:sponsor:read')).toBe(false);
    expect(can('support', 'view:economy')).toBe(false);
    expect(can('admin', 'economy:raffle:manage')).toBe(true);
  });
});
