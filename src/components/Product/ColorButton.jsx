import { FiCheck } from 'react-icons/fi';
import { IMAGE_BASE_URL } from '../../config/api';

const ColorButton = ({ color, isSelected, onSelect }) => (
  <div>
    <button
      onClick={() => onSelect(color.Codigo)}
      className={`relative p-1 border-2 rounded-full transition-all hover:cursor-pointer ${
        isSelected ? 'border-black' : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <div className="w-20 h-20 rounded-full overflow-hidden">
        <img 
          src={`${IMAGE_BASE_URL}/${color.Imagen}`}
          alt={color.cvariacion}
          className="w-full h-full object-cover"
        />
      </div>
      {isSelected && (
        <FiCheck className="absolute -top-1 -right-1 bg-black text-white rounded-full p-0.5" />
      )}
    </button>
    <p className="text-xs text-center mt-1">{color.cvariacion}</p>
  </div>
);

export default ColorButton;