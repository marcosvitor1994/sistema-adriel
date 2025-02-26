import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table, Card, Accordion } from 'react-bootstrap';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const OrderModal = ({ client, isOpen, onClose }) => {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderWeight, setOrderWeight] = useState(0); // Peso total do pedido (em kg)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Estados para forma de pagamento
  const [paymentMethod, setPaymentMethod] = useState('avista'); // 'avista' ou 'parcelado'
  const [selectedSchedule, setSelectedSchedule] = useState('15/30/45/60/75');
  const [installmentDates, setInstallmentDates] = useState([]);

  const [activeAccordion, setActiveAccordion] = useState(null);

  // Faixas para parcelamento
  const installmentOptions = {
    "15/30/45/60/75": [15, 30, 45, 60, 75],
    "20/40/60/80": [20, 40, 60, 80],
    "30/50/70": [30, 50, 70],
    "10/20/30/40/50/60/70/80/90/100": [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  };

  // Atualiza windowWidth
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Atualiza datas de parcelas
  useEffect(() => {
    if (paymentMethod === 'parcelado') {
      const now = new Date();
      const offsets = installmentOptions[selectedSchedule] || [];
      const dates = offsets.map(offset => {
        const dueDate = new Date(now.getTime() + offset * 24 * 3600 * 1000);
        return dueDate.toLocaleDateString();
      });
      setInstallmentDates(dates);
    } else {
      setInstallmentDates([]);
    }
  }, [paymentMethod, selectedSchedule]);

  // ----- PARSING DOS PRODUTOS -----

  // Parse dos produtos de nutrimentos
  const parseNutriments = (data) => {
    const rows = data.values;
    const parsed = [];
    // Pula cabeçalho
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 6) continue;
      parsed.push({
        id: `nut-${i}`, // id único
        name: row[0],
        type: row[1],
        kg: parseFloat(row[2].replace(',', '.')) || 0, // peso por unidade (kg)
        category: 'nutrimentos',
        tiers: [
          { threshold: 8, price: parseFloat(row[3].replace(',', '.')) || 0 },
          { threshold: 15, price: parseFloat(row[4].replace(',', '.')) || 0 },
          { threshold: Infinity, price: parseFloat(row[5].replace(',', '.')) || 0 },
        ],
      });
    }
    return parsed;
  };

  // Parse dos produtos de rações
  const parseRacoes = (data) => {
    const rows = data.values;
    const parsed = [];
    // Pula cabeçalho
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 9) continue;
      parsed.push({
        id: `rac-${i}`, // id único
        name: row[0],
        type: row[1],
        kg: parseFloat(row[2].replace(',', '.')) || 0, // peso por unidade (kg)
        category: 'racoes',
        tiers: [
          { threshold: 2, price: parseFloat(row[4].replace(',', '.')) || 0 },
          { threshold: 6, price: parseFloat(row[5].replace(',', '.')) || 0 },
          { threshold: 10, price: parseFloat(row[6].replace(',', '.')) || 0 },
          { threshold: 15, price: parseFloat(row[7].replace(',', '.')) || 0 },
          { threshold: Infinity, price: parseFloat(row[8].replace(',', '.')) || 0 },
        ],
      });
    }
    return parsed;
  };

  // Busca os produtos de ambas as rotas e mescla-os
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [nutResp, racResp] = await Promise.all([
          fetch('https://api-google-sheets-7zph.vercel.app/produtos_nutrimentos_adriel'),
          fetch('https://api-google-sheets-7zph.vercel.app/produtos_racoes_adriel')
        ]);
        const nutData = await nutResp.json();
        const racData = await racResp.json();
        const nutriments = parseNutriments(nutData);
        const racoes = parseRacoes(racData);
        setProducts([...nutriments, ...racoes]);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  // ----- CÁLCULO DO PREÇO E PESO -----

  // Dado um produto e o peso total do pedido (em toneladas), retorna o preço unitário do tier
  const computePrice = (product, orderWeightTon) => {
    if (!product || !product.tiers) return 0;
    for (let tier of product.tiers) {
      if (orderWeightTon <= tier.threshold) {
        return tier.price;
      }
    }
    return 0;
  };

  // Recalcula o pedido: total financeiro, peso total e, se o preço não for manual, recalcula o valor unitário.
  const recalcOrder = (updatedProducts) => {
    let totalKg = 0;
    // Calcula o peso total (em kg)
    updatedProducts.forEach(item => {
      const prod = products.find(p => p.id === item.product);
      if (prod && item.quantity) {
        totalKg += prod.kg * item.quantity;
      }
    });
    const orderWeightTon = totalKg / 1000;
    // Atualiza cada item: unitPrice (se não editado manualmente), total e peso da linha.
    const recalculated = updatedProducts.map(item => {
      const prod = products.find(p => p.id === item.product);
      if (prod && item.quantity) {
        const lineWeight = prod.kg * item.quantity;
        const newUnitPrice = item.manualPrice ? item.unitPrice : computePrice(prod, orderWeightTon);
        return {
          ...item,
          unitPrice: newUnitPrice,
          total: item.quantity * newUnitPrice,
          weight: lineWeight, // peso da linha (kg)
        };
      }
      return item;
    });
    const newOrderTotal = recalculated.reduce((sum, item) => sum + item.total, 0);
    setOrderTotal(newOrderTotal);
    setOrderWeight(totalKg);
    setSelectedProducts(recalculated);
  };

  // Atualiza um campo de uma linha do pedido
  const updateProduct = (index, field, value) => {
    const updated = [...selectedProducts];
    if (field === 'unitPrice') {
      updated[index][field] = value;
      updated[index]['manualPrice'] = true;
    } else {
      updated[index][field] = value;
      if (field === 'product' || field === 'quantity') {
        updated[index]['manualPrice'] = false;
      }
    }
    if (field === 'product') {
      updated[index].quantity = 0;
      updated[index].unitPrice = 0;
      updated[index].total = 0;
      updated[index].weight = 0;
    }
    recalcOrder(updated);
  };

  const addProductToOrder = () => {
    const newProducts = [
      ...selectedProducts,
      {
        id: Date.now(),
        product: '',
        quantity: 0,
        unitPrice: 0,
        total: 0,
        weight: 0,
        manualPrice: false,
      },
    ];
    setSelectedProducts(newProducts);
    // Define o índice do novo produto como ativo
    setActiveAccordion(String(newProducts.length - 1));
  };

  const removeProduct = (index) => {
    const updated = selectedProducts.filter((_, idx) => idx !== index);
    recalcOrder(updated);
  };

  // ----- GERAÇÃO E COMPARTILHAMENTO DO PDF -----
  const generateAndSharePDF = (orderData) => {
    const doc = new jsPDF();
  
    doc.setFontSize(18);
    doc.text('Pedido', 14, 22);
  
    doc.setFontSize(12);
    doc.text(`Cliente: ${client.Cliente}`, 14, 32);
    doc.text(`CNPJ: ${client.CNPJ}`, 14, 40);
    doc.text(`Endereço: ${client.Endereco}`, 14, 48);
    doc.text(`Telefone: ${client.Telefone}`, 14, 56);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 64);
  
    let paymentY = 72;
    doc.text(`Forma de Pagamento: ${paymentMethod === 'avista' ? 'À Vista' : 'Parcelado'}`, 14, paymentY);
    if (paymentMethod === 'parcelado') {
      doc.text(`Opção de Parcelamento: ${selectedSchedule}`, 14, paymentY + 8);
      installmentDates.forEach((date, index) => {
        doc.text(`Parcela ${index + 1} vence em: ${date}`, 14, paymentY + 16 + (index * 8));
      });
      paymentY += 16 + installmentDates.length * 8;
    } else {
      paymentY += 8;
    }
  
    const tableColumn = ["Produto", "Qtd", "Peso (kg)", "Valor Unit.", "Total"];
    const tableRows = [];
  
    orderData.products.forEach(item => {
      const prodInfo = products.find(p => p.id === item.product);
      const prodName = prodInfo ? prodInfo.name : 'Não definido';
      const rowData = [
        prodName,
        item.quantity.toString(),
        item.weight ? item.weight.toFixed(2) : '0',
        `R$ ${item.unitPrice.toFixed(2)}`,
        `R$ ${item.total.toFixed(2)}`
      ];
      tableRows.push(rowData);
    });
  
    doc.autoTable({
      startY: paymentY + 6,
      head: [tableColumn],
      body: tableRows,
    });
  
    const finalY = doc.lastAutoTable.finalY || paymentY + 6;
    doc.text(`Total do Pedido: R$ ${orderData.total.toFixed(2)}`, 14, finalY + 10);
    doc.text(`Peso Total: ${orderData.weight.toFixed(2)} kg`, 14, finalY + 18);
  
    // Gera o Blob do PDF e converte para File para a Web Share API
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], 'pedido.pdf', { type: 'application/pdf' });
    
    // Se o navegador suportar compartilhamento de arquivos
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      navigator.share({
        title: 'Pedido',
        text: `Segue o pedido de ${client.Cliente}`,
        files: [pdfFile],
      })
      .then(() => console.log('PDF compartilhado com sucesso!'))
      .catch((error) => console.error('Erro ao compartilhar o PDF:', error));
    } else {
      // Fallback: Download do PDF
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlob);
      link.download = 'pedido.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // ----- RENDERIZAÇÃO DOS ITENS (RESPONSIVA) -----
  const renderProductItems = () => {
    if (windowWidth < 768) {
      return (
        <Accordion activeKey={activeAccordion} className="mb-3" onSelect={(key) => setActiveAccordion(key)}>
          {selectedProducts.map((item, index) => (
            <Accordion.Item key={item.id} eventKey={String(index)}>
              <Accordion.Header>
                <div className="d-flex justify-content-between w-100 align-items-center pe-3">
                  <div>
                    {(() => {
                      const prod = products.find(p => p.id === item.product);
                      return prod 
                        ? `${prod.name} - ${item.quantity} unid.` 
                        : 'Produto não selecionado';
                    })()}
                  </div>
                  <div className="text-end text-muted">
                    R$ {item.total.toFixed(2)}
                  </div>
                </div>
              </Accordion.Header>
                <Accordion.Body>
                  <Form.Group className="mb-2">
                    <Form.Label>Produto</Form.Label>
                    <Form.Select
                      value={item.product}
                      onChange={(e) => {
                        e.stopPropagation(); // Evita que o evento de mudança afete o accordion
                        updateProduct(index, 'product', e.target.value);
                      }}
                    >
                      <option value="">Selecione um produto</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {product.kg}kg
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  
                  <Form.Group className="mb-2">
                    <Form.Label>Quantidade</Form.Label>
                    <Form.Control
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateProduct(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </Form.Group>
                  
                  <div className="mb-2">
                    <strong>Peso da Linha:</strong> {item.weight ? item.weight.toFixed(2) : '0'} kg
                  </div>
                  
                  <Form.Group className="mb-2">
                    <Form.Label>Valor Unitário</Form.Label>
                    <Form.Control
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateProduct(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                    <small className="text-muted">
                      (Calculado automaticamente, edite se necessário)
                    </small>
                  </Form.Group>
                  
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <div>
                      <strong>Total:</strong> R$ {item.total.toFixed(2)}
                    </div>
                    <Button variant="danger" size="sm" onClick={() => removeProduct(index)}>
                      Remover
                    </Button>
                  </div>
                </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      );
    } else {
      return (
        <Table responsive striped bordered hover className="mb-4">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd</th>
              <th>Peso (kg)</th>
              <th>Valor Unit.</th>
              <th>Total</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {selectedProducts.map((item, index) => (
              <tr key={item.id}>
                <td>
                  <Form.Select
                    value={item.product}
                    onChange={(e) => updateProduct(index, 'product', e.target.value)}
                  >
                    <option value="">Selecione um produto</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {product.kg}kg
                      </option>
                    ))}
                  </Form.Select>
                </td>
                <td>
                  <Form.Control
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateProduct(index, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td>{item.weight ? item.weight.toFixed(2) : '0'}</td>
                <td>
                  <Form.Control
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateProduct(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td>R$ {item.total.toFixed(2)}</td>
                <td>
                  <Button variant="danger" size="sm" onClick={() => removeProduct(index)}>
                    Remover
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const orderData = {
      clientId: client.id,
      products: selectedProducts,
      total: orderTotal,
      weight: orderWeight, // peso total em kg
      date: new Date().toISOString(),
      paymentMethod,
      installmentSchedule: paymentMethod === 'parcelado' ? selectedSchedule : null,
      installmentDates: paymentMethod === 'parcelado' ? installmentDates : [],
    };

    // Gera e compartilha (ou baixa) o PDF com os dados do pedido
    generateAndSharePDF(orderData);
    onClose();
  };

  return (
    <Modal show={isOpen} onHide={onClose} size="xl" className="order-modal">
      <Modal.Header closeButton>
        <Modal.Title>Novo Pedido</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          {/* Informações do Cliente */}
          <div className="mb-4">
            <h5 className="mb-3">Informações do Cliente</h5>
            <Form.Group className="mb-3">
              <Form.Label>Nome</Form.Label>
              <Form.Control type="text" value={client.Cliente} disabled />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>CNPJ</Form.Label>
              <Form.Control type="text" value={client.CNPJ} disabled />
            </Form.Group>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Endereço</Form.Label>
                  <Form.Control type="text" value={client.Endereco} disabled />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Telefone</Form.Label>
                  <Form.Control type="text" value={client.Telefone} disabled />
                </Form.Group>
              </div>
            </div>
          </div>

          {/* Produtos */}
          <h5 className="mb-3">Produtos</h5>
          {renderProductItems()}
          <Button variant="primary" onClick={addProductToOrder} className="mb-4 mt-2">
            Adicionar Produto
          </Button>

          {/* Totais do Pedido */}
          <div className="d-flex justify-content-between align-items-center mt-4">
            <div className="h4 mb-0">Total: R$ {orderTotal.toFixed(2)}</div>
            <div className="h5 mb-0">Peso Total: {orderWeight.toFixed(2)} kg</div>
          </div>

          {/* Opções de Pagamento */}
          <div className="mt-4">
            <h5 className="mb-3">Forma de Pagamento</h5>
            <Form.Group className="mb-3">
              <div>
                <Form.Check
                  className="mb-2"
                  type="radio"
                  label="À Vista"
                  name="paymentMethod"
                  value="avista"
                  checked={paymentMethod === 'avista'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <Form.Check
                  type="radio"
                  label="Parcelado"
                  name="paymentMethod"
                  value="parcelado"
                  checked={paymentMethod === 'parcelado'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
              </div>
            </Form.Group>
            {paymentMethod === 'parcelado' && (
              <Form.Group className="mb-3">
                <Form.Label>Opção de Parcelamento</Form.Label>
                <Form.Select
                  value={selectedSchedule}
                  onChange={(e) => setSelectedSchedule(e.target.value)}
                >
                  {Object.keys(installmentOptions).map((option, idx) => (
                    <option key={idx} value={option}>
                      {option}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}
          </div>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={handleSubmit}>Salvar Pedido</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OrderModal;