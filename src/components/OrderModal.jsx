import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import ClientInfo from './ClientInfo';
import ProductsSection from './ProductsSection';
import PaymentSection from './PaymentSection';
import { generatePDF } from './pdfUtils';

const OrderModal = ({ client, isOpen, onClose, editMode = false, pedidoData = null, onUpdate = null }) => {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderWeight, setOrderWeight] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [paymentMethod, setPaymentMethod] = useState('avista');
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

  // Carrega os dados do pedido se estiver em modo de edição
  useEffect(() => {
    if (editMode && pedidoData && products.length > 0) {
      // Define o método de pagamento
      setPaymentMethod(pedidoData.parcelamento ? 'parcelado' : 'avista');
      
      if (pedidoData.parcelamento) {
        setSelectedSchedule(pedidoData.parcelamento);
      }

      // Mapeia os produtos existentes para o formato esperado pelo componente
      const mappedProducts = pedidoData.produtos.map((prod, index) => {
        const productId = findProductIdByName(prod.produto);
        const foundProduct = products.find(p => p.id === productId);
        
        return {
          id: Date.now() + index,
          product: productId || '',
          quantity: prod.quantidade,
          unitPrice: prod.valorUnidade,
          total: prod.subtotal || (prod.quantidade * prod.valorUnidade),
          weight: prod.peso || (foundProduct ? foundProduct.kg * prod.quantidade : 0),
          manualPrice: true, // Assumimos que o preço foi ajustado manualmente
        };
      });

      setSelectedProducts(mappedProducts);
      setOrderTotal(pedidoData.total);
      setOrderWeight(pedidoData.pesoTotal);
    }
  }, [editMode, pedidoData, products]);

  // Encontra o ID do produto pelo nome
  const findProductIdByName = (productName) => {
    const product = products.find(p => p.name === productName);
    return product ? product.id : null;
  };

  // Busca os produtos
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

  // Parse dos produtos de nutrimentos
  const parseNutriments = (data) => {
    const rows = data.values;
    const parsed = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 6) continue;
      parsed.push({
        id: `nut-${i}`,
        name: row[0],
        type: row[1],
        kg: parseFloat(row[2].replace(',', '.')) || 0,
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
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 9) continue;
      parsed.push({
        id: `rac-${i}`,
        name: row[0],
        type: row[1],
        kg: parseFloat(row[2].replace(',', '.')) || 0,
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

  // Recalcula o pedido: total financeiro, peso total e preços unitários
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
    // Atualiza cada item
    const recalculated = updatedProducts.map(item => {
      const prod = products.find(p => p.id === item.product);
      if (prod && item.quantity) {
        const lineWeight = prod.kg * item.quantity;
        const newUnitPrice = item.manualPrice ? item.unitPrice : computePrice(prod, orderWeightTon);
        return {
          ...item,
          unitPrice: newUnitPrice,
          total: item.quantity * newUnitPrice,
          weight: lineWeight,
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
    setActiveAccordion(String(newProducts.length - 1));
  };

  const removeProduct = (index) => {
    const updated = selectedProducts.filter((_, idx) => idx !== index);
    recalcOrder(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Mapeia os produtos para o formato esperado pelo banco de dados
    const produtos = selectedProducts.map(item => {
      const prod = products.find(p => p.id === item.product);
      return {
        produto: prod ? prod.name : 'Não definido',
        quantidade: item.quantity,
        peso: item.weight,
        valorUnidade: item.unitPrice,
        subtotal: item.total,
      };
    });
  
    const orderData = {
      cliente: client.Cliente,
      cnpj: client.CNPJ,
      endereco: client.Endereco,
      telefone: client.Telefone,
      data: new Date().toISOString(),
      produtos: produtos,
      parcelamento: paymentMethod === 'parcelado' ? selectedSchedule : '',
      total: orderTotal,
      pesoTotal: orderWeight,
      status: editMode && pedidoData ? pedidoData.status : "Aguardando" // Define o status como "Aguardando" para novos pedidos
    };
  
    if (editMode && pedidoData) {
      // Estamos editando um pedido existente
      const updatedPedido = {
        ...pedidoData,
        ...orderData
      };
      
      if (onUpdate) {
        onUpdate(updatedPedido);
      }
      
      // Gera e compartilha o PDF com os dados do pedido atualizado
      generatePDF(orderData);
    } else {
      // Estamos criando um novo pedido
      try {
        const response = await fetch('https://y-liard-eight.vercel.app/pedido', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderData)
        });
    
        if (!response.ok) {
          throw new Error('Erro ao salvar o pedido no banco de dados');
        }
      } catch (error) {
        console.error(error);
      }
    
      // Gera e compartilha o PDF com os dados do pedido
      generatePDF(orderData);
    }
    
    onClose();
  };

  return (
    <Modal show={isOpen} onHide={onClose} size="xl" className="order-modal">
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>{editMode ? 'Editar Pedido' : 'Novo Pedido'}</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Form>
          {/* Informações do Cliente */}
          <ClientInfo client={client} />

          {/* Produtos */}
          <ProductsSection 
            products={products}
            selectedProducts={selectedProducts}
            windowWidth={windowWidth}
            activeAccordion={activeAccordion}
            setActiveAccordion={setActiveAccordion}
            updateProduct={updateProduct}
            removeProduct={removeProduct}
            addProductToOrder={addProductToOrder}
            orderTotal={orderTotal}
            orderWeight={orderWeight}
          />

          {/* Opções de Pagamento */}
          <PaymentSection 
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            selectedSchedule={selectedSchedule}
            setSelectedSchedule={setSelectedSchedule}
            installmentOptions={installmentOptions}
          />
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" type="submit" onClick={handleSubmit}>
          {editMode ? 'Atualizar Pedido' : 'Salvar Pedido'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OrderModal;