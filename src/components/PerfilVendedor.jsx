import React from 'react';
import { Card, Container, Row, Col, Table } from 'react-bootstrap';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts';

// Função auxiliar para formatar valores monetários
const formatCurrency = (value) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Converte string "MM/YYYY" em Date para ordenação
const parseMonthYear = (mesAno) => {
  const [m, y] = mesAno.split('/');
  return new Date(+y, +m - 1, 1); // dia fixo = 1
};

const PerfilVendedor = ({ data }) => {
  // Agrupa dados por vendedor
  const groupedVendors = data.reduce((acc, sale) => {
    const vendedor = sale['Vendedor'];
    if (!acc[vendedor]) {
      acc[vendedor] = {
        totalVendas: 0,
        pedidosUnicos: new Set(),
        maxDate: null,
        products: {},
        vendasPorMes: {},
      };
    }

    const valorVenda = sale['Total']
      ? Number(sale['Total'].replace(',', '.'))
      : 0;
    acc[vendedor].totalVendas += valorVenda;
    acc[vendedor].pedidosUnicos.add(sale['Pedido']);

    const [day, month, year] = sale['Data'].split('/');
    const saleDate = new Date(year, month - 1, day);
    if (!acc[vendedor].maxDate || saleDate > acc[vendedor].maxDate) {
      acc[vendedor].maxDate = saleDate;
    }

    const produto = sale['Produto'];
    if (!acc[vendedor].products[produto]) {
      acc[vendedor].products[produto] = 0;
    }
    acc[vendedor].products[produto] += 1;

    const mesAno = `${month}/${year}`;
    if (!acc[vendedor].vendasPorMes[mesAno]) {
      acc[vendedor].vendasPorMes[mesAno] = 0;
    }
    acc[vendedor].vendasPorMes[mesAno] += valorVenda;

    return acc;
  }, {});

  return (
    <Container fluid className="mt-3">
      {Object.keys(groupedVendors).map((vendedor) => {
        const {
          totalVendas,
          pedidosUnicos,
          maxDate,
          products,
          vendasPorMes
        } = groupedVendors[vendedor];

        const ticketMedio =
          pedidosUnicos.size > 0 ? totalVendas / pedidosUnicos.size : 0;

        const sortedProducts = Object.entries(products).sort((a, b) => b[1] - a[1]);
        const mostSoldProduct = sortedProducts.length ? sortedProducts[0][0] : 'N/A';
        const leastSoldProduct = sortedProducts.length
          ? sortedProducts[sortedProducts.length - 1][0]
          : 'N/A';

        let lastSaleDate = 'N/A';
        if (maxDate) {
          const d = String(maxDate.getDate()).padStart(2, '0');
          const m = String(maxDate.getMonth() + 1).padStart(2, '0');
          const y = maxDate.getFullYear();
          lastSaleDate = `${d}/${m}/${y}`;
        }

        const sortedMonths = Object.keys(vendasPorMes)
          .map((mesAno) => ({
            mesAno,
            date: parseMonthYear(mesAno),
            valor: vendasPorMes[mesAno],
          }))
          .sort((a, b) => a.date - b.date);

        let monthlyVariation = 0;
        if (sortedMonths.length >= 2) {
          const last = sortedMonths[sortedMonths.length - 1];
          const prev = sortedMonths[sortedMonths.length - 2];
          if (prev.valor > 0) {
            monthlyVariation = ((last.valor - prev.valor) / prev.valor) * 100;
          }
        }

        const chartData = sortedMonths.map((item) => ({
          mes: item.mesAno,
          vendas: item.valor,
        }));

        const topProducts = sortedProducts.slice(0, 3);

        return (
          <Card
            key={vendedor}
            className="mb-2 shadow-sm"
            style={{ borderRadius: '6px', backgroundColor: '#F8F9FA' }}
          >
            <Card.Header
              style={{
                backgroundColor: '#E9ECEF',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                borderBottom: 'none',
                color: '#495057',
                fontSize: '16px',
                padding: '8px'
              }}
              className="fw-bold"
            >
              Representante: {vendedor} | Região: Norte
            </Card.Header>

            <Card.Body style={{ padding: '10px' }}>
              {/* Layout responsivo para KPIs */}
              <Row className="gy-2 gx-2 align-items-center">
                {/* Total de Vendas */}
                <Col xs={4} md={2} className="text-center">
                  <div className="text-muted" style={{ fontSize: '12px' }}>Total de Vendas</div>
                  <div className="fw-bold" style={{ fontSize: '14px' }}>
                    {formatCurrency(totalVendas)}
                  </div>
                </Col>
                {/* Total de Pedidos */}
                <Col xs={4} md={2} className="text-center">
                  <div className="text-muted" style={{ fontSize: '12px' }}>Total de Pedidos</div>
                  <div className="fw-bold" style={{ fontSize: '14px' }}>
                    {pedidosUnicos.size}
                  </div>
                </Col>
                {/* Ticket Médio */}
                <Col xs={4} md={2} className="text-center">
                  <div className="text-muted" style={{ fontSize: '12px' }}>Ticket Médio</div>
                  <div className="fw-bold" style={{ fontSize: '14px' }}>
                    {formatCurrency(ticketMedio)}
                  </div>
                </Col>
                {/* Última Venda */}
                <Col xs={6} md={3} className="text-center">
                  <div className="text-muted" style={{ fontSize: '12px' }}>Última Venda</div>
                  <div className="fw-bold" style={{ fontSize: '14px' }}>
                    {lastSaleDate}
                  </div>
                </Col>
                {/* Variação (Mês Atual vs. Anterior) */}
                <Col xs={6} md={3} className="text-center">
                  <div className="text-muted" style={{ fontSize: '12px' }}>Variação (Mês Atual vs. Anterior)</div>
                  <div
                    className="fw-bold"
                    style={{
                      fontSize: '14px',
                      color: monthlyVariation >= 0 ? '#198754' : '#dc3545',
                    }}
                  >
                    {sortedMonths.length >= 2
                      ? `${monthlyVariation.toFixed(1)}%`
                      : 'N/A'}
                  </div>
                </Col>
              </Row>

              {/* Gráfico de Evolução de Vendas Mensais */}
              <Row className="mt-2">
                <Col>
                  <div className="text-muted small mb-1" style={{ fontSize: '12px' }}>Evolução de Vendas Mensais</div>
                  <div style={{ width: '100%', height: 120 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData}>
                        <XAxis dataKey="mes" fontSize={10} />
                        <YAxis fontSize={10} tickFormatter={formatCurrency} />
                        <Tooltip formatter={formatCurrency} />
                        <Bar dataKey="vendas" fill="#6c757d">
                          <LabelList
                            dataKey="vendas"
                            position="top"
                            formatter={formatCurrency}
                            fontSize={10}
                            fill="#495057"
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Col>
              </Row>

              {/* Seção de Produtos */}
              <Row className="mt-2">
                <Col xs={12} md={6}>
                  <div className="text-muted small mb-1" style={{ fontSize: '12px' }}>Top 3 Produtos Mais Vendidos</div>
                  <Table hover size="sm" className="bg-white" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '70%' }}>Produto</th>
                        <th>Qtd. Pedidos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.length === 0 ? (
                        <tr>
                          <td colSpan={2}>N/A</td>
                        </tr>
                      ) : (
                        topProducts.map(([produto, qtd]) => (
                          <tr key={produto}>
                            <td>{produto}</td>
                            <td>{qtd}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </Col>
                <Col xs={12} md={6} className="text-center d-flex flex-column justify-content-center align-items-center">
                  <div className="text-muted small mb-1" style={{ fontSize: '12px' }}>Produto Menos Vendido</div>
                  <div className="fw-bold" style={{ fontSize: '14px' }}>
                    {leastSoldProduct}
                  </div>
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