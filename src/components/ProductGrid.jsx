import { useState, useEffect, useMemo, useCallback } from "react";
import { FiSearch, FiChevronDown, FiChevronUp, FiEye } from "react-icons/fi";
import { useDebounce } from "use-debounce";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Asegúrate de importar useAuth
import { cdnImg } from "../utils/imageCdn";
import { API_BASE_URL, IMAGE_BASE_URL } from "../config/api";

const ProductGrid = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // Obtener el usuario actual
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [orderInfo, setOrderInfo] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const queryParams = new URLSearchParams(location.search);
  const pedidoId = queryParams.get('pedido');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Consultar información del pedido/cotización
  useEffect(() => {
    const fetchOrderInfo = async () => {
      if (!pedidoId || !user) return;
      
      try {
        setOrderLoading(true);
        // Usar el username del usuario actual para consultar sus pedidos
        const response = await fetch(`${API_BASE_URL}/ConsultaPedidos?Usuario=${user.username}&t=${Date.now()}`);
        
        if (!response.ok) {
          throw new Error("Error al obtener información del pedido");
        }
        
        const data = await response.json();
        
        // Buscar el pedido específico en la lista usando el pedidoId de la URL
        const currentOrder = data.ListPedidos?.find(pedido => pedido.VENTA === pedidoId);
        
        if (currentOrder) {
          setOrderInfo({
            id: currentOrder.VENTA,
            estado: currentOrder.ESTADO,
            nombreCliente: currentOrder.NombreCLIENTE,
            esCotizacion: currentOrder.ESTADO === 'CT'
          });
        } else {
          // Si no encuentra el pedido, asumimos que es un pedido normal
          setOrderInfo({
            id: pedidoId,
            estado: 'PE',
            esCotizacion: false
          });
        }
      } catch (err) {
        console.error("Error fetching order info:", err);
        // Si hay error, asumimos que es un pedido normal
        setOrderInfo({
          id: pedidoId,
          estado: 'PE',
          esCotizacion: false
        });
      } finally {
        setOrderLoading(false);
      }
    };

    fetchOrderInfo();
  }, [pedidoId, user]); // Agregar user como dependencia

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/ListModelos?t=${Date.now()}`);
        if (!response.ok) {
          throw new Error("Error al obtener los productos");
        }
        const data = await response.json();
        setProducts(data.ListModelos || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Función para ver el producto individualmente
  const viewProduct = (modelCode) => {
    if (pedidoId) {
      navigate(`/producto/${modelCode}?pedido=${pedidoId}`);
    } else {
      navigate(`/producto/${modelCode}`);
    }
  };

  // Memoizar la agrupación de productos CON FILTRO
  const productGroups = useMemo(() => {
    const groups = {};
    
    products.forEach(product => {
      // Filtrar productos donde Por_recib_total > 0 O Existencia_total > 0
      const porRecibir = parseFloat(product.Por_recib_total) || 0;
      const existencia = parseFloat(product.Existencia_total) || 0;
      
      if (porRecibir > 0 || existencia > 0) {
        const modelCode = product.modelo;
        const baseDescription = product.Descrip;
        
        if (!groups[modelCode]) {
          groups[modelCode] = {
            baseDescription,
            products: [],
            allVariants: []
          };
        }
        
        groups[modelCode].products.push(product);
        
        // Extraer color y talla si están en la descripción
        const colorMatch = product.Descrip.match(/(AZUL|ROJO|VERDE|NEGRO|BLANCO|AMARILLO|ROSA|FUCSIA|MARINO|MULTICOLOR)/i);
        const sizeMatch = product.Descrip.match(/T-?(\d+)/i);
        
        groups[modelCode].allVariants.push({
          color: colorMatch ? colorMatch[0] : 'No especificado',
          size: sizeMatch ? sizeMatch[1] : 'UT',
          existencia: existencia,
          porRecibir: porRecibir
        });
      }
    });
    
    return groups;
  }, [products]);

  // Memoizar los grupos filtrados
  const filteredGroups = useMemo(() => {
    return Object.entries(productGroups).filter(
      ([_, group]) =>
        group.baseDescription.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        group.products.some(p => 
          p.modelo.includes(debouncedSearchQuery) ||
          p.Descrip.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        )
    );
  }, [productGroups, debouncedSearchQuery]);

  // Lógica de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGroups = filteredGroups.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);

  const toggleGroup = useCallback((modelCode) => {
    setExpandedGroups(prev => ({
      ...prev,
      [modelCode]: !prev[modelCode]
    }));
  }, []);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Determinar el texto del header según el tipo de documento
  const getHeaderText = () => {
    if (!pedidoId) return null;
    
    if (orderLoading) {
      return "Cargando información...";
    }
    
    if (orderInfo?.esCotizacion) {
      return `Editando Cotización #${orderInfo.id}`;
    } else {
      return `Editando Pedido #${pedidoId}`;
    }
  };

  // Determinar la clase CSS según el tipo de documento
  const getHeaderClass = () => {
    if (orderInfo?.esCotizacion) {
      return "bg-blue-100 text-blue-800 border-blue-300";
    } else {
      return "bg-green-100 text-green-800 border-green-300";
    }
  };

  // Debug: mostrar información de orderInfo
  console.log('Order Info:', orderInfo);

  if (loading) {
    return (
      <div className="mt-5 mx-2 sm:mx-0 text-center py-8">
        <p>Cargando productos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-5 mx-2 sm:mx-0 text-center py-8 text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
     <div className="mt-5 mx-2 sm:mx-0">
      {/* Barra de información del pedido/cotización */}
      {pedidoId && (
        <div className={`mb-4 text-center text-lg font-medium p-3 border rounded-md ${getHeaderClass()}`}>
          {getHeaderText()}
          {orderInfo?.nombreCliente && (
            <div className="text-sm font-normal mt-1">
              Cliente: {orderInfo.nombreCliente}
            </div>
          )}          
        </div>
      )}
      
      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative max-w-4xl mx-auto py-2">
          <input
            type="text"
            placeholder="Buscar productos por descripción o código..."
            className="w-full py-2 pl-4 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg focus:border-transparent"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <FiSearch className="absolute right-4 top-4.5 text-gray-400 text-xl" />
        </div>
      </div>

      {/* Resultados */}
      {filteredGroups.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {currentGroups.map(([modelCode, group]) => {
              const firstProduct = group.products[0];
              const variantCount = group.products.length;
              const isExpanded = expandedGroups[modelCode];
              
              // Calcular existencia total y por recibir total del grupo
              const totalExistencia = group.products.reduce((sum, p) => sum + (parseFloat(p.Existencia_total) || 0), 0);
              const totalPorRecibir = group.products.reduce((sum, p) => sum + (parseFloat(p.Por_recib_total) || 0), 0);
              
              return (
                <div 
                  key={modelCode}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  {/* Contenedor de imagen */}
                  <div className="bg-gray-100 h-48 flex items-center justify-center relative">
                    {firstProduct.Foto ? (
                      <img
                        src={cdnImg(`${IMAGE_BASE_URL}/imgMXM/Catalogo/${firstProduct.Foto}`, 300)}
                        alt={group.baseDescription}
                        className="h-full w-full object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">Sin imagen</span>
                    )}
                    
                    {variantCount > 1 && (
                      <div className="absolute bottom-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        {variantCount} variantes
                      </div>
                    )}
                  </div>
                  
                  {/* Detalles del producto */}
                  <div className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">
                      {group.baseDescription}
                    </h3>
                    
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-blue-600 font-bold">${firstProduct.Precio1}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        totalExistencia > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {totalExistencia > 0 ? 'En stock' : 'Por recibir'}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-2">
                      <div>Código: {modelCode}</div>
                      <div>Existencia: {totalExistencia}</div>
                      <div>Por recibir: {totalPorRecibir}</div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                      <button 
                        onClick={() => viewProduct(modelCode)}
                        className="flex items-center text-xs text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded"
                      >
                        <FiEye className="mr-1" /> Ver producto
                      </button>
                      
                      {variantCount > 1 && (
                        <button 
                          onClick={() => toggleGroup(modelCode)}
                          className="flex items-center text-xs text-blue-500 hover:text-blue-700"
                        >
                          {isExpanded ? (
                            <>
                              <FiChevronUp className="mr-1" /> Ocultar
                            </>
                          ) : (
                            <>
                              <FiChevronDown className="mr-1" /> Variantes
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    
                    {isExpanded && variantCount > 1 && (
                      <div className="mt-2 text-xs">
                        <div className="font-medium mb-1">Variantes disponibles:</div>
                        <div className="grid grid-cols-1 gap-1">
                          {group.allVariants.map((variant, idx) => (
                            <div key={idx} className="flex justify-between items-center p-1 border-b">
                              <div className="flex items-center">
                                <span className="inline-block w-3 h-3 rounded-full mr-2" 
                                  style={{backgroundColor: getColorCode(variant.color)}} />
                                <span>{variant.color} - T{variant.size}</span>
                              </div>
                              <div className="text-right">
                                <div>Stock: {variant.existencia}</div>
                                <div>Por rec: {variant.porRecibir}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <nav className="inline-flex rounded-md shadow">
                <button
                  onClick={() => paginate(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-default"
                >
                  Anterior
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => paginate(pageNumber)}
                      className={`px-3 py-1 border-t border-b border-gray-300 bg-white text-sm font-medium hover:cursor-pointer ${
                        currentPage === pageNumber
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:cursor-pointer hover:bg-gray-50 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </nav>
            </div>
          )}

          <div className="text-center text-sm text-gray-500 mt-2">
            Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredGroups.length)} de {filteredGroups.length} productos
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          {debouncedSearchQuery ? "No se encontraron productos" : products.length === 0 ? "No hay productos disponibles" : "Ingrese un término de búsqueda"}
        </div>
      )}
    </div>
  );
};

// Función auxiliar para obtener código de color
const getColorCode = (colorName) => {
  const colors = {
    'BLANCO': '#FFFFFF',
    'AMARILLO': '#FFFF00',
    'ROSA': '#FFC0CB',
    'FUCSIA': '#FF00FF',
    'VERDE': '#00FF00',
    'MARINO': '#000080',
    'MULTICOLOR': 'linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet)',
    'AZUL': '#0000FF',
    'ROJO': '#FF0000',
    'NEGRO': '#000000'
  };
  
  return colors[colorName.toUpperCase()] || '#CCCCCC';
};

export default ProductGrid;