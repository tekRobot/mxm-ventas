import { useState } from "react";
import { FiCheck, FiRotateCcw, FiArrowUp, FiArrowDown } from "react-icons/fi";
import ImageModal from "./ImageModal";
import { IMAGE_BASE_URL } from "../../config/api";

const PartesTable = ({ 
  partes, 
  sortField, 
  sortDirection, 
  onSort, 
  onCambiarEstado, 
  pedidoEstado,
  getSortIcon 
}) => {
  const [currentImage, setCurrentImage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  const getImageUrl = (imageName) => {
    if (!imageName || imageName === 'imgMXM\\Catalogo\\') return null;
    
    if (imageName.startsWith('http')) return imageName;
    
    let processedImageName = imageName.replace(/\\/g, '/');
    
    const baseUrl = `${IMAGE_BASE_URL}/`;
    const encodedPath = processedImageName.split('/').map(part => 
      encodeURIComponent(part)
    ).join('/');
    
    return baseUrl + encodedPath;
  };

  const handleImageError = (partId) => {
    setImageErrors(prev => ({ ...prev, [partId]: true }));
  };

  const openImageModal = (imageUrl) => {
    if (imageUrl) {
      setCurrentImage(imageUrl);
      setModalOpen(true);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentImage('');
  };

  const puedeCambiarEstado = pedidoEstado === "EA";

  return (
    <>
      <ImageModal 
        isOpen={modalOpen} 
        imageUrl={currentImage} 
        onClose={closeModal} 
      />

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Imagen
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 cursor-pointer"
                onClick={() => onSort('Descrip')}
              >
                Descripción {getSortIcon('Descrip')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cantidad
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 cursor-pointer"
                onClick={() => onSort('Ubicacion')}
              >
                Ubicación {getSortIcon('Ubicacion')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 cursor-pointer"
                onClick={() => onSort('PartId')}
              >
                Artículo {getSortIcon('PartId')}
              </th>                  
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {partes.map((part) => {
              const imageUrl = getImageUrl(part.Imagen);
              const hasImageError = imageErrors[part.PartId];
              
              return (
                <tr key={part.PartId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-col items-start gap-1">
                      {imageUrl && !hasImageError ? (
                        <img
                          src={imageUrl}
                          alt={part.Descrip}
                          className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-75 transition-opacity"
                          onClick={() => openImageModal(imageUrl)}
                          onError={() => handleImageError(part.PartId)}
                        />
                      ) : (
                        'No Disponible'
                      )}
                      <div className="text-xs text-gray-500 leading-tight">
                        <div>Clave Prod: {part.Articulo}</div>
                        {part.ClaveProv?.trim() && (
                          <div>Clave Prov: {part.ClaveProv.trim()}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    {part.Descrip}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {part.Cant}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {part.Ubicacion}
                  </td>                    
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onCambiarEstado(part.PartId)}
                        disabled={!puedeCambiarEstado}
                        className={`px-3 py-2 rounded-md flex items-center space-x-2 transition-colors ${
                          puedeCambiarEstado ? "hover:cursor-pointer" : "cursor-not-allowed opacity-50"
                        } ${
                          part.Status.trim() === "1" 
                            ? "bg-green-100 text-green-800 hover:bg-green-200" 
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        }`}
                      >
                        {part.Status.trim() === "1" ? (
                          <FiCheck className="flex-shrink-0" />
                        ) : (
                          <FiRotateCcw className="flex-shrink-0" />
                        )}
                        <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${
                          part.Status.trim() === "1" 
                            ? "bg-green-200 text-green-800" 
                            : "bg-yellow-200 text-yellow-800"
                        }`}>
                          {part.Status.trim() === "1" ? "Surtido" : "Pendiente"}
                        </span>
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {part.Articulo}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default PartesTable;