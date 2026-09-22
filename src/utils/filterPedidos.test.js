import { describe, it, expect } from 'vitest';
import { filterPedidosByNombreCliente } from './filterPedidos';

const pedido = (VENTA, NombreCLIENTE) => ({ VENTA, NombreCLIENTE });

describe('filterPedidosByNombreCliente', () => {
  const pedidos = [
    pedido(1, 'Ernesto Morales'),
    pedido(2, 'Miriam Castro'),
    pedido(3, 'Abril Camarena Garcia'),
  ];

  it('returns all pedidos when the query is empty or blank', () => {
    expect(filterPedidosByNombreCliente(pedidos, '')).toEqual(pedidos);
    expect(filterPedidosByNombreCliente(pedidos, '   ')).toEqual(pedidos);
  });

  it('matches case-insensitively on a partial name', () => {
    const result = filterPedidosByNombreCliente(pedidos, 'miriam');
    expect(result.map((p) => p.VENTA)).toEqual([2]);
  });

  it('matches on any part of the full name, not just the start', () => {
    const result = filterPedidosByNombreCliente(pedidos, 'garcia');
    expect(result.map((p) => p.VENTA)).toEqual([3]);
  });

  it('ignores leading/trailing whitespace in the query', () => {
    const result = filterPedidosByNombreCliente(pedidos, '  ernesto  ');
    expect(result.map((p) => p.VENTA)).toEqual([1]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterPedidosByNombreCliente(pedidos, 'zzz')).toEqual([]);
  });

  it('skips pedidos with a missing NombreCLIENTE instead of throwing', () => {
    const withMissingName = [...pedidos, pedido(4, undefined)];
    expect(() => filterPedidosByNombreCliente(withMissingName, 'a')).not.toThrow();
  });
});
