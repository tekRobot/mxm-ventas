import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);
  const { user } = useAuth();
  const location = useLocation();

  const fetchCartCount = async (userId) => {
    try {
      if (!userId) {
        setCartCount(0);
        return;
      }

      // Verificar si estamos viendo un pedido específico
      const queryParams = new URLSearchParams(location.search);
      const pedidoId = queryParams.get('pedido');
      
      if (pedidoId) {
        // Si estamos en un pedido específico, obtener sus datos
        const response = await fetch(`${API_BASE_URL}/Pedido/${pedidoId}?t=${Date.now()}`);
        
        if (response.ok) {
          const data = await response.json();
          setCartCount(parseInt(data.TotPzas) || 0);
          return;
        }
      }

    } catch (error) {
      console.error("Error fetching cart count:", error);
      setCartCount(0);
    }
  };

  useEffect(() => {
    if (user?.username) {
      fetchCartCount(user.username);
    } else {
      setCartCount(0);
    }
  }, [user, location.search]); // Ahora se actualiza cuando cambia la URL

  const updateCartCount = (increment = true) => {
    setCartCount(prev => increment ? prev + 1 : Math.max(0, prev - 1));
  };

  return (
    <CartContext.Provider value={{ cartCount, updateCartCount, fetchCartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);