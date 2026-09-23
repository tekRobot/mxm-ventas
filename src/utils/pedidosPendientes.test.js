import { describe, it, expect } from 'vitest';
import { findVentaPendiente } from './pedidosPendientes';

const pendiente = (IDCLIENTE, VENTA) => ({ IDCLIENTE, VENTA });

describe('findVentaPendiente', () => {
  const pendientes = [
    pendiente('003052', '248'),
    pendiente('00610', '1107'),
    pendiente('005002', '2005'),
  ];

  it('returns the VENTA of the matching pedido pendiente', () => {
    expect(findVentaPendiente(pendientes, '00610')).toBe('1107');
  });

  it('returns null when the client has no pedido pendiente', () => {
    expect(findVentaPendiente(pendientes, '999999')).toBeNull();
  });

  it('returns null when the list is empty', () => {
    expect(findVentaPendiente([], '00610')).toBeNull();
  });

  it('returns the first match when a client has more than one (should not normally happen)', () => {
    const withDuplicate = [...pendientes, pendiente('00610', '9999')];
    expect(findVentaPendiente(withDuplicate, '00610')).toBe('1107');
  });
});
