import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Pagination from "./Pagination";
import { API_BASE_URL } from "../../config/api";

const PedidoList = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortConfig, setSortConfig] = useState({
    key: "NombreCLIENTE",
    direction: "ascending"
  });

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/ConsultaPedidosConfirmados?t=${Date.now()}`);
        if (!response.ok) throw new Error('Error al obtener los pedidos');
        
        const data = await response.json();
        
        // Ordenar pedidos alfabéticamente por nombre del cliente por defecto
        const pedidosOrdenados = (data.ListPedidos || []).sort((a, b) => {
          const nombreA = a.NombreCLIENTE?.toLowerCase() || '';
          const nombreB = b.NombreCLIENTE?.toLowerCase() || '';
          return nombreA.localeCompare(nombreB);
        });
        
        setPedidos(pedidosOrdenados);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPedidos();
  }, []);

  // Función para ordenar los pedidos
  const sortPedidos = (key) => {
    let direction = "ascending";
    
    // Si ya está ordenando por esta clave, invertir la dirección
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    
    setSortConfig({ key, direction });
    
    const pedidosOrdenados = [...pedidos].sort((a, b) => {
      let aValue = a[key]?.toString().toLowerCase() || '';
      let bValue = b[key]?.toString().toLowerCase() || '';
      
      // Si es número, convertir a número para comparación
      if (key === "VENTA") {
        aValue = parseInt(aValue) || 0;
        bValue = parseInt(bValue) || 0;
      }
      
      if (aValue < bValue) {
        return direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
    
    setPedidos(pedidosOrdenados);
    setCurrentPage(1); // Resetear a la primera página al ordenar
  };

  // Función para obtener el ícono de ordenamiento
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return "↕️";
    }
    return sortConfig.direction === "ascending" ? "↑" : "↓";
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = pedidos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(pedidos.length / itemsPerPage);

  return (
    <div className="mx-auto p-4 md:p-6">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center">
          Pedidos Confirmados para Armado
        </h1>
        <div className="text-center text-sm text-gray-500 mt-2">
          Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, pedidos.length)} de {pedidos.length} pedidos
        </div>
        <div className="text-center text-xs text-blue-600 mt-1">
          Ordenado por: {sortConfig.key === "NombreCLIENTE" ? "Cliente" : 
                        sortConfig.key === "VENDEDOR" ? "Vendedor" : 
                        "N° Pedido"} ({sortConfig.direction === "ascending" ? "Ascendente" : "Descendente"})
        </div>
      </header>

      <section className="mb-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">
              Pedidos Pendientes
            </h2>
            <div className="flex items-center gap-4">
              <SortSelector 
                sortConfig={sortConfig}
                onSort={sortPedidos}
              />
              <ItemsPerPageSelector 
                itemsPerPage={itemsPerPage} 
                setItemsPerPage={setItemsPerPage} 
              />
            </div>
          </div>
          
          {pedidos.length > 0 ? (
            <>
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                  <div 
                    className="col-span-2 flex items-center gap-1 hover:cursor-pointer hover:text-gray-900"
                    onClick={() => sortPedidos("VENTA")}
                  >
                    N° Pedido {getSortIcon("VENTA")}
                  </div>
                  <div 
                    className="col-span-4 flex items-center gap-1 hover:cursor-pointer hover:text-gray-900"
                    onClick={() => sortPedidos("NombreCLIENTE")}
                  >
                    Cliente {getSortIcon("NombreCLIENTE")}
                  </div>
                  <div className="col-span-2">ID Cliente</div>
                  <div className="col-span-2">Estado</div>
                  <div 
                    className="col-span-2 flex items-center gap-1 hover:cursor-pointer hover:text-gray-900"
                    onClick={() => sortPedidos("VENDEDOR")}
                  >
                    Vendedor {getSortIcon("VENDEDOR")}
                  </div>
                </div>
              </div>
              
              <ul className="divide-y divide-gray-200">
                {currentItems.map((pedido) => (
                  <PedidoListItem key={pedido.VENTA} pedido={pedido} />
                ))}
              </ul>
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                indexOfFirstItem={indexOfFirstItem}
                indexOfLastItem={indexOfLastItem}
                pedidosLength={pedidos.length}
                setCurrentPage={setCurrentPage}
              />
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </section>
    </div>
  );
};

const PedidoListItem = ({ pedido }) => (
  <li className="p-4 hover:bg-gray-50 transition-colors">
    <Link to={`pedido/${pedido.VENTA}`} className="block">
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-2 text-sm font-medium text-gray-900">
          #{pedido.VENTA}
        </div>
        <div className="col-span-4 text-sm text-gray-900">
          {pedido.NombreCLIENTE}
        </div>
        <div className="col-span-2 text-sm text-gray-600">
          {pedido.IDCLIENTE}
        </div>
        <div className="col-span-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${pedido.ESTADO === "CO" ? "bg-blue-100 text-blue-800" : pedido.ESTADO === "PA" ? "bg-orange-100 text-orange-800" : pedido.ESTADO === "EA" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>
              {pedido.ESTADO === "CO" ? "Confirmado" : pedido.ESTADO === "PA" ? "Parcial" : pedido.ESTADO === "EA" ? "En Armado" : pedido.ESTADO}
          </span>
        </div>
        <div className="col-span-2 text-sm text-gray-600">
          {pedido.VENDEDOR}
        </div>
      </div>
    </Link>
  </li>
);

const SortSelector = ({ sortConfig, onSort }) => (
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-600">Ordenar por:</span>
    <select 
      className="border rounded p-1 text-sm"
      onChange={(e) => onSort(e.target.value)}
      value={sortConfig.key}
    >
      <option value="NombreCLIENTE">Cliente (A-Z)</option>
      <option value="VENDEDOR">Vendedor (A-Z)</option>
      <option value="VENTA">N° Pedido</option>
    </select>
    <button
      className="p-1 text-gray-600 hover:text-gray-900"
      onClick={() => onSort(sortConfig.key)} // Cambia la dirección manteniendo la misma clave
      title={sortConfig.direction === "ascending" ? "Orden descendente" : "Orden ascendente"}
    >
      {sortConfig.direction === "ascending" ? "↑" : "↓"}
    </button>
  </div>
);

const ViewDetailsButton = () => (
  <div className="flex items-center gap-1 text-sm text-rose-600 hover:text-rose-800 hover:cursor-pointer">
    <span className="font-semibold">Ver detalles</span>
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </div>
);

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-xl font-semibold text-gray-700">Cargando pedidos...</div>
  </div>
);

const ErrorScreen = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-xl font-semibold text-red-600">Error: {error}</div>
  </div>
);

const ItemsPerPageSelector = ({ itemsPerPage, setItemsPerPage }) => (
  <div className="flex items-center">
    <span className="text-sm mr-2">Mostrar:</span>
    <select 
      className="border rounded p-1 text-sm"
      onChange={(e) => setItemsPerPage(Number(e.target.value))}
      value={itemsPerPage}
    >
      <option value="10">10</option>
      <option value="15">15</option>
      <option value="20">20</option>
    </select>
  </div>
);

const EmptyState = () => (
  <div className="p-6 text-center text-gray-500">
    No hay pedidos confirmados para mostrar
  </div>
);

export default PedidoList;