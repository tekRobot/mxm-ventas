import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext();
const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutos

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  
  const [lastActivity, setLastActivity] = useState(() => {
    const storedLastActivity = localStorage.getItem('lastActivity');
    return storedLastActivity ? parseInt(storedLastActivity) : Date.now();
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verifySession = () => {
      if (user) {
        const timeSinceLastActivity = Date.now() - lastActivity;
        
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
          logout();
        } else {
          updateLastActivity();
        }
      }
      setIsLoading(false);
    };

    verifySession();
  }, []);

  useEffect(() => {
    if (!user) return;

    const inactivityTimer = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);

    return () => clearTimeout(inactivityTimer);
  }, [user, lastActivity]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleUserActivity = () => updateLastActivity();

    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [user]);

  const updateLastActivity = () => {
    const now = Date.now();
    setLastActivity(now);
    localStorage.setItem('lastActivity', now.toString());
  };

  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/Login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Usuario: username,
          Password: password
        })
      });
  
      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }
  
      const data = await response.json();
  
      if (data.Acceso) {
        const userData = {
          username: username,
          name: data.nombre || username, // Usar el nombre que viene de la API
          role: data.UsuRol
        };
        
        setUser(userData);
        const now = Date.now();
        setLastActivity(now);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('lastActivity', now.toString());
        
        // Redirigir según el rol
        if (data.UsuRol === 'ARM') {
          navigate('/armador');
        } else {
          navigate('/');
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    navigate('/login');
  };

  if (isLoading) {
    return null; 
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};