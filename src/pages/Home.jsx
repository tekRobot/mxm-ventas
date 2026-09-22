import { GoPencil } from "react-icons/go";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from 'react';
import { debounce } from "lodash";
import { FiSearch, FiPrinter } from "react-icons/fi";
import { useAuth } from '../context/AuthContext';
import { MdOutlineShoppingCart } from "react-icons/md";
import { FaArrowsAltV, FaArrowUp, FaArrowDown } from "react-icons/fa";
import { API_BASE_URL } from "../config/api";
import { filterPedidosByNombreCliente } from "../utils/filterPedidos";
import { agregarTicketAPedido } from "../utils/ticket";

const Home = () => {
    const { user } = useAuth();
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({
        key: 'venta', // campo por defecto para ordenar
        direction: 'asc' // dirección por defecto
    });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [allItems, setAllItems] = useState([]); // Almacenar todos los datos
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [printingVenta, setPrintingVenta] = useState(null);
    const itemsPerPage = 50;
    const isSearching = searchQuery.trim().length > 0;

    // Función para obtener todos los pedidos (sin detalles)
    const fetchAllPedidos = useCallback(async () => {
        if (!user) return [];
        
        try {
            const userId = user.username;
            const response = await fetch(`${API_BASE_URL}/ConsultaPedidos?Usuario=${userId}&t=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error('Error al obtener los pedidos');
            }
            
            const data = await response.json();
            
            // Filtrar solo PE y CT
            const filteredItems = data.ListPedidos.filter(item => 
                item.ESTADO === 'PE' || item.ESTADO === 'CT'
            );
            
            return filteredItems;
        } catch (err) {
            console.error('Error fetching pedidos:', err);
            throw err;
        }
    }, [user]);

    // Función para cargar detalles de un lote de pedidos
    const fetchPedidosDetails = useCallback(async (pedidos) => {
        const batchSize = 10; // Procesar en lotes de 10
        const results = [];
        
        for (let i = 0; i < pedidos.length; i += batchSize) {
            const batch = pedidos.slice(i, i + batchSize);
            
            const batchResults = await Promise.all(
                batch.map(async (item) => {
                    try {
                        const detalleResponse = await fetch(`${API_BASE_URL}/Pedido/${item.VENTA}?t=${Date.now()}`);
                        if (detalleResponse.ok) {
                            const detalleData = await detalleResponse.json();
                            return {
                                venta: item.VENTA,
                                nombre: item.NombreCLIENTE,
                                importe: parseFloat(detalleData.TotVenta) || 0,
                                estado: item.ESTADO,
                                pzas: parseInt(detalleData.TotPzas) || 0,
                                fecha: item.Fecha
                            };
                        }
                        return {
                            venta: item.VENTA,
                            nombre: item.NombreCLIENTE,
                            importe: 0,
                            estado: item.ESTADO,
                            pzas: 0,
                            fecha: item.Fecha
                        };
                    } catch (error) {
                        console.error(`Error fetching details for ${item.VENTA}:`, error);
                        return null;
                    }
                })
            );
            
            // Filtrar nulls y agregar a resultados
            results.push(...batchResults.filter(item => item !== null));
            
            // Pequeña pausa para no saturar
            if (i + batchSize < pedidos.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }, []);

    // Buscar cliente por nombre entre TODOS los pedidos pendientes del vendedor
    // (no solo los ya paginados), cargando sus detalles bajo demanda.
    const performSearch = useCallback(async (query, pedidos) => {
        const matches = filterPedidosByNombreCliente(pedidos, query);

        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setSearchLoading(true);
            const details = await fetchPedidosDetails(matches);
            setSearchResults(details);
        } catch (err) {
            console.error('Error searching pedidos:', err);
        } finally {
            setSearchLoading(false);
        }
    }, [fetchPedidosDetails]);

    const debouncedSearch = useCallback(
        debounce((query, pedidos) => performSearch(query, pedidos), 300),
        [performSearch]
    );

    useEffect(() => {
        debouncedSearch(searchQuery, allItems);
        return () => debouncedSearch.cancel();
    }, [searchQuery, allItems, debouncedSearch]);

    // Cargar datos iniciales
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                if (!user) return;
                
                setInitialLoading(true);
                setError(null);
                
                // 1. Obtener todos los pedidos
                const allPedidos = await fetchAllPedidos();
                setAllItems(allPedidos);
                
                // 2. Cargar primera página de detalles
                const startIndex = 0;
                const endIndex = Math.min(itemsPerPage, allPedidos.length);
                const firstPagePedidos = allPedidos.slice(startIndex, endIndex);
                
                const firstPageDetails = await fetchPedidosDetails(firstPagePedidos);
                
                setSalesData(firstPageDetails);
                setHasMore(endIndex < allPedidos.length);
                setPage(1);
                setInitialLoading(false);
                setLoading(false);
                
            } catch (err) {
                console.error('Error loading initial data:', err);
                setError(err.message);
                setInitialLoading(false);
                setLoading(false);
            }
        };
        
        loadInitialData();
    }, [user, fetchAllPedidos, fetchPedidosDetails]);

    // Función para cargar más datos
    const loadMoreData = async () => {
        if (loadingMore || !hasMore || initialLoading) return;
        
        try {
            setLoadingMore(true);
            
            const nextPage = page + 1;
            const startIndex = (nextPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, allItems.length);
            
            if (startIndex >= allItems.length) {
                setHasMore(false);
                setLoadingMore(false);
                return;
            }
            
            const nextPagePedidos = allItems.slice(startIndex, endIndex);
            const nextPageDetails = await fetchPedidosDetails(nextPagePedidos);
            
            setSalesData(prev => [...prev, ...nextPageDetails]);
            setPage(nextPage);
            setHasMore(endIndex < allItems.length);
            setLoadingMore(false);
            
        } catch (err) {
            console.error('Error loading more data:', err);
            setLoadingMore(false);
        }
    };

    // Función para manejar el ordenamiento
    const handleSort = (key) => {
        let direction = 'asc';
        
        // Si ya estamos ordenando por esta clave, invertir la dirección
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        
        setSortConfig({ key, direction });
    };

    // Función para ordenar los datos
    const getSortedData = (data) => {
        if (!sortConfig.key) return data;

        const sortedData = [...data].sort((a, b) => {
            // Manejar diferentes tipos de datos
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Si es string, convertir a minúsculas para ordenamiento case-insensitive
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return sortedData;
    };

    // Función para obtener el ícono de ordenamiento
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <FaArrowsAltV />; // Icono neutral
        }
        return sortConfig.direction === 'asc' ? <FaArrowUp /> : <FaArrowDown />;
    };

    // Agrega el artículo de ticket (99PAQN700) directamente desde la lista,
    // sin tener que abrir el carrito del pedido.
    const handlePrintTicket = async (venta) => {
        if (printingVenta) return;

        try {
            setPrintingVenta(venta);
            await agregarTicketAPedido(venta, user?.username);
            alert(`Ticket agregado correctamente al pedido #${venta}`);
        } catch (err) {
            console.error('Error al agregar ticket:', err);
            alert(`Error al agregar ticket: ${err.message}`);
        } finally {
            setPrintingVenta(null);
        }
    };

    const fechaActual = (dateInput) => {
        // Si la fecha viene en formato YYYY-MM-DD, agregar la zona horaria
        if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            // Agregar 'T00:00:00' para especificar que es medianoche en la fecha local
            dateInput = dateInput + 'T00:00:00';
        }
        const dateObject = new Date(dateInput);

        // Validar si la conversión fue exitosa
        if (isNaN(dateObject.getTime())) {
            console.error("Error: La fecha de entrada es inválida ->", dateInput);
            return "Fecha inválida";
        }
        
        const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
        return new Intl.DateTimeFormat('es-MX', options).format(dateObject);
    };

    const displayItems = isSearching ? searchResults : salesData;
    const sortedSalesData = getSortedData(displayItems);

    if (initialLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando ventas pendientes...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <p className="text-red-500 mb-2">Error: {error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-5 mx-2 sm:mx-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <Link to={'/nuevo'}>
                    <button className="border border-rose-500 text-pink-800 px-3 py-1.5 hover:cursor-pointer hover:bg-pink-50 transition-colors">
                        + Nueva Orden
                    </button>
                </Link>

                <div className="relative w-full sm:w-80">
                    <input
                        type="text"
                        placeholder="Buscar cliente por nombre..."
                        className="w-full py-2 pl-4 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                </div>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-gray-600">
                            {isSearching ? (
                                <>
                                    {searchLoading ? 'Buscando...' : (
                                        <>
                                            <span className="font-bold">{searchResults.length}</span> resultado(s) para "{searchQuery.trim()}"
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    Mostrando <span className="font-bold">{salesData.length}</span> de <span className="font-bold">{allItems.length}</span> ventas pendientes
                                </>
                            )}
                        </p>
                        {!isSearching && (
                            <p className="text-sm text-gray-500">
                                Página {page} - {Math.min(page * itemsPerPage, allItems.length)}/{allItems.length}
                            </p>
                        )}
                    </div>
                    {!isSearching && hasMore && (
                        <button
                            onClick={loadMoreData}
                            disabled={loadingMore}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loadingMore ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Cargando...
                                </>
                            ) : (
                                <>
                                    Cargar más ({itemsPerPage} más)
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
            
            <div className="overflow-x-auto pt-3">
                {sortedSalesData.length === 0 ?
                    <div className="flex justify-center items-center h-64">
                        <p className="text-gray-500">
                            {isSearching
                                ? (searchLoading ? 'Buscando...' : `No se encontró ningún cliente con pedido para "${searchQuery.trim()}".`)
                                : 'No hay ventas pendientes.'}
                        </p>
                    </div>
                :
                    <>
                        <table className="min-w-full table-auto border-collapse border border-blue-100">
                            <thead>
                                <tr className="bg-white">
                                    <th 
                                        className="border border-blue-400 px-4 py-2 text-left cursor-pointer hover:bg-blue-50 transition-colors"
                                        onClick={() => handleSort('venta')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Venta {getSortIcon('venta')}
                                        </div>
                                    </th>
                                    <th 
                                        className="border border-blue-400 px-4 py-2 text-left cursor-pointer hover:bg-blue-50 transition-colors"
                                        onClick={() => handleSort('nombre')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Nombre {getSortIcon('nombre')}
                                        </div>
                                    </th>
                                    <th 
                                        className="border border-blue-400 px-4 py-2 text-left cursor-pointer hover:bg-blue-50 transition-colors"
                                        onClick={() => handleSort('importe')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Importe {getSortIcon('importe')}
                                        </div>
                                    </th>
                                    <th className="border border-blue-400 px-3 py-2 text-left">Piezas</th>
                                    <th className="border border-blue-400 px-3 py-2 text-left">Tipo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedSalesData.map((item) => (
                                    <tr key={item.venta} className="even:bg-white odd:bg-blue-100 hover:bg-blue-50">
                                        <td className="border border-blue-400 px-4 py-2">ID: {item.venta} - {fechaActual(item.fecha)}</td>
                                        <td className="border border-blue-400 px-4 py-2">
                                            <div className="flex justify-between gap-2">
                                                {item.nombre}
                                                <div className="flex gap-2">
                                                    <Link 
                                                        to={`/carrito?pedido=${item.venta}`}
                                                        className="text-gray-500 hover:text-blue-600 transition-colors duration-200"
                                                        title="Ver carrito"
                                                    >
                                                        <MdOutlineShoppingCart className="text-blue-600 hover:text-blue-800 cursor-pointer" />
                                                    </Link>
                                                    <Link
                                                        to={`/productos?pedido=${item.venta}`}
                                                        className="text-gray-500 hover:text-rose-600 transition-colors duration-200"
                                                        title="Agregar productos"
                                                    >
                                                        <GoPencil className="text-rose-600 hover:text-rose-800 cursor-pointer" />
                                                    </Link>
                                                    <a
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handlePrintTicket(item.venta);
                                                        }}
                                                        className={`text-gray-500 hover:text-purple-600 transition-colors duration-200 ${
                                                            printingVenta === item.venta ? 'opacity-50 pointer-events-none' : ''
                                                        }`}
                                                        title="Imprimir"
                                                    >
                                                        {printingVenta === item.venta ? (
                                                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-purple-600"></div>
                                                        ) : (
                                                            <FiPrinter className="text-purple-600 hover:text-purple-800 cursor-pointer" />
                                                        )}
                                                    </a>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="border border-blue-400 px-3 py-2">${item.importe.toFixed(2)}</td>
                                        <td className="border border-blue-400 px-3 py-2">{item.pzas}</td>
                                        <td className="border border-blue-400 px-3 py-2">
                                            {item.estado === 'CT' ? 
                                                <span className="bg-blue-500 text-white font-bold px-2 py-1 rounded text-sm uppercase">En Cotización</span> : 
                                                <span className="bg-green-800 text-white font-bold px-2 py-1 rounded text-sm uppercase">En Pedido</span>
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {/* Botón de cargar más al final */}
                        {!isSearching && hasMore && (
                            <div className="flex justify-center mt-6 mb-4">
                                <button
                                    onClick={loadMoreData}
                                    disabled={loadingMore}
                                    className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loadingMore ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Cargando más ventas...
                                        </>
                                    ) : (
                                        'Cargar más ventas'
                                    )}
                                </button>
                            </div>
                        )}
                        
                        {/* Indicador de que no hay más datos */}
                        {!isSearching && !hasMore && salesData.length > 0 && (
                            <div className="text-center mt-6 mb-4 p-4 bg-gray-50 rounded">
                                <p className="text-gray-600">✅ Has llegado al final. Se mostraron todas las ventas pendientes.</p>
                            </div>
                        )}
                    </>
                }
            </div>
        </div>
    );
};

export default Home;