import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Accordion, Container, Row, Col, Table, Button } from 'react-bootstrap';
import OrderModal from './OrderModal';
import PerfilVendedor from './PerfilVendedor';

const Home = () => {
  const [data, setData] = useState([]);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          'https://api-google-sheets-7zph.vercel.app/clientes_adriel'
        );
        const rawData = response.data.values;
        // Extraímos o cabeçalho e convertemos as linhas em objetos
        const [header, ...rows] = rawData;
        const dataObjects = rows.map(row => {
          const obj = {};
          header.forEach((key, index) => {
            obj[key] = row[index];
          });
          return obj;
        });
        setData(dataObjects);
      } catch (error) {
        console.error('Erro ao buscar os dados:', error);
      }
    };

    fetchData();
  }, []);
 
  
  // Agrupa as vendas por cliente (usando o campo "Cliente")
  const groupedClients = data.reduce((acc, sale) => {
    const clientName = sale['Cliente'];
    if (!acc[clientName]) {
      acc[clientName] = {
        clientInfo: sale, // Usa os dados da primeira venda como referência
        sales: []
      };
    }
    acc[clientName].sales.push(sale);
    return acc;
  }, {});

  // Função para agregar os produtos mais solicitados para um cliente
  const aggregateProducts = (sales) => {
    // Agrupa por "Produto"
    const productAggregation = sales.reduce((acc, sale) => {
      const produto = sale['Produto'];
      // Converte a quantidade para número (considerando vírgula decimal)
      const quantidade = Number(sale['Quantidade'].replace(',', '.'));
      if (!acc[produto]) {
        acc[produto] = {
          produto,
          totalQuantidade: 0,
          count: 0,
        };
      }
      acc[produto].totalQuantidade += quantidade;
      acc[produto].count += 1;
      return acc;
    }, {});

    // Converte para array e ordena pela quantidade total (decrescente)
    return Object.values(productAggregation).sort((a, b) => b.totalQuantidade - a.totalQuantidade);
  };

  // Função para obter a última data de compra de um cliente
  const getLastPurchaseDate = (sales) => {
    // Converte datas do formato DD/MM/YYYY para objetos Date
    const dates = sales.map(sale => {
      const [day, month, year] = sale['Data'].split('/');
      return new Date(year, month - 1, day);
    });
    const maxDate = new Date(Math.max(...dates));
    const day = String(maxDate.getDate()).padStart(2, '0');
    const month = String(maxDate.getMonth() + 1).padStart(2, '0');
    const year = maxDate.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Função para fechar o modal e limpar o cliente selecionado
  const handleCloseModal = () => {
    setIsOrderModalOpen(false);
    setSelectedClient(null);
  };

  return (
    <Container className="mt-4">
      <PerfilVendedor data={data} />

      <h2 className="mb-4">Clientes</h2>
      <Accordion defaultActiveKey="0">
        {Object.keys(groupedClients).map((clientName, idx) => {
          const { clientInfo, sales } = groupedClients[clientName];
          const lastPurchaseDate = getLastPurchaseDate(sales);
          const aggregatedProducts = aggregateProducts(sales);
          return (
            <Accordion.Item eventKey={idx.toString()} key={clientName}>
              <Accordion.Header>
                {clientName} - {clientInfo['Fantasia']}
              </Accordion.Header>
              <Accordion.Body>
                <Row className="mb-3">
                  <Col md={4}>
                    <strong>CNPJ:</strong> {clientInfo['CNPJ']}
                  </Col>
                  <Col md={4}>
                    <strong>Telefone:</strong> {clientInfo['Telefone']}
                  </Col>
                  <Col md={4}>
                    <strong>Endereço:</strong> {clientInfo['Endereco']}, {clientInfo['CEP']} - {clientInfo['Cidade']}
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={4}>
                    <strong>Última Data de Compra:</strong> {lastPurchaseDate}
                  </Col>
                  <Col md={4}>
                    <strong>Total de Vendas:</strong> {sales.length}
                  </Col>
                </Row>
                <h5>Produtos Mais Solicitados</h5>
                <Table responsive striped bordered hover>
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
                <Button 
                  variant="primary"
                  onClick={() => {
                    setSelectedClient(clientInfo);
                    setIsOrderModalOpen(true);
                  }}
                >
                  Novo Pedido
                </Button>
              </Accordion.Body>
            </Accordion.Item>
          );
        })}
      </Accordion>
      
      {selectedClient && (
        <OrderModal 
          client={selectedClient}
          isOpen={isOrderModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </Container>
  );
};

export default Home;