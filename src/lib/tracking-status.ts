export function mapTrackingStep(orderStatus?: string, deliveryStatus?: string) {
  if (orderStatus === 'entregue' || deliveryStatus === 'finalizada') {
    return 3;
  }

  if (orderStatus === 'em_entrega' || orderStatus === 'pronto' || deliveryStatus === 'a_caminho' || deliveryStatus === 'coletada') {
    return 2;
  }

  if (
    orderStatus === 'em_preparo' ||
    orderStatus === 'aceito_loja' ||
    orderStatus === 'pago' ||
    deliveryStatus === 'aceita' ||
    deliveryStatus === 'ofertada'
  ) {
    return 1;
  }

  return 0;
}
