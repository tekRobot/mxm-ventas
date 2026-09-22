import { API_BASE_URL } from '../config/api';

const TICKET_ARTICULO = '99PAQN700';

export const agregarTicketAPedido = async (pedidoId, username) => {
  const response = await fetch(`${API_BASE_URL}/agregaArtPed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Usuario: username || '',
      articulo: TICKET_ARTICULO,
      cantidad: 1,
      precio: 0,
      venta: pedidoId,
      desdeInventario: true
    })
  });

  if (!response.ok) {
    throw new Error('Error al agregar el ticket');
  }

  return response.json();
};
