import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";

export const usePedidoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Obtener el usuario logueado
  
  const [pedido, setPedido] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [startingArmado, setStartingArmado] = useState(false);
  
  // Estados para ordenamiento
  const [sortField, setSortField] = useState('PartId');
  const [sortDirection, setSortDirection] = useState('asc');

  // Clave para el localStorage
  const storageKey = `pedido_${id}_surtido`;

  // Cargar datos guardados del localStorage al iniciar
  const cargarDatosGuardados = () => {
    try {
      const datosGuardados = localStorage.getItem(storageKey);
      if (datosGuardados) {
        return JSON.parse(datosGuardados);
      }
    } catch (error) {
      console.error("Error al cargar datos del localStorage:", error);
    }
    return null;
  };

  // Guardar datos en el localStorage
  const guardarEnLocalStorage = (partesActualizadas) => {
    try {
      const datosAGuardar = {
        pedidoId: id,
        fechaGuardado: new Date().toISOString(),
        partes: partesActualizadas
      };
      localStorage.setItem(storageKey, JSON.stringify(datosAGuardar));
    } catch (error) {
      console.error("Error al guardar en localStorage:", error);
    }
  };

  // Limpiar datos del localStorage
  const limpiarLocalStorage = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("Error al limpiar localStorage:", error);
    }
  };

  // Función para iniciar el armado
  const iniciarArmado = async () => {
    try {
      setStartingArmado(true);
      
      // Obtener el nombre del usuario logueado desde el contexto
      const usuarioNombre = user?.name || user?.username || "Usuario";
      
      const requestData = {
        venta: parseInt(id),
        usuarioNombre: usuarioNombre
      };

      const response = await fetch(`${API_BASE_URL}/IniArmadoPedido`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) throw new Error('Error al iniciar el armado');

      const result = await response.json();
      
      if (!result.error) {
        // Actualizar el estado del pedido a EA
        setPedido(prev => prev ? { ...prev, ESTADO: "EA" } : null);
        setDetalle(prev => prev ? { ...prev, ESTADO: "EA", UsuarioNombre: usuarioNombre } : null);
        alert(result.Mensaje || "Armado iniciado correctamente");
      } else {
        throw new Error(result.Mensaje || 'Error al iniciar el armado');
      }
    } catch (err) {
      console.error("Error al iniciar armado:", err);
      alert(err.message || "Error al iniciar el armado");
    } finally {
      setStartingArmado(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Obtener lista de pedidos
        const pedidosResponse = await fetch(`${API_BASE_URL}/ConsultaPedidosConfirmados?t=${Date.now()}`);
        if (!pedidosResponse.ok) throw new Error('Error al obtener los pedidos');
        
        const pedidosData = await pedidosResponse.json();
        const pedidoEncontrado = pedidosData.ListPedidos?.find(p => p.VENTA === id);
        if (!pedidoEncontrado) throw new Error('Pedido no encontrado');
        
        setPedido(pedidoEncontrado);
        
        // Obtener detalle del pedido con ubicación, imagen y stock
        const detalleResponse = await fetch(`${API_BASE_URL}/PedidoConfirmado/${id}?t=${Date.now()}`);
        if (!detalleResponse.ok) throw new Error('Error al obtener el detalle del pedido');
        
        const detalleData = await detalleResponse.json();
        
        // Cargar datos guardados del localStorage
        const datosGuardados = cargarDatosGuardados();
        
        if (datosGuardados && detalleData.Part) {
          // Combinar datos de la API con los datos guardados en localStorage
          const partesCombinadas = detalleData.Part.map(part => {
            const parteGuardada = datosGuardados.partes.find(p => p.PartId === part.PartId);
            if (parteGuardada) {
              return {
                ...part,
                Status: parteGuardada.Status
              };
            }
            return part;
          });
          
          setDetalle({
            ...detalleData,
            Part: partesCombinadas
          });
          
        } else {
          setDetalle(detalleData);
        }
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  // Filtrar partes: mostrar solo las que tienen Stock = 1 y NO empiezan con 99PAQ
  const partesFiltradas = () => {
    if (!detalle || !detalle.Part) return [];
    return detalle.Part.filter(part => 
      part.Stock === 1 && !part.Articulo?.startsWith('99PAQ')
    );
  };

  // Función para ordenar las partes
  const partesOrdenadas = () => {
    const partes = partesFiltradas();
    
    return partes.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'Descrip':
          aValue = a.Descrip || '';
          bValue = b.Descrip || '';
          break;
        case 'Ubicacion':
          aValue = a.Ubicacion || '';
          bValue = b.Ubicacion || '';
          break;
        case 'PartId':
        default:
          aValue = a.PartId || '';
          bValue = b.PartId || '';
          break;
      }
      
      // Comparar valores
      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Función para manejar el cambio de ordenamiento
  const handleSort = (field) => {
    if (sortField === field) {
      // Cambiar dirección si es el mismo campo
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Cambiar campo y resetear dirección a ascendente
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Función para obtener el icono de ordenamiento
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return null;
    }
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Función para contar artículos ocultos (sin stock + 99PAQ)
  const contarArticulosOcultos = () => {
    if (!detalle || !detalle.Part) return 0;
    return detalle.Part.filter(part => 
      part.Stock !== 1 || part.Articulo?.startsWith('99PAQ')
    ).length;
  };

  // Función para contar artículos 99PAQ específicamente
  const contarArticulos99PAQ = () => {
    if (!detalle || !detalle.Part) return 0;
    return detalle.Part.filter(part => 
      part.Articulo?.startsWith('99PAQ')
    ).length;
  };

  const cambiarEstadoPrenda = (partId) => {
    // Solo permitir cambiar estado si el pedido está en EA
    if (pedido?.ESTADO !== "EA") return;
    
    setDetalle(prev => {
      if (!prev || !prev.Part) return prev;
      
      const partesActualizadas = prev.Part.map(part => 
        part.PartId === partId 
          ? { ...part, Status: part.Status.trim() === "0" ? "1" : "0" } 
          : part
      );
      
      // Guardar en localStorage después de actualizar
      const partesFiltradasParaGuardar = partesActualizadas.filter(part => 
        part.Stock === 1 && !part.Articulo?.startsWith('99PAQ')
      );
      
      guardarEnLocalStorage(partesFiltradasParaGuardar);
      
      return {
        ...prev,
        Part: partesActualizadas
      };
    });
  };

  // Función para verificar si todos los artículos están surtidos
  const todosSurtidos = () => {
    const partes = partesFiltradas();
    if (partes.length === 0) return false;
    return partes.every(part => part.Status.trim() === "1");
  };

  const guardarCambios = async () => {
    try {
      setSaving(true);
      
      // Preparar los datos para la API usando las partes filtradas
      const partesParaGuardar = partesFiltradas();
      
      const requestData = {
        SDTPedidoAR: {
          VENTA: parseInt(id),
          Part: partesParaGuardar.map(part => ({
            PartId: part.PartId,
            Status: part.Status.trim()
          }))
        }
      };

      // Llamar a la API para guardar los cambios
      const response = await fetch(`${API_BASE_URL}/FinArmadoPedido`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) throw new Error('Error en la respuesta del servidor');

      const result = await response.json();
      
      if (!result.error) {
        // Limpiar localStorage después de guardar exitosamente en la API
        limpiarLocalStorage();
        
        alert(result.Mensaje || "Cambios guardados correctamente");
        navigate("..");
      } else {
        throw new Error(result.Mensaje || 'Error al guardar los cambios');
      }
    } catch (err) {
      console.error("Error al guardar:", err);
      alert(err.message || "Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  // Función para limpiar el progreso manualmente
  const limpiarProgreso = () => {
    if (window.confirm("¿Estás seguro de que quieres limpiar todo el progreso de surtido? Esta acción no se puede deshacer.")) {
      limpiarLocalStorage();
      
      // Resetear todos los status a "0"
      setDetalle(prev => {
        if (!prev || !prev.Part) return prev;
        
        const partesReseteadas = prev.Part.map(part => ({
          ...part,
          Status: "0"
        }));
        
        return {
          ...prev,
          Part: partesReseteadas
        };
      });
      
      alert("Progreso limpiado correctamente");
    }
  };

  return {
    // Estados
    pedido,
    detalle,
    loading,
    error,
    saving,
    startingArmado,
    sortField,
    sortDirection,
    
    // Métodos
    navigate,
    iniciarArmado,
    handleSort,
    getSortIcon,
    cambiarEstadoPrenda,
    guardarCambios,
    limpiarProgreso,
    partesOrdenadas,
    partesFiltradas,
    contarArticulosOcultos,
    contarArticulos99PAQ,
    todosSurtidos,
    
    // Computed values
    hayDatosGuardados: !!localStorage.getItem(storageKey),
    totalPiezas: partesFiltradas().reduce((total, part) => total + parseInt(part.Cant), 0),
    piezasSurtidas: partesFiltradas().reduce((total, part) => 
      total + (part.Status.trim() === "1" ? parseInt(part.Cant) : 0), 0
    )
  };
};