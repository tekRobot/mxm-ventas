export const findVentaPendiente = (clientesConPedidoPendiente, idCliente) => {
  const match = clientesConPedidoPendiente.find((p) => p.IDCLIENTE === idCliente);
  return match ? match.VENTA : null;
};
