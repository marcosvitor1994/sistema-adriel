import React from 'react';
import { Card, Container, Row, Col } from 'react-bootstrap';

const PerfilVendedor = ({ data }) => {
  const groupedVendors = data.reduce((acc, sale) => {
    const vendedor = sale['Vendedor'];

    if (!acc[vendedor]) {
      acc[vendedor] = {
        totalVendas: 0,
        pedidosUnicos: new Set(),
        maxDate: null,
        products: {},
      };
    }

    // Soma do campo 'Total' (convertendo vírgula em ponto)
    const valorVenda = sale['Total'] ? Number(sale['Total'].replace(',', '.')) : 0;
    acc[vendedor].totalVendas += valorVenda;

    // Adiciona o pedido para contar apenas pedidos distintos
    acc[vendedor].pedidosUnicos.add(sale['Pedido']);

    // Verifica data para obter a mais recente
    const [day, month, year] = sale['Data'].split('/');
    const saleDate = new Date(year, month - 1, day);

    if (!acc[vendedor].maxDate || saleDate > acc[vendedor].maxDate) {
      acc[vendedor].maxDate = saleDate;
    }

    // Conta quantos pedidos cada produto teve
    const produto = sale['Produto'];
    if (!acc[vendedor].products[produto]) {
      acc[vendedor].products[produto] = 0;
    }
    acc[vendedor].products[produto] += 1;

    return acc;
  }, {});

  Object.keys(groupedVendors).forEach((vendedor) => {
    const vendorData = groupedVendors[vendedor];

    // Formata a última data de venda para DD/MM/YYYY
    if (vendorData.maxDate) {
      const d = String(vendorData.maxDate.getDate()).padStart(2, '0');
      const m = String(vendorData.maxDate.getMonth() + 1).padStart(2, '0');
      const y = vendorData.maxDate.getFullYear();
      vendorData.lastSaleDate = `${d}/${m}/${y}`;
    } else {
      vendorData.lastSaleDate = 'N/A';
    }

    // Calcula Ticket Médio = totalVendas / número de pedidos distintos
    const totalPedidos = vendorData.pedidosUnicos.size;
    vendorData.ticketMedio = totalPedidos > 0 ? vendorData.totalVendas / totalPedidos : 0;

    // Identifica o produto mais vendido e o menos vendido
    const sortedProducts = Object.entries(vendorData.products).sort((a, b) => b[1] - a[1]);
    vendorData.mostSoldProduct = sortedProducts.length ? sortedProducts[0][0] : 'N/A';
    vendorData.leastSoldProduct = sortedProducts.length ? sortedProducts[sortedProducts.length - 1][0] : 'N/A';
  });

  // Função para formatar valores monetários para o formato brasileiro
  const formatCurrency = (value) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Container fluid className="mt-4">
      {Object.keys(groupedVendors).map((vendedor) => {
        const {
          totalVendas,
          pedidosUnicos,
          ticketMedio,
          lastSaleDate,
          mostSoldProduct,
          leastSoldProduct,
        } = groupedVendors[vendedor];

        return (
          <Card
            className="p-4 shadow-lg border-0 mb-4"
            style={{ width: '100%', borderRadius: '15px' }}
            key={vendedor}
          >
            <Card.Header
              className="bg-primary text-white fs-4 fw-bold"
              style={{ borderRadius: '10px 10px 0 0' }}
            >
              Representante {vendedor} DIAS
              <br />
              Região: Norte
            </Card.Header>

            <Card.Body>
              <Row className="text-center">
                <Col>
                  <h3 className="fw-bold text-success">{formatCurrency(totalVendas)}</h3>
                  <p className="text-muted">Total de Vendas</p>
                </Col>

                <Col>
                  <h3 className="fw-bold text-info">{pedidosUnicos.size}</h3>
                  <p className="text-muted">Total de Pedidos</p>
                </Col>

                <Col>
                  <h3 className="fw-bold text-warning">{formatCurrency(ticketMedio)}</h3>
                  <p className="text-muted">Ticket Médio</p>
                </Col>

                <Col>
                  <h3 className="fw-bold text-secondary">{lastSaleDate}</h3>
                  <p className="text-muted">Última Venda</p>
                </Col>

                <Col>
                  <h3 className="fw-bold text-primary">{mostSoldProduct}</h3>
                  <p className="text-muted">Produto Mais Vendido</p>
                </Col>

                <Col>
                  <h3 className="fw-bold text-danger">{leastSoldProduct}</h3>
                  <p className="text-muted">Produto Menos Vendido</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        );
      })}
    </Container>
  );
};

export default PerfilVendedor;