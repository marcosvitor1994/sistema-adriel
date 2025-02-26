import axios from "axios";
import React, { useEffect, useState } from "react";
import { Accordion, Container, Row, Col, Table, Button, Form, Modal, Spinner, Alert, Badge } from "react-bootstrap";
import OrderModal from "./OrderModal";
import PerfilVendedor from "./PerfilVendedor";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Home = () => {
  const [clients, setClients] = useState([]);
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleClients, setVisibleClients] = useState(10);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [productsAccordionOpen, setProductsAccordionOpen] = useState({});

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientesRes, historicoRes] = await Promise.all([
          axios.get("https://api-google-sheets-7zph.vercel.app/clientes_adriel"),
          axios.get("https://api-google-sheets-7zph.vercel.app/historico_clientes_adriel"),
        ]);

        setClients(parseData(clientesRes.data.values));
        setHistory(parseData(historicoRes.data.values));
      } catch (error) {
        console.error("Erro ao buscar os dados:", error);
      }
    };

    fetchData();
  }, []);

  const parseData = (data) => {
    const [header, ...rows] = data;
    return rows.map((row) => Object.fromEntries(header.map((key, index) => [key, row[index]])));
  };

  const historyByClient = history.reduce((acc, order) => {
    const clientInscricao = order['Inscricao'];
    if (!acc[clientInscricao]) acc[clientInscricao] = [];
    acc[clientInscricao].push(order);
    return acc;
  }, {});

  const getLastPurchaseDate = (orders) => {
    const dates = orders.map(order => {
      const [day, month, year] = order['Data'].split('/');
      return new Date(year, month - 1, day);
    });
    const maxDate = new Date(Math.max(...dates));
    return { date: maxDate, formatted: maxDate.toLocaleDateString('pt-BR') };
  };

  // Função para calcular o número de pedidos distintos
  const countDistinctOrders = (orders) => {
    const uniqueOrderIds = new Set(orders.map(order => order['Pedido']));
    return uniqueOrderIds.size;
  };

  // Função para calcular a data provável do próximo pedido
  const getNextOrderDate = (orders) => {
    // Agrupar pedidos por ID
    const ordersByIds = orders.reduce((acc, order) => {
      if (!acc[order['Pedido']]) acc[order['Pedido']] = [];
      acc[order['Pedido']].push(order);
      return acc;
    }, {});

    // Extrair datas únicas dos pedidos
    const orderDates = Object.keys(ordersByIds).map(orderId => {
      const [day, month, year] = ordersByIds[orderId][0]['Data'].split('/');
      return new Date(year, month - 1, day);
    });

    // Ordenar datas
    orderDates.sort((a, b) => a - b);
    
    // Se tiver apenas um pedido, sugerir o próximo para 30 dias depois
    if (orderDates.length <= 1) {
      const nextDate = new Date(orderDates[0]);
      nextDate.setDate(nextDate.getDate() + 30);
      return { date: nextDate, formatted: nextDate.toLocaleDateString('pt-BR') };
    }

    // Calcular a média de dias entre pedidos
    let totalDays = 0;
    for (let i = 1; i < orderDates.length; i++) {
      const diffTime = Math.abs(orderDates[i] - orderDates[i - 1]);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      totalDays += diffDays;
    }
    const avgDays = Math.round(totalDays / (orderDates.length - 1));
    
    // Calcular a próxima data com base na média
    const lastDate = orderDates[orderDates.length - 1];
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + avgDays);
    
    return { 
      date: nextDate, 
      formatted: nextDate.toLocaleDateString('pt-BR'),
      avgDays
    };
  };

  // Função para preparar os dados para o gráfico
  const prepareChartData = (orders) => {
    // Agrupar pedidos por ID e data
    const orderGroups = orders.reduce((acc, order) => {
      const pedido = order['Pedido'];
      const data = order['Data'];
      
      if (!acc[`${pedido}-${data}`]) {
        acc[`${pedido}-${data}`] = {
          pedido,
          data,
          valorTotal: 0
        };
      }
      
      // Adiciona ao valor total (convertendo de string para número)
      const total = parseFloat(order['Total'].replace(',', '.')) || 0;
      acc[`${pedido}-${data}`].valorTotal += total;
      
      return acc;
    }, {});
    
    // Converter para array e ordenar por data
    return Object.values(orderGroups)
      .sort((a, b) => {
        const [aDay, aMonth, aYear] = a.data.split('/');
        const [bDay, bMonth, bYear] = b.data.split('/');
        const dateA = new Date(aYear, aMonth - 1, aDay);
        const dateB = new Date(bYear, bMonth - 1, bDay);
        return dateA - dateB;
      })
      .map((order, index) => ({
        name: `#${order.pedido}`,
        valor: parseFloat(order.valorTotal.toFixed(2)),
        data: order.data,
        index: index + 1  // Adiciona um índice sequencial
      }));
  };

  // Função para analisar a frequência de compra dos produtos
  const analyzeProductFrequency = (orders) => {
    // Obter pedidos únicos e ordenados por data
    const uniqueOrders = {};
    orders.forEach(order => {
      const pedidoKey = order['Pedido'];
      if (!uniqueOrders[pedidoKey]) {
        uniqueOrders[pedidoKey] = {
          pedido: pedidoKey,
          data: order['Data'],
          produtos: new Set()
        };
      }
      uniqueOrders[pedidoKey].produtos.add(order['Produto']);
    });

    // Ordenar pedidos por data
    const sortedOrders = Object.values(uniqueOrders).sort((a, b) => {
      const [aDay, aMonth, aYear] = a.data.split('/');
      const [bDay, bMonth, bYear] = b.data.split('/');
      return new Date(aYear, aMonth - 1, aDay) - new Date(bYear, bMonth - 1, bDay);
    });

    // Para cada produto, analisar frequência de compra
    const productFrequency = {};
    orders.forEach(order => {
      const produto = order['Produto'];
      if (!productFrequency[produto]) {
        productFrequency[produto] = {
          produto,
          totalQuantidade: 0,
          ocorrencias: 0,
          pedidos: new Set(),
          intervalos: []
        };
      }
      
      productFrequency[produto].pedidos.add(order['Pedido']);
      
      const quantidade = parseFloat(order['Quantidade']?.replace(',', '.') || 0);
      productFrequency[produto].totalQuantidade += quantidade;
      productFrequency[produto].ocorrencias += 1;
    });
    
    // Calcular frequência média para produtos comprados em mais de um pedido
    sortedOrders.forEach((order, index) => {
      if (index === 0) return; // Pular o primeiro pedido pois precisamos de dois para calcular intervalo
      
      const currentDate = new Date(
        ...order.data.split('/').reverse().map((v, i) => i === 1 ? parseInt(v) - 1 : parseInt(v))
      );
      const prevDate = new Date(
        ...sortedOrders[index - 1].data.split('/').reverse().map((v, i) => i === 1 ? parseInt(v) - 1 : parseInt(v))
      );
      
      const diffTime = Math.abs(currentDate - prevDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Para cada produto neste pedido, adicionar o intervalo se ele também estava no pedido anterior
      Array.from(order.produtos).forEach(produto => {
        if (productFrequency[produto] && sortedOrders[index - 1].produtos.has(produto)) {
          productFrequency[produto].intervalos.push(diffDays);
        }
      });
    });
    
    // Calcular médias finais e formatar resultados
    return Object.values(productFrequency).map(prod => {
      const avgInterval = prod.intervalos.length > 0 
        ? Math.round(prod.intervalos.reduce((sum, val) => sum + val, 0) / prod.intervalos.length) 
        : null;
      
      return {
        produto: prod.produto,
        totalQuantidade: prod.totalQuantidade,
        mediaQuantidade: Math.round((prod.totalQuantidade / prod.pedidos.size) * 10) / 10,
        qtdPedidos: prod.pedidos.size,
        frequenciaMedia: avgInterval,
      };
    }).sort((a, b) => {
      // Ordenar primeiro por frequência (se disponível), depois por quantidade de pedidos
      if (a.frequenciaMedia && b.frequenciaMedia) return a.frequenciaMedia - b.frequenciaMedia;
      if (a.frequenciaMedia) return -1;
      if (b.frequenciaMedia) return 1;
      return b.qtdPedidos - a.qtdPedidos;
    });
  };

  const filteredClients = clients.filter(client =>
    [client['Cliente'], client['Código'], client['Fantasia']]
      .some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedClientsList = filteredClients
    .map(client => {
      const clientHistory = historyByClient[client['Inscricao']];
      const lastPurchase = clientHistory ? getLastPurchaseDate(clientHistory) : { date: new Date(0), formatted: null };
      const orderCount = clientHistory ? countDistinctOrders(clientHistory) : 0;
      const nextOrder = clientHistory && orderCount > 0 ? getNextOrderDate(clientHistory) : null;
      const chartData = clientHistory ? prepareChartData(clientHistory) : [];
      const productAnalysis = clientHistory ? analyzeProductFrequency(clientHistory) : [];
      
      return { 
        ...client, 
        clientHistory, 
        lastPurchase, 
        orderCount,
        nextOrder,
        chartData,
        productAnalysis
      };
    })
    // Ordenar primeiro por número de pedidos (decrescente) e depois por data da última compra
    .sort((a, b) => {
      if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
      return b.lastPurchase.date - a.lastPurchase.date;
    })
    .slice(0, visibleClients);

  const handleLoadMore = () => setVisibleClients(prev => prev + 10);

  const handleOpenUploadModal = () => {
    setIsUploadModalOpen(true);
    setUploadMessage(null); // Reseta a mensagem ao abrir o modal
  };

  const toggleProductsAccordion = (clientId) => {
    setProductsAccordionOpen(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }));
  };

  const handleCloseModal = () => {
    setIsOrderModalOpen(false);
    setSelectedClient(null);
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    setLoading(false);
    setUploadMessage(null);
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Selecione um arquivo PDF!");
      return;
    }

    setLoading(true);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post("https://hs67sbxkkfvfn2m5xfm3ayuoci0qbupx.lambda-url.us-east-2.on.aws/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Resposta da API:", response.data);
      setUploadMessage({ type: "success", text: "Arquivo processado com sucesso!" });
    } catch (error) {
      console.error("Erro ao enviar o arquivo:", error);
      setUploadMessage({ type: "danger", text: "Erro ao processar o arquivo. Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  // Função para formatar valor monetário
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Custom tooltip para o gráfico
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p className="mb-0"><strong>Pedido:</strong> {label}</p>
          <p className="mb-0"><strong>Data:</strong> {payload[0].payload.data}</p>
          <p className="mb-0"><strong>Valor:</strong> {formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Container className="mt-4">
      <PerfilVendedor data={history} />

      <h2 className="mb-4">Clientes</h2>

      <Form.Group className="mb-3">
        <Form.Control
          type="text"
          placeholder="Pesquisar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Form.Group>

      {/* Modal de Upload */}
      <Modal show={isUploadModalOpen} onHide={handleCloseUploadModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Upload de Pedido (PDF)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Control type="file" accept="application/pdf" onChange={handleFileChange} />
          </Form.Group>
          <Button onClick={handleUpload} disabled={loading} className="w-100">
            {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : "Enviar PDF"}
          </Button>

          {uploadMessage && (
            <Alert variant={uploadMessage.type} className="mt-3">
              {uploadMessage.text}
            </Alert>
          )}
        </Modal.Body>
      </Modal>

      {/* Lista de clientes */}
      <Accordion>
        {sortedClientsList.map((client, idx) => {
          const { clientHistory, lastPurchase, orderCount, nextOrder, chartData, productAnalysis } = client;
          const clientId = client['Código'];

          return (
            <Accordion.Item eventKey={idx.toString()} key={client['Código']}>
              <Accordion.Header>
                <div className="w-100">
                  <div className="d-block fw-bold">
                    {client['Cliente']} - {client['Fantasia']}
                  </div>
                  <div className="d-flex mt-1 align-items-center">
                    {orderCount > 0 && (
                      <Badge bg="primary" className="me-2">{orderCount} pedido{orderCount !== 1 ? 's' : ''}</Badge>
                    )}
                    {orderCount > 1 && nextOrder && nextOrder.avgDays && (
                      <Badge bg="info" className="text-dark">
                        Próximo pedido: {nextOrder.formatted}
                      </Badge>
                    )}
                  </div>
                </div>
              </Accordion.Header>
              <Accordion.Body>
                <Row className="mb-3">
                  <Col md={4}><strong>Código:</strong> {client['Código']}</Col>
                  <Col md={4}><strong>CNPJ:</strong> {client['CNPJ']}</Col>
                  <Col md={4}><strong>Telefone:</strong> {client['Telefone']}</Col>
                </Row>
                {clientHistory ? (
                  <>
                    <Row className="mb-3">
                      <Col md={4}><strong>Última Compra:</strong> {lastPurchase.formatted}</Col>
                      <Col md={4}><strong>Total de Pedidos:</strong> {orderCount}</Col>
                      {nextOrder && nextOrder.avgDays && (
                        <Col md={4}><strong>Frequência média:</strong> {nextOrder.avgDays} dias</Col>
                      )}
                    </Row>
                    
                    {/* Gráfico de compras */}
                    {chartData.length > 1 && (
                      <div className="mb-4">
                        <h5>Histórico de Valores por Pedido</h5>
                        <div className="text-center mb-2 fw-bold">
                          Valor Total: {formatCurrency(chartData.reduce((sum, item) => sum + item.valor, 0))}
                        </div>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <BarChart
                              data={chartData}
                              margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="name" 
                                height={50}
                              />
                              <YAxis 
                                tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <Bar 
                                dataKey="valor" 
                                name="Valor do Pedido" 
                                fill="#8884d8" 
                                animationDuration={1000}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                    
                    {/* Accordeon para produtos mais solicitados */}
                    <div className="mb-3">
                      <div 
                        className="d-flex justify-content-between align-items-center p-2 rounded mb-2 cursor-pointer"
                        onClick={() => toggleProductsAccordion(clientId)}
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: '#f5f5dc', // Cor bege pastel
                          border: '1px solid #e6e6c8'
                        }}
                      >
                        <h5 className="mb-0">
                          <i className="bi bi-list-ul me-2"></i>
                          Produtos Mais Solicitados
                        </h5>
                        <i className={`bi bi-chevron-${productsAccordionOpen[clientId] ? 'up' : 'down'}`}></i>
                      </div>
                      
                      {productsAccordionOpen[clientId] && (
                        <Table striped bordered hover responsive className="mt-2">
                          <thead>
                            <tr className="table-primary">
                              <th>Produto</th>
                              <th>Freq. Média (dias)</th>
                              <th>Quant. Média</th>
                              <th>Total Pedidos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productAnalysis.map(prod => (
                              <tr key={prod.produto}>
                                <td>{prod.produto}</td>
                                <td>
                                  {prod.frequenciaMedia 
                                    ? `${prod.frequenciaMedia} dias` 
                                    : <span className="text-muted">N/A</span>}
                                </td>
                                <td>{prod.mediaQuantidade}</td>
                                <td>{prod.qtdPedidos}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </div>
                  </>
                ) : (
                  <Alert variant="warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Nenhum histórico disponível. Cliente sem pedidos anteriores.
                  </Alert>
                )}
                <Button 
                  onClick={() => { setSelectedClient(client); setIsOrderModalOpen(true); }}
                  variant="success"
                  className="mt-2"
                >
                  <i className="bi bi-cart-plus me-2"></i>
                  Novo Pedido
                </Button>
              </Accordion.Body>
            </Accordion.Item>
          );
        })}
      </Accordion>
      {visibleClients < filteredClients.length && (
        <div className="mt-3 text-center">
          <Button onClick={handleLoadMore} variant="outline-primary">Carregar mais</Button>
        </div>
      )}
      {selectedClient && (
        <OrderModal client={selectedClient} isOpen={isOrderModalOpen} onClose={handleCloseModal} />
      )}
    </Container>
  );
};

export default Home;