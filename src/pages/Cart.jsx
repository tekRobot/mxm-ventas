import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CartSection from "../components/CartSection";
import { useAuth } from "../context/AuthContext";
import ImageModal from "../components/ImageModal";
import { API_BASE_URL, IMAGE_BASE_URL } from "../config/api";

const Cart = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryParams = new URLSearchParams(location.search);
  const pedidoId = queryParams.get('pedido');
  
  const [cartData, setCartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imagesData, setImagesData] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [addingTicket, setAddingTicket] = useState(false);

  // Función para obtener el modelo del artículo (caracteres 3-6)
  const getModeloFromArticulo = (articulo) => {
    return articulo.substring(2, 6);
  };

  // Función para obtener el código de variación (caracteres 3-7)
  const getCodigoVariacionFromArticulo = (articulo) => {
    return articulo.substring(2, 7);
  };

  // Función para buscar la imagen de un artículo
  const fetchImageForArticle = async (articulo) => {
    try {
      const modelo = getModeloFromArticulo(articulo);
      const codigoVariacion = getCodigoVariacionFromArticulo(articulo);
      
      const response = await fetch(
        `${API_BASE_URL}/ConsultaVariacionModelo?Modelo=${modelo}`
      );
      
      if (!response.ok) {
        throw new Error("Error al obtener variaciones del modelo");
      }
      
      const variaciones = await response.json();
      
      // Buscar la variación que coincida con nuestro código
      const variacion = variaciones.find(v => v.Codigo === codigoVariacion);
      
      if (variacion && variacion.Imagen) {
        const imagenPath = variacion.Imagen.replace(/\\/g, '/');
        console.log(`Imagen para artículo ${articulo}: ${imagenPath}`);
        return `${IMAGE_BASE_URL}/${imagenPath}`;
      }
      
      return null;
    } catch (error) {
      console.error(`Error al obtener imagen para artículo ${articulo}:`, error);
      return null;
    }
  };

  // Función para cargar todas las imágenes de los artículos del carrito
  const loadCartImages = async (partes) => {
    const images = {};
    
    for (const item of partes) {
      const imageUrl = await fetchImageForArticle(item.Articulo);
      images[item.Articulo] = imageUrl;
    }
    
    return images;
  };

  // Función para agregar el producto TICKET (99PAQN700)
  const agregarTicket = async () => {
    if (!pedidoId || !user) {
      alert("No hay pedido activo o usuario no logueado");
      return;
    }

    try {
      setAddingTicket(true);
      
      const response = await fetch(
        `${API_BASE_URL}/agregaArtPed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            Usuario: user.usuario || "",
            articulo: "99PAQN700", 
            cantidad: 1,
            precio: 0,
            venta: pedidoId,
            desdeInventario: true
          })
        }
      );

      if (!response.ok) {
        throw new Error("Error al agregar el ticket");
      }

      const result = await response.json();
      
      // Recargar los datos del carrito para reflejar el cambio
      const cartResponse = await fetch(
        `${API_BASE_URL}/Pedido/${pedidoId}?t=${Date.now()}`,
        {
          cache: "no-store"
        }
      );
      
      if (cartResponse.ok) {
        const updatedCartData = await cartResponse.json();
        setCartData(updatedCartData);
        
        // Cargar imágenes para todos los artículos
        if (updatedCartData.Part && updatedCartData.Part.length > 0) {
          const images = await loadCartImages(updatedCartData.Part);
          setImagesData(images);
        }
      }
      
      alert("Ticket agregado correctamente al pedido");
    } catch (err) {
      console.error("Error al agregar ticket:", err);
      alert(`Error al agregar ticket: ${err.message}`);
    } finally {
      setAddingTicket(false);
    }
  };

  useEffect(() => {
    const fetchCartData = async () => {
      try {
        setLoading(true);
        
        if (pedidoId) {
          const response = await fetch(
            `${API_BASE_URL}/Pedido/${pedidoId}?t=${Date.now()}`,
            {
              cache: "no-store"
            }
          );
          
          if (!response.ok) {
            throw new Error("Error al obtener los datos del pedido");
          }
          
          const data = await response.json();
          setCartData(data);
          
          // Cargar imágenes para todos los artículos
          if (data.Part && data.Part.length > 0) {
            const images = await loadCartImages(data.Part);
            setImagesData(images);
          }
        } else {
          setCartData(null);
          setImagesData({});
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchCartData();
    }
  }, [pedidoId, user]);

  // Verificar si hay servicios de paquetería en el carrito
  const hasPaqueteria = useMemo(() => {
    if (!cartData?.Part) return false;
    if (cartData.Part.some(item => item.Articulo.startsWith('99PAQN700'))) {
      return false;
    }
    return cartData.Part.some(item => item.Articulo.startsWith('99PAQ'));
  }, [cartData]);

  // Separar artículos por Stock
  const { itemsStock, itemsNoStock } = useMemo(() => {
    if (!cartData?.Part) return { itemsStock: [], itemsNoStock: [] };
    
    const stockItems = [];
    const noStockItems = [];
    
    cartData.Part.forEach((item, index) => {
      const cartItem = {
        id: index,
        name: item.Descrip || `Artículo ${item.Articulo}`,
        price: parseFloat(item.Precio),
        quantity: parseInt(item.Cant),
        importe: parseFloat(item.Importe),
        code: item.Articulo,
        status: cartData.ESTADO === 'PE' ? 'preventa' : 'stock',
        image: imagesData[item.Articulo] || null,
        partId: item.PartId,
        partVta: item.PartVta,
        Stock: item.Stock
      };
      
      if (item.Stock === 2) {
        noStockItems.push(cartItem);
      } else {
        stockItems.push(cartItem);
      }
    });
    
    return { itemsStock: stockItems, itemsNoStock: noStockItems };
  }, [cartData, imagesData]);

  // Calcular totales monetarios
  const totalStock = itemsStock.reduce((sum, item) => sum + item.importe, 0);
  const totalNoStock = itemsNoStock.reduce((sum, item) => sum + item.importe, 0);
  const totalGeneral = totalStock + totalNoStock;

  // Calcular total de productos (cantidad de piezas) - ¡ESTAS SON LAS QUE IMPORTAN!
  const totalPiezasStock = itemsStock.reduce((sum, item) => sum + item.quantity, 0);
  const totalPiezasNoStock = itemsNoStock.reduce((sum, item) => sum + item.quantity, 0);
  const totalPiezasGeneral = totalPiezasStock + totalPiezasNoStock;

  // Determinar si hay artículos sin stock (stock = 2)
  const hasNoStockItems = itemsNoStock.length > 0;

  // Función para abrir el modal de imagen
  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  // Función para cerrar el modal
  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const removeItem = async (index, isNoStockItem = false) => {
    try {
      const itemsArray = isNoStockItem ? itemsNoStock : itemsStock;
      const itemToRemove = itemsArray[index];
      
      if (!itemToRemove) {
        throw new Error("Artículo no encontrado en el carrito");
      }

      const response = await fetch(
        `${API_BASE_URL}/EliminarPartPed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            Folio: pedidoId,
            PartId: itemToRemove.partId
          })
        }
      );
      
      if (!response.ok) {
        throw new Error("Error al eliminar el artículo del pedido");
      }
      
      // Actualizar el estado del carrito después de eliminar el artículo
      setCartData(prevData => ({
        ...prevData,
        Part: prevData.Part.filter(item => item.PartId !== itemToRemove.partId)
      }));

      alert(`Artículo eliminado del pedido #${pedidoId}`);
    } catch (err) {
      setError(err.message);
      alert(`Error al eliminar el artículo: ${err.message}`);
    }
  };

  const clearCart = async () => {
    if (!pedidoId) return;
    
    if (!window.confirm('¿Estás seguro que deseas vaciar todo el carrito? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/VaciarPedido`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            Folio: pedidoId
          })
        }
      );
      
      if (!response.ok) {
        throw new Error("Error al vaciar el carrito");
      }
      
      // Actualizar el estado del carrito
      setCartData(prevData => ({
        ...prevData,
        Part: [],
        TotVenta: 0
      }));
      
      alert('Carrito vaciado correctamente');
    } catch (err) {
      setError(err.message);
      alert(`Error al vaciar el carrito: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async () => {
    if (!pedidoId) return;
    
    if (!window.confirm('¿Estás seguro que deseas CANCELAR COMPLETAMENTE este pedido? Esta acción es irreversible y eliminará todo el pedido.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/CancelarPedido`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            Folio: pedidoId
          })
        }
      );
      
      if (!response.ok) {
        throw new Error("Error al cancelar el pedido");
      }
      
      alert('Pedido cancelado correctamente');
      navigate('/');
    } catch (err) {
      setError(err.message);
      alert(`Error al cancelar el pedido: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Confirmar solo artículos en stock (Parcial = true)
  const confirmStockOnly = async () => {
    if (!pedidoId) return;
    
    // Validar que haya servicio de paquetería
    if (!hasPaqueteria) {
      alert('Error: Debe agregar al menos un servicio de paquetería antes de confirmar el pedido.');
      return;
    }
    
    if (!window.confirm('¿Estás seguro que deseas confirmar SOLO los artículos en stock? Los artículos sin stock permanecerán en el pedido.')) {
      return;
    }

    try {
      setProcessingOrder(true);
      const response = await fetch(
        `${API_BASE_URL}/ConfirmarPedido`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            Folio: parseInt(pedidoId),
            EsParcial: true
          })
        }
      );
      
      if (!response.ok) {
        throw new Error("Error al confirmar el pedido parcial");
      }
      
      alert('Pedido parcial confirmado correctamente (solo artículos en stock)');
      navigate('/');
    } catch (err) {
      setError(err.message);
      alert(`Error al confirmar el pedido parcial: ${err.message}`);
    } finally {
      setProcessingOrder(false);
    }
  };

  // Confirmar todos los artículos (Parcial = false)
  const confirmAll = async () => {
    if (!pedidoId) return;
    
    // Validar que haya servicio de paquetería
    if (!hasPaqueteria) {
      alert('Error: Debe agregar al menos un servicio de paquetería antes de confirmar el pedido.');
      return;
    }
    
    if (!window.confirm('¿Estás seguro que deseas confirmar TODOS los artículos del pedido (stock y sin stock)?')) {
      return;
    }

    try {
      setProcessingOrder(true);
      const response = await fetch(
        `${API_BASE_URL}/ConfirmarPedido`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            Folio: parseInt(pedidoId),
            EsParcial: false
          })
        }
      );
      
      if (!response.ok) {
        throw new Error("Error al confirmar el pedido completo");
      }
      
      alert('Pedido completo confirmado correctamente');
      navigate('/');
    } catch (err) {
      setError(err.message);
      alert(`Error al confirmar el pedido completo: ${err.message}`);
    } finally {
      setProcessingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando carrito...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!cartData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No se encontró información del pedido</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {pedidoId ? `Pedido #${pedidoId}` : 'Mi Carrito'}
                </h1>
                {pedidoId && (
                  <div className="mt-2">
                    <p className="text-gray-600">Cliente: {cartData?.NombreCLIENTE?.trim()}</p>
                    <p className="text-gray-600">Estado: {cartData?.ESTADO === 'PE' ? 'Pendiente' : 'Completado'}</p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {pedidoId && (
                  <>
                    <Link 
                      to={`/productos?pedido=${pedidoId}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      Agregar más productos
                    </Link>
                    <button
                      onClick={cancelOrder}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50 transition-colors"
                    >
                      Cancelar Pedido
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Sección de Artículos en Stock */}
            {itemsStock.length > 0 && (
              <CartSection 
                title="🟢 Artículos en Stock" 
                items={itemsStock} 
                subtotal={totalStock}
                totalPiezas={totalPiezasStock}
                removeItem={(index) => removeItem(index, false)}
                loading={loading}
                onImageClick={openImageModal}
                showProcessButton={hasNoStockItems}
                onProcess={confirmStockOnly}
                processButtonText="Confirmar Solo Stock"
                processButtonColor="yellow"
                onClean={clearCart}
                hasPaqueteria={hasPaqueteria}
              />
            )}

            {/* Sección de Artículos Sin Stock */}
            {itemsNoStock.length > 0 && (
              <div className="mt-8">
                <CartSection 
                  title="🟡 Artículos Sin Stock" 
                  items={itemsNoStock} 
                  subtotal={totalNoStock}
                  totalPiezas={totalPiezasNoStock}
                  removeItem={(index) => removeItem(index, true)}
                  loading={loading}
                  onImageClick={openImageModal}
                  showProcessButton={false}
                  onClean={clearCart}
                  hasPaqueteria={hasPaqueteria}
                />
              </div>
            )}

            {/* Resumen de Totales */}
            <div className="border-t border-gray-200 mt-6 pt-6 space-y-3">
              {itemsStock.length > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="font-semibold">Total Artículos en Stock:</span>
                  <div className="text-right">
                    <span className="font-bold">${totalStock.toFixed(2)}</span>
                    <span className="text-sm text-gray-500 ml-2">({totalPiezasStock} piezas)</span>
                  </div>
                </div>
              )}
              
              {itemsNoStock.length > 0 && (
                <div className="flex justify-between items-center text-yellow-600">
                  <span className="font-semibold">Total Artículos Sin Stock:</span>
                  <div className="text-right">
                    <span className="font-bold">${totalNoStock.toFixed(2)}</span>
                    <span className="text-sm text-gray-500 ml-2">({totalPiezasNoStock} piezas)</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center text-lg border-t border-gray-300 pt-3">
                <span className="font-semibold">Total General:</span>
                <div className="text-right">
                  <span className="font-bold">${totalGeneral.toFixed(2)}</span>
                  <span className="text-sm text-gray-500 ml-2">({totalPiezasGeneral} piezas)</span>
                </div>
              </div>
            </div>

            {/* Botones de Acción Globales */}
            {(itemsStock.length > 0 || itemsNoStock.length > 0) && (
              <div className="mt-8 flex flex-wrap gap-4 justify-between items-center">
                <div className="flex flex-wrap gap-2">
                  {/* Botón para agregar ticket */}
                  <button
                    onClick={agregarTicket}
                    disabled={addingTicket || loading}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-md disabled:opacity-50 transition-colors"
                  >
                    {addingTicket ? (
                      'Agregando...'
                    ) : (
                      <>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5" 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path 
                            fillRule="evenodd" 
                            d="M5 4a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H5zm0-2a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V5a3 3 0 00-3-3H5z" 
                            clipRule="evenodd" 
                          />
                          <path 
                            d="M7 7a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zM7 10a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zM7 13a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" 
                          />
                        </svg>
                        Imprimir
                      </>
                    )}
                  </button>
                  
                  {/* Mostrar botón "Confirmar Solo Stock" solo cuando hay artículos sin stock */}
                  {hasNoStockItems && itemsStock.length > 0 && (
                    <button
                      onClick={confirmStockOnly}
                      disabled={processingOrder || loading || !hasPaqueteria}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-md disabled:opacity-50 transition-colors"
                    >
                      {processingOrder ? 'Procesando...' : 'Confirmar Solo Stock'}
                    </button>
                  )}
                  
                  <button
                    onClick={confirmAll}
                    disabled={processingOrder || loading || !hasPaqueteria}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md disabled:opacity-50 transition-colors"
                  >
                    {processingOrder ? 'Procesando...' : 'Confirmar Todos'}
                  </button>
                </div>
              </div>
            )}

            {/* Información adicional */}
            <div className="mt-6 space-y-4">
              {!hasPaqueteria && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800 font-semibold">
                    ⚠️ Para confirmar el pedido, debe agregar al menos un servicio de paquetería.
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Vaya a "Agregar más productos" y seleccione un servicio de paquetería.
                  </p>
                </div>
              )}
              
              <div className="p-4 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> 
                  {hasNoStockItems 
                    ? ' Los artículos marcados como "Sin Stock" requieren confirmación especial. Puede confirmar solo los disponibles o todo el pedido.'
                    : ' Todos los artículos están disponibles en stock.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para imagen ampliada */}
      <ImageModal 
        imageUrl={selectedImage}
        isOpen={selectedImage !== null}
        onClose={closeImageModal}
      />
    </>
  );
};

export default Cart;