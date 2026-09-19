import { useState, useEffect } from 'react';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/api';

const OutOfStockPreview = () => {
  const [stockAlerts, setStockAlerts] = useState([]);
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedModels, setLoadedModels] = useState(0);
  const [totalModels, setTotalModels] = useState(0);

  // Obtener datos de productos agotados
  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setLoading(true);
        
        // 1. Obtener lista de productos agotados
        const response = await fetch(`${API_BASE_URL}/ListAgotados?t=${Date.now()}`);
        
        if (!response.ok) throw new Error('Error al obtener productos agotados');
        
        const data = await response.json();
        const agotados = data.sdtAgotados || [];
        
        setTotalModels(agotados.length);
        
        // 2. Procesar productos agotados en lotes
        const batchSize = 5;
        const alerts = [];
        const processedModels = new Set(); // Para evitar duplicados
        
        for (let i = 0; i < agotados.length; i += batchSize) {
          const batch = agotados.slice(i, i + batchSize);
          
          // Procesar el lote actual en paralelo
          const batchResults = await Promise.all(
            batch.map(async (producto) => {
              try {
                // Extraer el modelo
                const modelo = producto.Modelo || producto.articulo.substring(2, 6);
                
                // Si ya procesamos este modelo, saltar
                if (processedModels.has(modelo)) {
                  setLoadedModels(prev => prev + 1);
                  return null;
                }
                processedModels.add(modelo);
                
                const variacionesResponse = await fetch(
                  `${API_BASE_URL}/ConsultaVariacionModelo?Modelo=${modelo}&t=${Date.now()}`,
                  {
                    priority: 'low'
                  }
                );
                
                if (!variacionesResponse.ok) return null;
                
                const variacionesData = await variacionesResponse.json();
                if (!Array.isArray(variacionesData)) return null;

                // Recolectar todos los colores con stock bajo para este producto
                const colorsWithLowStock = [];
                let mainImageUrl = null;

                variacionesData.forEach(variacion => {
                  if (!Array.isArray(variacion.Tallas)) return;
                  
                  // Verificar si alguna talla tiene stock bajo en este color
                  const hasLowStock = variacion.Tallas.some(talla => {
                    const stock = parseInt(talla.Exis) || 0;
                    return stock <= 9;
                  });

                  if (hasLowStock) {
                    // Obtener todas las tallas con stock bajo para este color
                    const sizesWithLowStock = variacion.Tallas
                      .filter(talla => {
                        const stock = parseInt(talla.Exis) || 0;
                        return stock <= 9;
                      })
                      .map(talla => ({
                        code: talla.id || 'Sin talla',
                        stock: parseInt(talla.Exis) || 0,
                        status: parseInt(talla.Exis) <= 0 ? 'AGOTADO' : 'ÚLTIMAS UNIDADES',
                        articulo: talla.Articulo || 'Sin artículo'
                      }));

                    colorsWithLowStock.push({
                      color: variacion.cvariacion || 'Sin color',
                      sku: variacion.Codigo || 'Sin SKU',
                      sizes: sizesWithLowStock,
                      imageUrl: variacion.Imagen
                        ? `${IMAGE_BASE_URL}/${variacion.Imagen}`
                        : null
                    });

                    // Usar la primera imagen disponible como imagen principal
                    if (!mainImageUrl && variacion.Imagen) {
                      mainImageUrl = `${IMAGE_BASE_URL}/${variacion.Imagen}`;
                    }
                  }
                });

                // Solo crear alerta si hay al menos un color con stock bajo
                if (colorsWithLowStock.length > 0) {
                  return {
                    productId: modelo,
                    productName: producto.descrip,
                    mainImageUrl: mainImageUrl,
                    colors: colorsWithLowStock,
                    lastOrder: `${producto.FechaVenta?.split('T')[0] || 'N/A'} ${producto.HoraVenta || 'N/A'}`
                  };
                }

                return null;
              } catch (err) {
                console.error(`Error procesando producto ${producto.articulo}:`, err);
                return null;
              } finally {
                setLoadedModels(prev => prev + 1);
              }
            })
          );
          
          // Filtrar resultados nulos y agregar a alerts
          const validResults = batchResults.filter(result => result !== null);
          alerts.push(...validResults);
          
          // Actualizar el estado con lo que llevamos
          setStockAlerts(current => [...current, ...validResults]);
        }
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchStockData();
  }, []);

  // Navegación con flechas
  const goToNextAlert = () => {
    setCurrentAlertIndex(prev => 
      prev === stockAlerts.length - 1 ? 0 : prev + 1
    );
  };

  const goToPrevAlert = () => {
    setCurrentAlertIndex(prev => 
      prev === 0 ? stockAlerts.length - 1 : prev - 1
    );
  };

  // Rotar alertas cada 15 segundos
  useEffect(() => {
    if (stockAlerts.length === 0) return;

    const interval = setInterval(() => {
      goToNextAlert();
    }, 15000);

    return () => clearInterval(interval);
  }, [stockAlerts]);

  // Manejar navegación con teclado
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowRight') {
        goToNextAlert();
      } else if (e.key === 'ArrowLeft') {
        goToPrevAlert();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [stockAlerts]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-blue-100">
        <div className="text-center">
          <p className="text-2xl mb-4">Cargando información de stock...</p>
          <progress 
            value={loadedModels} 
            max={totalModels}
            className="w-64 h-4"
          />
          <p className="mt-2">
            Progreso: {loadedModels} de {totalModels} productos procesados
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-blue-100">
        <p className="text-2xl text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (stockAlerts.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-blue-100">
        <p className="text-2xl">No hay productos agotados o con bajo stock</p>
      </div>
    );
  }

  const currentAlert = stockAlerts[currentAlertIndex];

  const fechaString = currentAlert.lastOrder || new Date().toISOString();
  const fecha = new Date(fechaString);
  
  const fechaFormateada = fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }); 
  const horaFormateada = fecha.toLocaleTimeString();

  return (
    <div className="bg-gray-900 text-white h-screen overflow-hidden flex py-auto relative">
      {/* Flecha izquierda */}
      <button
        onClick={goToPrevAlert}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800/70 hover:bg-gray-700/90 text-white p-4 rounded-full transition-all duration-200 hover:scale-110"
        aria-label="Producto anterior"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Flecha derecha */}
      <button
        onClick={goToNextAlert}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800/70 hover:bg-gray-700/90 text-white p-4 rounded-full transition-all duration-200 hover:scale-110"
        aria-label="Siguiente producto"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Imagen del producto (50% izquierdo) */}
      <div className="w-2/5 bg-gray-950 flex items-center justify-center relative">
        {currentAlert.mainImageUrl ? (
          <img 
            src={currentAlert.mainImageUrl} 
            alt={currentAlert.productName}
            className="object-contain h-full w-full"
            onError={(e) => {
              e.target.onerror = null; 
              e.target.src = 'https://placehold.co/600x400/orange/white?text=Imagen+No+Disponible';
            }}
          />
        ) : (
          <div className="text-center">
            <p className="text-3xl">Imagen no disponible</p>
          </div>
        )}
        
        {/* Indicador de progreso del timer */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="w-32 bg-gray-700 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-100 ease-linear"
              style={{ 
                width: '100%',
                animation: `countdown 10s linear infinite`
              }}
            />
          </div>
        </div>
      </div>

      {/* Información del producto (50% derecho) */}
      <div className="w-3/5 px-6 py-6 flex flex-col">      
        {/* Detalles del producto */}
        <div className="mb-4">
          <h1 className="text-[2.5rem]/12 text-center font-bold mb-4">{currentAlert.productName}</h1>
          <div className="space-y-3 grid grid-cols-2 px-8">
            <p className="text-2xl">
              <span className="font-semibold">Modelo:</span> {currentAlert.productId}
            </p>
            <p className="text-2xl">
              <span className="font-semibold">Colores con stock bajo:</span> {currentAlert.colors.length}
            </p>
          </div>
        </div>

        {/* Todos los colores con stock bajo - Diseño compacto */}
        <div className="mt-4 bg-gray-800 p-3 rounded-lg ">
          <h3 className="text-xl font-bold mb-3 text-center">COLORES CON STOCK BAJO</h3>
          
          {/* Grid compacto de colores - máximo 3 filas x 3 columnas */}
          <div className="grid grid-cols-3 gap-3 overflow-hidden ">
            {currentAlert.colors.slice(0, 9).map((colorAlert, colorIndex) => (
              <div key={colorIndex} className="bg-gray-700 p-3 rounded-lg border border-gray-600">
                {/* Header del color */}
                <div className="text-center mb-2">
                  <h4 className="font-bold text-amber-400 text-lg truncate">{colorAlert.color}</h4>
                  <p className="text-xs text-gray-300 truncate">SKU: {colorAlert.sku}</p>
                </div>
                
                {/* Tallas compactas */}
                <div className="space-y-1">
                  {colorAlert.sizes.map((size, sizeIndex) => (
                    <div 
                      key={sizeIndex} 
                      className={`flex justify-between items-center px-2 py-1 rounded text-sm ${
                        size.stock <= 0 
                          ? 'bg-red-600' 
                          : 'bg-yellow-600'
                      }`}
                    >
                      <span className="font-bold">{size.code}</span>
                      <span className="font-bold">
                        {size.stock}u
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Mensaje si hay más de 9 colores */}
          {currentAlert.colors.length > 9 && (
            <div className="text-center mt-3 text-amber-400 font-bold">
              +{currentAlert.colors.length - 9} colores más...
            </div>
          )}
        </div>

        {/* Último pedido y contador */}
        <div className="mt-4 flex justify-between items-center">
          <div className="bg-gray-800/90 p-3 rounded-lg flex items-center gap-3">
            <div className="text-amber-400 text-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-lg text-gray-400">Última venta</p>
              <p className="text-white font-medium text-xl">
                {fechaFormateada} <span className="text-gray-400 mx-1">|</span> {horaFormateada}
              </p>
            </div>
          </div>          
          
          <div className="flex items-center gap-4">
            {/* Indicadores de navegación (puntos) */}
            <div className="flex gap-2">
              {stockAlerts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentAlertIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentAlertIndex 
                      ? 'bg-white scale-125' 
                      : 'bg-gray-500 hover:bg-gray-300'
                  }`}
                  aria-label={`Ir al producto ${index + 1}`}
                />
              ))}
            </div>

            <div className="bg-gray-800 p-3 rounded-lg">
              <p className="text-lg font-medium">
                {currentAlertIndex + 1} / {stockAlerts.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos para la animación del timer */}
      <style jsx>{`
        @keyframes countdown {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default OutOfStockPreview;