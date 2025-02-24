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
        vendasPorMes: {}, // { '01/2025': valorTotal, '12/2024': valorTotal, etc. }
      };
    }

    // Soma do campo 'Total' (convertendo vírgula em ponto)
    const valorVenda = sale['Total']
      ? Number(sale['Total'].replace(',', '.'))
      : 0;
    acc[vendedor].totalVendas += valorVenda;

    // Adiciona pedido no Set para contar pedidos distintos
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

    // Soma valor de vendas por mês (MM/YYYY)
    const mesAno = `${month}/${year}`;
    if (!acc[vendedor].vendasPorMes[mesAno]) {
      acc[vendedor].vendasPorMes[mesAno] = 0;
    }
    acc[vendedor].vendasPorMes[mesAno] += valorVenda;

    return acc;
  }, {});

  return (
    <Container fluid className="mt-4">
      {Object.keys(groupedVendors).map((vendedor) => {
        const {
          totalVendas,
          pedidosUnicos,
          maxDate,
          products,
          vendasPorMes
        } = groupedVendors[vendedor];

        // Calcula Ticket Médio
        const ticketMedio =
          pedidosUnicos.size > 0 ? totalVendas / pedidosUnicos.size : 0;

        // Identifica produto mais e menos vendido
        const sortedProducts = Object.entries(products).sort((a, b) => b[1] - a[1]);
        const mostSoldProduct = sortedProducts.length ? sortedProducts[0][0] : 'N/A';
        const leastSoldProduct = sortedProducts.length
          ? sortedProducts[sortedProducts.length - 1][0]
          : 'N/A';

        // Formata data da última venda
        let lastSaleDate = 'N/A';
        if (maxDate) {
          const d = String(maxDate.getDate()).padStart(2, '0');
          const m = String(maxDate.getMonth() + 1).padStart(2, '0');
          const y = maxDate.getFullYear();
          lastSaleDate = `${d}/${m}/${y}`;
        }

        // Monta array ordenado por data (para o gráfico e variação mensal)
        const sortedMonths = Object.keys(vendasPorMes)
          .map((mesAno) => ({
            mesAno,
            date: parseMonthYear(mesAno),
            valor: vendasPorMes[mesAno],
          }))
          .sort((a, b) => a.date - b.date);

        // Calcula variação do último mês vs. penúltimo
        let monthlyVariation = 0;
        if (sortedMonths.length >= 2) {
          const last = sortedMonths[sortedMonths.length - 1];
          const prev = sortedMonths[sortedMonths.length - 2];
          if (prev.valor > 0) {
            monthlyVariation = ((last.valor - prev.valor) / prev.valor) * 100;
          }
        }

        // Dados para o gráfico
        const chartData = sortedMonths.map((item) => ({
          mes: item.mesAno,
          vendas: item.valor,
        }));

        // Top 3 produtos mais vendidos
        const topProducts = sortedProducts.slice(0, 3);

        return (
          <Card
            key={vendedor}
            className="mb-4 shadow-sm"
            style={{ borderRadius: '8px', backgroundColor: '#F8F9FA' }}
          >
            {/* Cabeçalho */}
            <Card.Header
              style={{
                backgroundColor: '#E9ECEF',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                borderBottom: 'none',
                color: '#495057',
                fontSize: '24px'
              }}
              className="fw-bold"
            >
              Representante: {vendedor} | Região: Norte
            </Card.Header>

            <Card.Body>
              {/* Linha principal de métricas */}
              <Row className="gy-3 gx-3">
                <Col md={2} className="text-center">
                  <div className="text-muted" style={{ fontSize: '16px' }}>Total de Vendas</div>
                  <div className="fw-bold" style={{ fontSize: '20px' }}>
                    {formatCurrency(totalVendas)}
                  </div>
                </Col>

                <Col md={2} className="text-center">
                  <div className="text-muted" style={{ fontSize: '16px' }}>Total de Pedidos</div>
                  <div className="fw-bold" style={{ fontSize: '20px' }}>
                    {pedidosUnicos.size}
                  </div>
                </Col>

                <Col md={2} className="text-center">
                  <div className="text-muted" style={{ fontSize: '16px' }}>Ticket Médio</div>
                  <div className="fw-bold" style={{ fontSize: '20px' }}>
                    {formatCurrency(ticketMedio)}
                  </div>
                </Col>

                <Col md={2} className="text-center">
                  <div className="text-muted" style={{ fontSize: '16px' }}>Última Venda</div>
                  <div className="fw-bold" style={{ fontSize: '20px' }}>
                    {lastSaleDate}
                  </div>
                </Col>

                <Col md={3} className="text-center">
                  <div className="text-muted" style={{ fontSize: '16px' }}>Variação (Mês Atual vs. Anterior)</div>
                  <div
                    className="fw-bold"
                    style={{
                      fontSize: '20px',
                      color: monthlyVariation >= 0 ? '#198754' : '#dc3545',
                    }}
                  >
                    {sortedMonths.length >= 2
                      ? `${monthlyVariation.toFixed(1)}%`
                      : 'N/A'}
                  </div>
                </Col>
              </Row>

              {/* Gráfico de barras das vendas mensais */}
              <Row className="mt-4">
                <Col>
                  <div className="text-muted small mb-2">
                    Evolução de Vendas Mensais
                  </div>
                  <div style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData}>
                        <XAxis dataKey="mes" fontSize={14} />
                        <YAxis fontSize={14} tickFormatter={formatCurrency} />
                        <Tooltip formatter={formatCurrency} />
                        <Bar dataKey="vendas" fill="#6c757d">
                          <LabelList
                            dataKey="vendas"
                            position="top"
                            formatter={formatCurrency}
                            fontSize={16}
                            fill="#495057"
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Col>
              </Row>

              {/* Produtos mais vendidos / menos vendido */}
              <Row className="mt-4">
                <Col md={6}>
                  <div className="text-muted small mb-2">
                    Top 3 Produtos Mais Vendidos
                  </div>
                  <Table hover size="sm" className="bg-white">
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
                <Col md={6} className="text-center d-flex flex-column justify-content-center">
                  <div className="text-muted small mb-1">Produto Menos Vendido</div>
                  <div className="fw-bold" style={{ fontSize: '20px' }}>
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