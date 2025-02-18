import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Accordion, Container, Row, Col, Table, Button, Form } from 'react-bootstrap';
import OrderModal from './OrderModal';
import PerfilVendedor from './PerfilVendedor';

const Home = () => {
  const [clients, setClients] = useState([]);
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleClients, setVisibleClients] = useState(10);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientesRes, historicoRes] = await Promise.all([
          axios.get('https://api-google-sheets-7zph.vercel.app/clientes_adriel'),
          axios.get('https://api-google-sheets-7zph.vercel.app/historico_clientes_adriel')
        ]);

        const clientsData = parseData(clientesRes.data.values);
        const historyData = parseData(historicoRes.data.values);

        setClients(clientsData);
        setHistory(historyData);
      } catch (error) {
        console.error('Erro ao buscar os dados:', error);
      }
    };

    fetchData();
  }, []);

  const parseData = (data) => {
    const [header, ...rows] = data;
    return rows.map(row => Object.fromEntries(header.map((key, index) => [key, row[index]])));
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

  const filteredClients = clients.filter(client =>
    [client['Cliente'], client['Código'], client['Fantasia']]
      .some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedClientsList = filteredClients
    .map(client => {
      const clientHistory = historyByClient[client['Inscricao']];
      const lastPurchase = clientHistory ? getLastPurchaseDate(clientHistory) : { date: new Date(0), formatted: null };
      return { ...client, clientHistory, lastPurchase };
    })
    .sort((a, b) => b.lastPurchase.date - a.lastPurchase.date)
    .slice(0, visibleClients);

  const aggregateProducts = (orders) => {
    return Object.values(orders.reduce((acc, order) => {
      const produto = order['Produto'];
      const quantidade = parseFloat(order['Quantidade']?.replace(',', '.') || 0);
      if (!acc[produto]) acc[produto] = { produto, totalQuantidade: 0, count: 0 };
      acc[produto].totalQuantidade += quantidade;
      acc[produto].count += 1;
      return acc;
    }, {})).sort((a, b) => b.totalQuantidade - a.totalQuantidade);
  };

  const handleLoadMore = () => setVisibleClients(prev => prev + 10);

  const handleCloseModal = () => {
    setIsOrderModalOpen(false);
    setSelectedClient(null);
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
      <Accordion>
        {sortedClientsList.map((client, idx) => {
          const { clientHistory, lastPurchase } = client;
          const aggregatedProducts = clientHistory ? aggregateProducts(clientHistory) : [];

          return (
            <Accordion.Item eventKey={idx.toString()} key={client['Código']}>
              <Accordion.Header>
                {client['Cliente']} - {client['Fantasia']}
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
                      <Col md={4}><strong>Total de Pedidos:</strong> {clientHistory.length}</Col>
                    </Row>
                    <h5>Produtos Mais Solicitados</h5>
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>Total Quantidade</th>
                          <th>Nº de Pedidos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aggregatedProducts.map(prod => (
                          <tr key={prod.produto}>
                            <td>{prod.produto}</td>
                            <td>{prod.totalQuantidade}</td>
                            <td>{prod.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </>
                ) : (
                  <p>Nenhum histórico disponível.</p>
                )}
                <Button onClick={() => { setSelectedClient(client); setIsOrderModalOpen(true); }}>
                  Novo Pedido
                </Button>
              </Accordion.Body>
            </Accordion.Item>
          );
        })}
      </Accordion>
      {visibleClients < filteredClients.length && (
        <div className="mt-3 text-center">
          <Button onClick={handleLoadMore}>Carregar mais</Button>
        </div>
      )}
      {selectedClient && (
        <OrderModal client={selectedClient} isOpen={isOrderModalOpen} onClose={handleCloseModal} />
      )}
    </Container>
  );
};

export default Home;