const isPaqueteria = (item) => item.code?.startsWith('99PAQ');

export const sortPaqueteriaLast = (items) => {
  const regular = items.filter((item) => !isPaqueteria(item));
  const paqueteria = items.filter(isPaqueteria);
  return [...regular, ...paqueteria];
};
