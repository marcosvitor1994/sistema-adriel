import React from 'react';
import { Card, Container, Row, Col } from 'react-bootstrap';

const PerfilVendedor = ({ data }) => {
  // 1) Agrupa e acumula dados por vendedor
  const groupedVendors = data.reduce((acc, sale) => {
    const vendedor = sale['Vendedor'];

    if (!acc[vendedor]) {
      acc[vendedor] = {
        totalVendas: 0,
        pedidosUnicos: new Set(),
        maxDate: null,
        clients: {},
      };
    }

    // Soma do campo 'Total' (convertendo vírgula em ponto)
    const valorVenda = Number(sale['Total'].replace(',', '.'));
    acc[vendedor].totalVendas += valorVenda;

    // Adiciona o pedido para contar apenas pedidos distintos
    acc[vendedor].pedidosUnicos.add(sale['Pedido']);

    // Verifica data para obter a mais recente
    const [day, month, year] = sale['Data'].split('/');
    const saleDate = new Date(year, month - 1, day);

    if (!acc[vendedor].maxDate || saleDate > acc[vendedor].maxDate) {
      acc[vendedor].maxDate = saleDate;
    }

    // Conta quantos pedidos cada cliente fez
    const cliente = sale['Cliente'];
    if (!acc[vendedor].clients[cliente]) {
      acc[vendedor].clients[cliente] = 0;
    }
    acc[vendedor].clients[cliente] += 1;

    return acc;
  }, {});

  // 2) Processa cada vendedor para calcular valores finais
  Object.keys(groupedVendors).forEach((vendedor) => {
    const vendorData = groupedVendors[vendedor];

    // a) Top Cliente (por número de pedidos)
    const sortedClients = Object.entries(vendorData.clients).sort((a, b) => b[1] - a[1]);
    vendorData.topClient = sortedClients.length ? sortedClients[0][0] : 'N/A';

    // b) Formata a última data de venda para DD/MM/YYYY
    if (vendorData.maxDate) {
      const d = String(vendorData.maxDate.getDate()).padStart(2, '0');
      const m = String(vendorData.maxDate.getMonth() + 1).padStart(2, '0');
      const y = vendorData.maxDate.getFullYear();
      vendorData.lastSaleDate = `${d}/${m}/${y}`;
    } else {
      vendorData.lastSaleDate = 'N/A';
    }

    // c) Calcula Ticket Médio = totalVendas / número de pedidos distintos
    const totalPedidos = vendorData.pedidosUnicos.size;
    vendorData.ticketMedio = totalPedidos > 0
      ? vendorData.totalVendas / totalPedidos
      : 0;
  });

  // 3) Renderiza um Card para cada vendedor
  return (
    <Container fluid className="mt-4">
      {Object.keys(groupedVendors).map((vendedor) => {
        const {
          totalVendas,
          pedidosUnicos,
          ticketMedio,
          lastSaleDate,
          topClient,
        } = groupedVendors[vendedor];

        return (
          <Card
            className="p-4 shadow-lg border-0 mb-4"
            style={{ width: '100%', borderRadius: '15px' }}
            key={vendedor}
          >
            {/* Cabeçalho do Card */}
            <Card.Header
              className="bg-primary text-white fs-4 fw-bold"
              style={{ borderRadius: '10px 10px 0 0' }}
            >
              Representante {vendedor} DIAS
              <br />
              Região: Norte
            </Card.Header>

            {/* Corpo do Card */}
            <Card.Body>
              <Row className="text-center">
                {/* Total de Vendas */}
                <Col>
                  <h3 className="fw-bold text-success">
                    R$ {totalVendas.toFixed(2)}
                  </h3>
                  <p className="text-muted">Total de Vendas</p>
                </Col>

                {/* Total de Pedidos Distintos */}
                <Col>
                  <h3 className="fw-bold text-info">
                    {pedidosUnicos.size}
                  </h3>
                  <p className="text-muted">Total de Pedidos</p>
                </Col>

                {/* Ticket Médio */}
                <Col>
                  <h3 className="fw-bold text-warning">
                    R$ {ticketMedio.toFixed(2)}
                  </h3>
                  <p className="text-muted">Ticket Médio</p>
                </Col>

                {/* Última Data de Venda */}
                <Col>
                  <h3 className="fw-bold text-secondary">
                    {lastSaleDate}
                  </h3>
                  <p className="text-muted">Última Venda</p>
                </Col>

                {/* Cliente Mais Frequente */}
                <Col>
                  <h3 className="fw-bold text-danger">
                    {topClient}
                  </h3>
                  <p className="text-muted">Top Cliente</p>
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