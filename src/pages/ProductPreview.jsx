import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import SizeButton from '../components/Product/SizeButton';
import ColorButton from '../components/Product/ColorButton';
import ProductImage from '../components/Product/ProductImage';
import ProductInfo from '../components/Product/ProductInfo';
import ProductActions from '../components/Product/ProductActions';
import LoadingOverlay from '../components/LoadingOverlay';
import { API_BASE_URL } from '../config/api';

const ProductPreview = () => {
  const { modelCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateCartCount } = useCart();
  
  const queryParams = new URLSearchParams(location.search);
  const pedidoId = queryParams.get('pedido');
  
  const [product, setProduct] = useState(null);
  const [variations, setVariations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [preorderQuantity, setPreorderQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [canSellByPackage, setCanSellByPackage] = useState(false);
  const [packageDetails, setPackageDetails] = useState({ 
    piecesPerPackage: 0, 
    hasPackageStock: false,
    hasPackagePreorderStock: false 
  });
  
  // Nuevo estado para el precio personalizado - solo para productos 99PAQ
  const [customPrice, setCustomPrice] = useState('');
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [is99PAQProduct, setIs99PAQProduct] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  // Función para recargar la página
  const reloadPage = () => {
    window.location.reload();
  };

  // Función auxiliar para verificar si la respuesta indica error de stock
  const hasStockError = (result) => {
    return result.Mensaje === "Ya no hay existencia, revisa inventario";
  };

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/ListModelos`, {
          cache: 'no-store'
        });
        if (!response.ok) throw new Error("Error al obtener los productos");
        const data = await response.json();
        
        const foundProduct = data.ListModelos.find(p => p.modelo === modelCode);
        if (!foundProduct) throw new Error("Producto no encontrado");
        
        setProduct(foundProduct);
        
        // Verificar si es producto 99PAQ
        const is99PAQ = foundProduct.modelo.includes('PAQ');
        setIs99PAQProduct(is99PAQ);
        
        const variationsResponse = await fetch(
          `${API_BASE_URL}/ConsultaVariacionModelo?Modelo=${modelCode}&t=${Date.now()}`
        );

        if (!variationsResponse.ok) throw new Error("Error al obtener las variaciones");
        const variationsData = await variationsResponse.json();
        setVariations(variationsData || []);
        
        // PRIMERO: Verificar si se puede vender por paquete (pzasPaq > 0)
        const hasPackageVariation = variationsData.some(variation => parseInt(variation.pzasPaq) > 0);
        
        if (hasPackageVariation) {
          // SEGUNDO: Si pzasPaq > 0, entonces verificar si hay tallas con minimo > 0
          const canPackage = checkIfCanSellByPackage(variationsData);
          setCanSellByPackage(canPackage);
          
          if (canPackage) {
            const piecesPerPackage = getPiecesPerPackage(variationsData);
            const hasPackageStock = checkPackageStock(piecesPerPackage, variationsData, 'Exis');
            const hasPackagePreorderStock = checkPackageStock(piecesPerPackage, variationsData, 'PorRecibir');
            
            setPackageDetails({
              piecesPerPackage,
              hasPackageStock,
              hasPackagePreorderStock
            });
          }
        } else {
          setCanSellByPackage(false);
        }
        
        if (variationsData.length > 0) {
          setSelectedColor(variationsData[0].Codigo);
          if (variationsData[0].Tallas?.length > 0) {
            setSelectedSize(variationsData[0].Tallas[0].id);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [modelCode]);

  // Función para verificar si se puede vender por paquete (basado en minimo)
  const checkIfCanSellByPackage = (variationsData) => {
    // Verificar si al menos una talla tiene minimo > 0
    return variationsData.some(variation => 
      variation.Tallas?.some(size => parseInt(size.minimo) > 0)
    );
  };

  // Función para obtener la cantidad de piezas por paquete
  const getPiecesPerPackage = (variationsData) => {
    let maxMinimo = 0;
    
    variationsData.forEach(variation => {
      variation.Tallas?.forEach(size => {
        const minimo = parseInt(size.minimo) || 0;
        if (minimo > maxMinimo) {
          maxMinimo = minimo;
        }
      });
    });
    
    return maxMinimo;
  };

  // Función para verificar stock para paquete (inventario o preventa)
  const checkPackageStock = (piecesPerPackage, variationsData, stockType = 'Exis') => {
    return variationsData.every(variation => {
      return variation.Tallas?.every(size => {
        const minimo = parseInt(size.minimo) || 0;
        const availableStock = parseInt(size[stockType]) || 0;
        
        // Si minimo es 0, no es requerido para el paquete
        if (minimo === 0) return true;
        
        // Si minimo > 0, verificar que haya stock suficiente
        return availableStock >= minimo;
      });
    });
  };

  // Actualizar el precio personalizado cuando cambia la variación seleccionada - solo para 99PAQ
  useEffect(() => {
    if (variations.length > 0 && selectedColor && selectedSize && is99PAQProduct) {
      const price = getIndividualPrice();
      setCustomPrice(price.toString());
    }
  }, [selectedColor, selectedSize, variations, is99PAQProduct]);

  // Actualizar estado del paquete cuando cambian las variaciones
  useEffect(() => {
    if (variations.length > 0 && canSellByPackage) {
      const piecesPerPackage = getPiecesPerPackage(variations);
      const hasPackageStock = checkPackageStock(piecesPerPackage, variations, 'Exis');
      const hasPackagePreorderStock = checkPackageStock(piecesPerPackage, variations, 'PorRecibir');
      
      setPackageDetails({
        piecesPerPackage,
        hasPackageStock,
        hasPackagePreorderStock
      });
    }
  }, [variations, canSellByPackage]);

  const handleSizeChange = (sizeId) => {
    setSelectedSize(sizeId);
    setQuantity(1);
    setPreorderQuantity(1);
  };

  const handleColorChange = (colorCode) => {
    setSelectedColor(colorCode);
    const selectedVariation = variations.find(v => v.Codigo === colorCode);
    if (selectedVariation?.Tallas?.length > 0) {
      setSelectedSize(selectedVariation.Tallas[0].id);
    } else {
      setSelectedSize('');
    }
    setQuantity(1);
    setPreorderQuantity(1);
  };

  // Manejar cambio del precio personalizado - solo para 99PAQ
  const handleCustomPriceChange = (e) => {
    const value = e.target.value;
    // Permitir solo números y punto decimal
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomPrice(value);
    }
  };

  // Activar/desactivar edición del precio - solo para 99PAQ
  const togglePriceEdit = () => {
    if (is99PAQProduct) {
      setIsEditingPrice(!isEditingPrice);
    }
  };

  // Obtener el precio final a usar (personalizado o normal)
  const getFinalPrice = () => {
    if (is99PAQProduct && customPrice) {
      return parseFloat(customPrice);
    }
    return getIndividualPrice();
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    const max = getAvailableStock();
    setQuantity(Math.max(1, Math.min(value, max)));
  };

  const incrementQuantity = () => {
    setQuantity(prev => Math.min(prev + 1, getAvailableStock()));
  };

  const decrementQuantity = () => {
    setQuantity(prev => Math.max(1, prev - 1));
  };

  const handlePreorderQuantityChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    const max = getPreorderStock();
    setPreorderQuantity(Math.max(1, Math.min(value, max)));
  };

  const incrementPreorderQuantity = () => {
    setPreorderQuantity(prev => Math.min(prev + 1, getPreorderStock()));
  };

  const decrementPreorderQuantity = () => {
    setPreorderQuantity(prev => Math.max(1, prev - 1));
  };

  const getAvailableStock = () => {
    const selectedVariation = variations.find(v => v.Codigo === selectedColor);
    const selectedSizeData = selectedVariation?.Tallas?.find(s => s.id === selectedSize);
    return selectedSizeData ? parseInt(selectedSizeData.Exis) : 0;
  };

  const getPreorderStock = () => {
    const selectedVariation = variations.find(v => v.Codigo === selectedColor);
    const selectedSizeData = selectedVariation?.Tallas?.find(s => s.id === selectedSize);
    return selectedSizeData ? parseInt(selectedSizeData.PorRecibir) : 0;
  };

  // Obtener precio individual (precio2)
  const getIndividualPrice = () => {
    const selectedVariation = variations.find(v => v.Codigo === selectedColor);
    const selectedSizeData = selectedVariation?.Tallas?.find(s => s.id === selectedSize);
    return selectedSizeData ? parseFloat(selectedSizeData.precio2) : 0;
  };

  // Obtener precio por paquete (precio3)
  const getPackagePrice = () => {
    const selectedVariation = variations.find(v => v.Codigo === selectedColor);
    const selectedSizeData = selectedVariation?.Tallas?.find(s => s.id === selectedSize);
    return selectedSizeData ? parseFloat(selectedSizeData.precio3) : 0;
  };

  // Función auxiliar para manejar el proceso de agregar al carrito
  const handleApiProcess = async (apiCall, errorMessage) => {
    setAddingToCart(true);
    
    try {
      await apiCall();
    } catch (error) {
      console.error("Error en el proceso:", error);
      
      // Si el error es de stock, recargar la página
      if (error.message.includes("Ya no hay existencia")) {
        alert("Ya no hay existencia, revisa inventario. La página se recargará para actualizar el stock.");
        reloadPage();
        return;
      }
      
      alert(error.message || errorMessage);
      throw error;
    } finally {
      setAddingToCart(false);
      setProcessingMessage('');
    }
  };

  const handleAddToCart = async () => {
    if (!selectedColor || !selectedSize) return;
    
    await handleApiProcess(
      async () => {
        setProcessingMessage('Agregando producto al carrito...');
        
        const selectedVariation = variations.find(v => v.Codigo === selectedColor);
        const selectedSizeData = selectedVariation?.Tallas?.find(s => s.id === selectedSize);
        
        if (!selectedSizeData || !selectedSizeData.Articulo) {
          throw new Error("No se pudo determinar el código de artículo");
        }

        const finalPrice = getFinalPrice();
        const availableStock = getAvailableStock();
        const desdeInventario = availableStock > 0;

        const response = await fetch(`${API_BASE_URL}/agregaArtPed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            Usuario: user.username,
            articulo: selectedSizeData.Articulo,
            cantidad: quantity,
            precio: finalPrice,
            venta: pedidoId || 'NUEVO',
            desdeInventario: desdeInventario
          })
        });

        const result = await response.json();
        
        // VERIFICAR EL MENSAJE DE RESPUESTA - incluso con status 200
        if (hasStockError(result)) {
          throw new Error(result.Mensaje);
        }

        if (!response.ok) {
          throw new Error(result.Mensaje || "Error al agregar el artículo al pedido");
        }

        // Si llegamos aquí, el mensaje fue exitoso
        if (result.Mensaje === "Artículo agregado correctamente") {
          // Actualizar stock localmente
          const updatedVariations = variations.map(variation => {
            if (variation.Codigo === selectedColor) {
              return {
                ...variation,
                Tallas: variation.Tallas.map(size => {
                  if (size.id === selectedSize) {
                    return {
                      ...size,
                      Exis: (parseInt(size.Exis) - quantity).toString()
                    };
                  }
                  return size;
                })
              };
            }
            return variation;
          });
          setVariations(updatedVariations);

          // Actualizar contador del carrito
          updateCartCount(true);
          
          setSuccessMessage('Pedido agregado correctamente');
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          throw new Error(result.Mensaje || "Respuesta inesperada del servidor");
        }
      },
      'Ocurrió un error al agregar el artículo. Por favor intenta nuevamente.'
    );
  };

  const handlePreorder = async () => {
    if (!selectedColor || !selectedSize) return;
    
    await handleApiProcess(
      async () => {
        setProcessingMessage('Agregando preventa al carrito...');
        
        const selectedVariation = variations.find(v => v.Codigo === selectedColor);
        const selectedSizeData = selectedVariation?.Tallas?.find(s => s.id === selectedSize);
        
        if (!selectedSizeData || !selectedSizeData.Articulo) {
          throw new Error("No se pudo determinar el código de artículo");
        }

        const finalPrice = getFinalPrice();
        const ventaId = pedidoId || 'NUEVO';
        const desdeInventario = false;
        
        const response = await fetch(`${API_BASE_URL}/agregaArtPed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            Usuario: user.username,
            articulo: selectedSizeData.Articulo,
            cantidad: preorderQuantity,
            precio: finalPrice,
            venta: ventaId,
            desdeInventario: desdeInventario
          })
        });

        const result = await response.json();
        
        // VERIFICAR EL MENSAJE DE RESPUESTA - incluso con status 200
        if (hasStockError(result)) {
          throw new Error(result.Mensaje);
        }

        if (!response.ok) {
          throw new Error(result.Mensaje || "Error al agregar la preventa al pedido");
        }

        // Si llegamos aquí, el mensaje fue exitoso
        if (result.Mensaje === "Artículo agregado correctamente") {
          // Actualizar contador del carrito
          updateCartCount(true);
          
          if (pedidoId) {
            navigate(`/carrito?pedido=${pedidoId}`);
          } else {
            navigate(`/carrito?pedido=${result.Folio}`);
          }
        } else {
          throw new Error(result.Mensaje || "Respuesta inesperada del servidor");
        }
      },
      'Ocurrió un error al agregar la preventa. Por favor intenta nuevamente.'
    );
  };

  const handlePreorderPackage = async () => {
    if (!packageDetails.hasPackagePreorderStock) return;
    
    await handleApiProcess(
      async () => {
        setProcessingMessage('Procesando paquete en preventa... Esto puede tomar unos segundos.');
        
        const ventaId = pedidoId || 'NUEVO';
        let lastResult = null;
        let successCount = 0;
        let hasError = false;
        let errorMessage = '';
        
        for (const variation of variations) {
          for (const size of variation.Tallas) {
            const minimo = parseInt(size.minimo) || 0;
            if (minimo === 0) continue;
            
            const packagePrice = parseFloat(size.precio3) || getIndividualPrice();
            const desdeInventario = false;

            const response = await fetch(`${API_BASE_URL}/agregaArtPed`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                Usuario: user.username,
                articulo: size.Articulo,
                cantidad: minimo,
                precio: packagePrice,
                venta: ventaId,
                desdeInventario: desdeInventario
              })
            });

            const result = await response.json();

            // VERIFICAR EL MENSAJE DE RESPUESTA - incluso con status 200
            if (hasStockError(result)) {
              hasError = true;
              errorMessage = result.Mensaje;
              break;
            }

            if (!response.ok) {
              hasError = true;
              errorMessage = result.Mensaje || `Error al agregar el artículo ${size.Articulo} a la preventa`;
              break;
            }

            if (result.Mensaje !== "Artículo agregado correctamente") {
              hasError = true;
              errorMessage = result.Mensaje || "Respuesta inesperada del servidor";
              break;
            }
            
            lastResult = result;
            successCount++;
          }
          if (hasError) break;
        }

        if (hasError) {
          throw new Error(errorMessage);
        }

        updateCartCount(true);
        
        if (pedidoId) {
          navigate(`/carrito?pedido=${pedidoId}`);
        } else {
          navigate(`/carrito?pedido=${lastResult.Folio}`);
        }
      },
      'Ocurrió un error al agregar el paquete en preventa. Por favor intenta nuevamente.'
    );
  };

  const handleAddPackage = async () => {
    if (!packageDetails.hasPackageStock) return;
    
    await handleApiProcess(
      async () => {
        setProcessingMessage('Procesando paquete completo... Esto puede tomar unos segundos.');
        
        const ventaId = pedidoId || 'NUEVO';
        let lastResult = null;
        let successCount = 0;
        let hasError = false;
        let errorMessage = '';
        
        // Agregar la cantidad especificada por minimo de cada color/talla
        for (const variation of variations) {
          for (const size of variation.Tallas) {
            const minimo = parseInt(size.minimo) || 0;
            // Si minimo es 0, no agregar esta talla al paquete
            if (minimo === 0) continue;
            
            // Usar precio3 (precio por paquete) en lugar del precio individual
            const packagePrice = parseFloat(size.precio3) || getIndividualPrice();
            const desdeInventario = parseInt(size.Exis) > 0;

            const response = await fetch(`${API_BASE_URL}/agregaArtPed`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                Usuario: user.username,
                articulo: size.Articulo,
                cantidad: minimo,
                precio: packagePrice,
                venta: ventaId,
                desdeInventario: desdeInventario
              })
            });

            const result = await response.json();

            // VERIFICAR EL MENSAJE DE RESPUESTA - incluso con status 200
            if (hasStockError(result)) {
              hasError = true;
              errorMessage = result.Mensaje;
              break;
            }

            if (!response.ok) {
              hasError = true;
              errorMessage = result.Mensaje || `Error al agregar el artículo ${size.Articulo} al pedido`;
              break;
            }

            // Verificar que el mensaje sea exitoso
            if (result.Mensaje !== "Artículo agregado correctamente") {
              hasError = true;
              errorMessage = result.Mensaje || "Respuesta inesperada del servidor";
              break;
            }
            
            lastResult = result;
            successCount++;
          }
          if (hasError) break;
        }

        if (hasError) {
          throw new Error(errorMessage);
        }

        // Actualizar contador del carrito
        updateCartCount(true);
        
        if (pedidoId) {
          navigate(`/carrito?pedido=${pedidoId}`);
        } else {
          navigate(`/carrito?pedido=${lastResult.Folio}`);
        }
      },
      'Ocurrió un error al agregar el paquete. Por favor intenta nuevamente.'
    );
  };

  if (loading) return <div className="mt-5 mx-2 sm:mx-0 text-center py-8"><p>Cargando producto...</p></div>;
  if (error) return <div className="mt-5 mx-2 sm:mx-0 text-center py-8 text-red-500"><p>Error: {error}</p></div>;
  if (!product) return <div className="mt-5 mx-2 sm:mx-0 text-center py-8"><p>Producto no encontrado</p></div>;

  const selectedVariation = variations.find(v => v.Codigo === selectedColor) || {};
  const sizes = selectedVariation.Tallas || [];
  const selectedSizeData = sizes.find(s => s.id === selectedSize) || {};
  const availableStock = getAvailableStock();
  const preorderStock = getPreorderStock();
  const individualPrice = getIndividualPrice();
  const packagePrice = getPackagePrice();
  const finalPrice = getFinalPrice();

  return (
    <>
      {/* Overlay de carga */}
      <LoadingOverlay 
        isLoading={addingToCart} 
        message={processingMessage} 
      />
      
      <div className="max-w-4xl mx-auto p-6">
        <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
          <ProductImage 
            imageUrl={selectedVariation.Imagen} 
            altText={product.Descrip} 
          />
          
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{product.Descrip}</h2>
            
            {/* Precio editable solo para productos 99PAQ */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio {is99PAQProduct && isEditingPrice ? '(Editable)' : ''}
              </label>
              <div className="flex items-center gap-2">
                {is99PAQProduct && isEditingPrice ? (
                  <input
                    type="text"
                    value={customPrice}
                    onChange={handleCustomPriceChange}
                    onBlur={togglePriceEdit}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <span 
                    className={`text-3xl font-bold text-gray-900 ${
                      is99PAQProduct ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''
                    }`}
                    onClick={is99PAQProduct ? togglePriceEdit : undefined}
                    title={is99PAQProduct ? "Haz clic para editar el precio" : ""}
                  >
                    ${finalPrice.toFixed(2)}
                  </span>
                )}
                {is99PAQProduct && (
                  <button
                    type="button"
                    onClick={togglePriceEdit}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {isEditingPrice ? 'Cancelar' : 'Editar'}
                  </button>
                )}
              </div>
              {is99PAQProduct && !isEditingPrice && individualPrice !== finalPrice && (
                <p className="text-sm text-gray-500 mt-1">
                  Precio original: ${individualPrice.toFixed(2)}
                </p>
              )}
              {packagePrice > 0 && canSellByPackage && (
                <p className="text-lg text-green-600 font-semibold">
                  Precio por paquete: ${packagePrice.toFixed(2)}
                </p>
              )}
            </div>
            
            <p className="text-gray-600 mb-4">{product.Descrip}</p>
            
            {selectedSizeData && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Artículo:</span> {selectedSizeData.Articulo}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Stock disponible:</span> {availableStock}
                </p>
                {preorderStock > 0 && (
                  <p className="text-sm text-orange-600">
                    <span className="font-semibold">Por recibir:</span> {preorderStock}
                  </p>
                )}
                {canSellByPackage && selectedSizeData.minimo && selectedSizeData.minimo !== "0" && (
                  <p className="text-sm text-purple-600">
                    <span className="font-semibold">Mínimo por paquete:</span> {selectedSizeData.minimo}
                  </p>
                )}
              </div>
            )}

            {/* Información del paquete */}
            {canSellByPackage && (
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Venta por paquete disponible:</strong> {packageDetails.piecesPerPackage} piezas por color/talla (según mínimo)
                </p>
                <p className="text-sm text-blue-600">
                  {packageDetails.hasPackageStock 
                    ? `✓ Stock suficiente para paquete (${packageDetails.piecesPerPackage} piezas de cada color/talla requerido)`
                    : `✗ Stock insuficiente para paquete (se necesitan ${packageDetails.piecesPerPackage} piezas de cada color/talla requerido)`
                  }
                </p>
                <p className="text-sm text-orange-600">
                  {packageDetails.hasPackagePreorderStock 
                    ? `✓ Stock suficiente para preventa por paquete (${packageDetails.piecesPerPackage} piezas de cada color/talla requerido)`
                    : `✗ Stock insuficiente para preventa por paquete`
                  }
                </p>
              </div>
            )}
          </div>

          {variations.length > 0 && (
            <div className="mb-4 px-8">
              <h4 className="text-lg font-semibold mb-3">Colores disponibles:</h4>
              <div className="flex flex-wrap gap-5 md:gap-3">
                {variations.map(variation => (
                  <ColorButton
                    key={variation.Codigo}
                    color={variation}
                    isSelected={selectedColor === variation.Codigo}
                    onSelect={handleColorChange}
                  />
                ))}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div className="mb-4 px-8">
              <h4 className="text-lg font-semibold mb-3">Tallas disponibles:</h4>
              <div className="flex flex-wrap gap-3">
                {sizes.map(size => (
                  <SizeButton
                    key={size.id}
                    size={size}
                    isSelected={selectedSize === size.id}
                    onSelect={handleSizeChange}
                  />
                ))}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="px-8">
              <div className="bg-green-600 uppercase font-semibold text-white text-center py-2 rounded-md mb-4">
                {successMessage}
              </div>
            </div>
          )}
          
          <div className="px-8 pb-8">
            <ProductActions
              availableStock={availableStock}
              preorderStock={preorderStock}
              quantity={quantity}
              preorderQuantity={preorderQuantity}
              onQuantityChange={handleQuantityChange}
              onPreorderQuantityChange={handlePreorderQuantityChange}
              onIncrementQuantity={incrementQuantity}
              onDecrementQuantity={decrementQuantity}
              onIncrementPreorderQuantity={incrementPreorderQuantity}
              onDecrementPreorderQuantity={decrementPreorderQuantity}
              onAddToCart={handleAddToCart}
              onPreorder={handlePreorder}
              onAddPackage={handleAddPackage}
              onPreorderPackage={handlePreorderPackage} 
              allSizesHaveStock={packageDetails.hasPackageStock}
              allSizesHavePreorderStock={packageDetails.hasPackagePreorderStock} 
              addingToCart={addingToCart}
              individualPrice={finalPrice}
              packagePrice={packagePrice}
              canSellByPackage={canSellByPackage}
              packageDetails={packageDetails}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductPreview;