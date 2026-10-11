import { describe, it, expect } from 'vitest';
import { parseBRLMoney, formatBRL } from './money.js';

describe('parseBRLMoney', () => {
  it('converte valores simples em formato brasileiro', () => {
    expect(parseBRLMoney('45,90')).toBe(45.9);
    expect(parseBRLMoney('R$ 45,90')).toBe(45.9);
    expect(parseBRLMoney('120,00')).toBe(120);
    expect(parseBRLMoney('10')).toBe(10);
  });

  it('converte valores com separadores de milhar', () => {
    expect(parseBRLMoney('1.250,50')).toBe(1250.5);
    expect(parseBRLMoney('R$ 3.500,00')).toBe(3500);
  });

  it('converte expressões idiomáticas brasileiras', () => {
    expect(parseBRLMoney('cinquentão de pizza')).toBe(50);
    expect(parseBRLMoney('cem conto no mercado')).toBe(100);
    expect(parseBRLMoney('cem pila')).toBe(100);
    expect(parseBRLMoney('vinte conto de crédito')).toBe(20);
    expect(parseBRLMoney('um barão')).toBe(1000);
  });

  it('converte notações de mil (mil, k)', () => {
    expect(parseBRLMoney('recebi 3 mil')).toBe(3000);
    expect(parseBRLMoney('3,5 mil')).toBe(3500);
    expect(parseBRLMoney('5k')).toBe(5000);
  });

  it('retorna null para textos sem valor monetário', () => {
    expect(parseBRLMoney('olá bom dia')).toBeNull();
    expect(parseBRLMoney('')).toBeNull();
  });
});

describe('formatBRL', () => {
  it('formata números como moeda BRL', () => {
    const formatted = formatBRL(45.9);
    expect(formatted).toContain('45,90');
    expect(formatted).toContain('R$');
  });
});
