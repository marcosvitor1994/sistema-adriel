import React from 'react';
import { Table, Form, Button, Accordion } from 'react-bootstrap';

const ProductsSection = ({ 
  products, 
  selectedProducts, 
  windowWidth, 
  activeAccordion, 
  setActiveAccordion, 
  updateProduct, 
  removeProduct, 
  addProductToOrder, 
  orderTotal, 
  orderWeight 
}) => {
  // Renderização dos itens (responsiva)
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
                      e.stopPropagation();
                      updateProduct(index, 'product', e.target.value);
                    }}
                    className="striped-options"
                  >
                    <option value="">Selecione um produto</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {product.type} - {product.kg}kg
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
                  className="striped-options"
                >
                  <option value="">Selecione um produto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.type} - {product.kg}kg
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

  return (
    <div className="mb-4">
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
    </div>
  );
};

export default ProductsSection;