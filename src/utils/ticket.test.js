import { describe, it, expect, vi, afterEach } from 'vitest';
import { agregarTicketAPedido } from './ticket';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('agregarTicketAPedido', () => {
  it('posts the ticket article with the given pedido and username', async () => {
    const mockJson = vi.fn().mockResolvedValue({ Mensaje: 'Artículo agregado correctamente' });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });

    await agregarTicketAPedido('4512', '51');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/agregaArtPed');

    const body = JSON.parse(options.body);
    expect(body).toEqual({
      Usuario: '51',
      articulo: '99PAQN700',
      cantidad: 1,
      precio: 0,
      venta: '4512',
      desdeInventario: true
    });
  });

  it('defaults Usuario to an empty string when no username is given', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ Mensaje: 'Artículo agregado correctamente' })
    });

    await agregarTicketAPedido('4512', undefined);

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.Usuario).toBe('');
  });

  it('throws when the response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: vi.fn() });

    await expect(agregarTicketAPedido('4512', '51')).rejects.toThrow('Error al agregar el ticket');
  });

  it('resolves with the parsed JSON body on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ Mensaje: 'Artículo agregado correctamente' })
    });

    const result = await agregarTicketAPedido('4512', '51');

    expect(result).toEqual({ Mensaje: 'Artículo agregado correctamente' });
  });

  it('throws with the server message when the backend rejects the article (e.g. paqueteria limit)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        Mensaje: 'Este pedido ya tiene un artículo de paquetería, solo se permite otro si es 99PAQN400'
      })
    });

    await expect(agregarTicketAPedido('4512', '51')).rejects.toThrow(
      'Este pedido ya tiene un artículo de paquetería, solo se permite otro si es 99PAQN400'
    );
  });

  it('throws a generic error when the response has no usable Mensaje', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) });

    await expect(agregarTicketAPedido('4512', '51')).rejects.toThrow('Error al agregar el ticket');
  });
});
