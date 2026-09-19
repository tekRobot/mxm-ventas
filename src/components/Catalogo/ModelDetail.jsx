import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ImageModal from '../Armador/ImageModal.jsx';
import { API_BASE_URL, IMAGE_BASE_URL } from '../../config/api';

const ModelDetail = () => {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const [variations, setVariations] = useState([]);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchModelVariations = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_BASE_URL}/ConsultaVariacionModelo?Modelo=${modelId}`
        );
        
        if (!response.ok) {
          throw new Error('Error al obtener las variaciones del modelo');
        }
        
        const data = await response.json();
        setVariations(data);
        
        // Seleccionar la primera variación por defecto
        if (data.length > 0) {
          setSelectedVariation(data[0]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (modelId) {
      fetchModelVariations();
    }
  }, [modelId]);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona un archivo de imagen válido');
      return;
    }

    setUploadingImage(true);
    
    try {
      console.log('Imagen a subir:', file);
      console.log('Para la variación:', selectedVariation.Codigo);
      
      setTimeout(() => {
        alert('Imagen subida exitosamente (simulación)');
        setUploadingImage(false);
        event.target.value = '';
      }, 2000);
      
    } catch (err) {
      alert('Error al subir la imagen: ' + err.message);
      setUploadingImage(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return 'https://placehold.co/800x800/gray/white?text=Imagen+No+Disponible';
    
    const cleanPath = imagePath.replace(/\\/g, '/');
    return `${IMAGE_BASE_URL}/${cleanPath}`;
  };

  const getTotalStock = (tallas) => {
    if (!tallas || !Array.isArray(tallas)) return 0;
    return tallas.reduce((total, talla) => total + parseInt(talla.Exis || 0), 0);
  };

  const openImageModal = () => {
    setIsModalOpen(true);
  };

  const closeImageModal = () => {
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">Cargando modelo...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Error: {error}</div>
          <button 
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
          >
            Volver al catálogo
          </button>
        </div>
      </div>
    );
  }

  if (variations.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">No se encontraron variaciones para este modelo</div>
          <button 
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
          >
            Volver al catálogo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-8">
      {/* Efectos de fondo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-pink-500/10 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-300 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-700/50 px-4 py-2 rounded-lg backdrop-blur-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al catálogo
          </button>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">
            Modelo <span translate="no" className="notranslate">{modelId}</span>
          </h1>
        </div>

        {/* Selector de variaciones */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Variaciones de Color</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {variations.map((variation) => (
              <button
                key={variation.Codigo}
                onClick={() => setSelectedVariation(variation)}
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                  selectedVariation?.Codigo === variation.Codigo
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-2xl ring-2 ring-purple-400 ring-opacity-50'
                    : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600 hover:text-white backdrop-blur-sm'
                }`}
              >
                <div className="flex flex-col items-center">
                  <span translate="no" className="notranslate text-lg">{variation.cvariacion}</span>
                  <span className="text-sm opacity-75 mt-1">
                    {getTotalStock(variation.Tallas)} piezas
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detalles de la variación seleccionada */}
        {selectedVariation && (
          <div className="bg-gray-800/40 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
              {/* Sección de imagen mejorada */}
              <div className="space-y-6">
                <div 
                  className="relative rounded-2xl overflow-hidden bg-gray-700/30 border border-gray-600/30 cursor-pointer group"
                  onClick={openImageModal}
                >
                  <img
                    src={getImageUrl(selectedVariation.Imagen)}
                    alt={selectedVariation.cvariacion}
                    className="w-full h-[500px] object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.target.src = 'https://placehold.co/800x800/gray/white?text=Imagen+No+Disponible';
                    }}
                  />
                  {/* Overlay para indicar que es clickeable */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-full p-3 transform translate-y-4 group-hover:translate-y-0">
                      <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3-3H7" />
                      </svg>
                    </div>
                  </div>
                </div>               
                
              </div>

              {/* Información de la variación */}
              <div className="space-y-8">
                {/* Header de la variación */}
                <div className="text-center xl:text-left">
                  <h2 translate="no" className="notranslate text-4xl font-bold text-white mb-3">
                    {selectedVariation.cvariacion}
                  </h2>
                  <div className="inline-flex items-center bg-purple-600/20 text-purple-300 px-4 py-2 rounded-full border border-purple-500/30">
                    <span className="font-semibold">Código:</span>
                    <span translate="no" className="notranslate ml-2 font-mono">{selectedVariation.Codigo}</span>
                  </div>
                </div>

                {/* Upload de imagen */}
                <div className="bg-gray-700/30 rounded-xl p-6 border border-gray-600/30">
                  <h3 className="text-xl font-bold text-white mb-4 text-center">Subir nueva imagen</h3>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="w-full text-white file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-base file:font-semibold file:bg-gradient-to-r file:from-purple-600 file:to-pink-600 file:text-white hover:file:from-purple-700 hover:file:to-pink-700 transition-all duration-300"
                  />
                  {uploadingImage && (
                    <div className="mt-3 text-center">
                      <div className="inline-flex items-center text-purple-300">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mr-2"></div>
                        Subiendo imagen...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para imagen ampliada */}
      <ImageModal
        isOpen={isModalOpen}
        imageUrl={selectedVariation ? getImageUrl(selectedVariation.Imagen) : ''}
        onClose={closeImageModal}
      />
    </div>
  );
};

export default ModelDetail;