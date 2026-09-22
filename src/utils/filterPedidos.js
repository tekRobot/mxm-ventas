export const filterPedidosByNombreCliente = (pedidos, query) => {
  const trimmed = query?.trim().toLowerCase();
  if (!trimmed) return pedidos;

  return pedidos.filter((pedido) =>
    (pedido.NombreCLIENTE || '').toLowerCase().includes(trimmed)
  );
};
