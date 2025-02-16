import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table } from 'react-bootstrap';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const OrderModal = ({ client, isOpen, onClose }) => {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [orderTotal, setOrderTotal] = useState(0);

  // Estados para forma de pagamento
  const [paymentMethod, setPaymentMethod] = useState('avista'); // 'avista' ou 'parcelado'
  // Armazena a opção selecionada para parcelamento (string que representa a chave do objeto abaixo)
  const [selectedSchedule, setSelectedSchedule] = useState('15/30/45/60/75');
  const [installmentDates, setInstallmentDates] = useState([]);

  // Opções de parcelamento: cada array representa os dias de vencimento de cada parcela
  const installmentOptions = {
    "15/30/45/60/75": [15, 30, 45, 60, 75],
    "20/40/60/80": [20, 40, 60, 80],
    "30/50/70": [30, 50, 70],
    "10/20/30/40/50/60/70/80/90/100": [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  };

  // Atualiza as datas das parcelas quando o método de pagamento ou a opção de parcelamento mudar
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

  // Função para fazer o parse dos produtos vindos da API
  const parseProducts = (data) => {
    const rows = data.values;
    let productsArr = [];
    let i = 0;
    while (i < rows.length) {
      const row = rows[i];
      // Se a linha tiver somente um item (título da seção) => pular
      if (row.length === 1) {
        i++;
        continue;
      }
      // Detecta a linha de cabeçalho
      if (row[0] === "CÓDIGO" || row[0] === "PRODUTO") {
        const header = row;
        let sectionType = null;
        // Identifica a seção pelo número de colunas
        if (header.length === 7) { 
          sectionType = "first";
        } else if (header.length === 9) {
          sectionType = "second";
        }
        i++; // pula a linha de cabeçalho
        // Enquanto não encontrar outra linha de título ou chegar ao fim
        while (i < rows.length && rows[i].length !== 1 && rows[i][0] !== "Rações Alipan") {
          const r = rows[i];
          if (sectionType === "first") {
            if (r.length >= 6 && r[0] !== "") {
              productsArr.push({
                id: r[0],
                name: r[1],
                // Preço da coluna "ATÉ 15 TON" (índice 5)
                price: parseFloat(r[5].replace(',', '.')),
              });
            }
          } else if (sectionType === "second") {
            if (r.length >= 8 && r[1] !== "") {
              productsArr.push({
                id: r[0] || null,
                name: r[1],
                // Preço da coluna "ATÉ 15 TON" (índice 7)
                price: parseFloat(r[7].replace(',', '.')),
              });
            }
          }
          i++;
        }
      } else {
        i++;
      }
    }
    return productsArr;
  };

  useEffect(() => {
    // Busca os produtos na API e faz o parse dos dados
    const fetchProducts = async () => {
      try {
        const response = await fetch('https://api-google-sheets-7zph.vercel.app/produtos_nutrimentos_adriel');
        const data = await response.json();
        const parsedProducts = parseProducts(data);
        setProducts(parsedProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const addProductToOrder = () => {
    setSelectedProducts([
      ...selectedProducts,
      {
        id: Date.now(),
        product: '',
        quantity: 0,
        unitPrice: 0,
        total: 0,
      },
    ]);
  };

  const updateProduct = (index, field, value) => {
    const updated = [...selectedProducts];
    updated[index][field] = value;

    if (field === 'product') {
      const selected = products.find(p => p.id === value);
      updated[index].unitPrice = selected?.price || 0;
    }

    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    }

    setSelectedProducts(updated);
    calculateOrderTotal(updated);
  };

  const calculateOrderTotal = (items) => {
    const total = items.reduce((sum, item) => sum + item.total, 0);
    setOrderTotal(total);
  };

  const removeProduct = (index) => {
    const updated = selectedProducts.filter((_, idx) => idx !== index);
    setSelectedProducts(updated);
    calculateOrderTotal(updated);
  };

  // Função que gera o PDF do pedido, incluindo os dados de pagamento
  const generatePDF = (orderData) => {
    const doc = new jsPDF();

    // Título do documento
    doc.setFontSize(18);
    doc.text('Pedido', 14, 22);

    // Informações do Cliente
    doc.setFontSize(12);
    doc.text(`Cliente: ${client.Cliente}`, 14, 32);
    doc.text(`CNPJ: ${client.CNPJ}`, 14, 40);
    doc.text(`Endereço: ${client.Endereco}`, 14, 48);
    doc.text(`Telefone: ${client.Telefone}`, 14, 56);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 64);

    // Informações de Pagamento
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

    // Linha divisória abaixo das informações de pagamento
    doc.line(14, paymentY, 196, paymentY);

    // Tabela de Produtos utilizando autoTable
    const tableColumn = ["Produto", "Quantidade", "Valor Unit.", "Total"];
    const tableRows = [];

    orderData.products.forEach(item => {
      const prodInfo = products.find(p => p.id === item.product);
      const prodName = prodInfo ? prodInfo.name : 'Não definido';
      const rowData = [
        prodName,
        item.quantity.toString(),
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

    // Salva o PDF
    doc.save('pedido.pdf');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const orderData = {
      clientId: client.id,
      products: selectedProducts,
      total: orderTotal,
      date: new Date().toISOString(),
      paymentMethod,
      installmentSchedule: paymentMethod === 'parcelado' ? selectedSchedule : null,
      installmentDates: paymentMethod === 'parcelado' ? installmentDates : [],
    };

    // Aqui você pode realizar o POST para salvar o pedido no backend, se necessário.
    // ...

    // Gera o PDF com as informações do pedido (incluindo pagamento)
    generatePDF(orderData);
    
    // Fecha o modal
    onClose();
  };

  return (
    <Modal show={isOpen} onHide={onClose} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>Novo Pedido</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          {/* Informações do Cliente */}
          <div className="mb-4">
            <Form.Group className="row mb-3">
              <div className="col-md-6">
                <Form.Label>Nome</Form.Label>
                <Form.Control type="text" value={client.Cliente} disabled />
              </div>
              <div className="col-md-6">
                <Form.Label>CNPJ</Form.Label>
                <Form.Control type="text" value={client.CNPJ} disabled />
              </div>
            </Form.Group>
            <Form.Group className="row">
              <div className="col-md-6">
                <Form.Label>Endereço</Form.Label>
                <Form.Control type="text" value={client.Endereco} disabled />
              </div>
              <div className="col-md-6">
                <Form.Label>Telefone</Form.Label>
                <Form.Control type="text" value={client.Telefone} disabled />
              </div>
            </Form.Group>
          </div>

          {/* Produtos */}
          <Table responsive striped bordered hover className="mb-4">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
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
                      {products.map((product, idx) => (
                        <option key={idx} value={product.id}>
                          {product.name} {product.price && `(R$ ${product.price.toFixed(2)})`}
                        </option>
                      ))}
                    </Form.Select>
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateProduct(index, 'quantity', parseFloat(e.target.value))}
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateProduct(index, 'unitPrice', parseFloat(e.target.value))}
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

          <Button variant="primary" onClick={addProductToOrder} className="mb-4">
            Adicionar Produto
          </Button>

          {/* Total do Pedido */}
          <div className="d-flex justify-content-between align-items-center mt-4">
            <div className="h4 mb-0">Total: R$ {orderTotal.toFixed(2)}</div>
          </div>

          {/* Opções de Pagamento */}
          <div className="mt-4">
            <Form.Group className="mb-3">
              <Form.Label>Forma de Pagamento</Form.Label>
              <div>
                <Form.Check
                  inline
                  type="radio"
                  label="À Vista"
                  name="paymentMethod"
                  value="avista"
                  checked={paymentMethod === 'avista'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <Form.Check
                  inline
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