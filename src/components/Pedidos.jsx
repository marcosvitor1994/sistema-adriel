import React, { useEffect, useState } from "react";
import { Accordion, Card, Button, ListGroup, Spinner, Badge, Container, Row, Col } from "react-bootstrap";
import OrderModal from "./OrderModal";

const Pedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://y-liard-eight.vercel.app/pedidos");
      const data = await response.json();
      if (!data.error) {
        const pedidosAguardando = data.pedidos.filter(pedido => pedido.status === "Aguardando");
        setPedidos(pedidosAguardando);
      }
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`https://y-liard-eight.vercel.app/pedido/${id}`, { method: "DELETE" });
      setPedidos(pedidos.filter((pedido) => pedido._id !== id));
    } catch (error) {
      console.error("Erro ao deletar pedido:", error);
    }
  };

  const handleValidate = async (id) => {
    try {
      const pedido = pedidos.find(p => p._id === id);
      if (pedido) {
        const updatedPedido = { 
          ...pedido, 
          status: "Validado"
        };
        
        await fetch(`https://y-liard-eight.vercel.app/pedido/${id}`, {
          method: "PUT",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedPedido)
        });
        
        setPedidos(pedidos.filter(p => p._id !== id));
      }
    } catch (error) {
      console.error("Erro ao validar pedido:", error);
    }
  };

  const handleEdit = (pedido) => {
    const clientData = {
      Cliente: pedido.cliente,
      CNPJ: pedido.cnpj,
      Endereco: pedido.endereco,
      Telefone: pedido.telefone
    };
    
    setSelectedPedido({
      client: clientData,
      pedidoData: pedido
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPedido(null);
    setEditMode(false);
  };

  const handleUpdatePedido = async (updatedPedido) => {
    try {
      const response = await fetch(`https://y-liard-eight.vercel.app/pedido/${updatedPedido._id}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedPedido)
      });
      
      if (response.ok) {
        fetchPedidos();
        setShowModal(false);
      } else {
        throw new Error('Falha ao atualizar o pedido');
      }
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Container className="py-4">
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <h2 className="mb-0 h5">Lista de Pedidos Aguardando</h2>
          <Button variant="outline-light" onClick={() => fetchPedidos()} size="sm">
            <i className="bi bi-arrow-clockwise me-1"></i> Atualizar
          </Button>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" variant="primary">
                <span className="visually-hidden">Carregando...</span>
              </Spinner>
              <p className="mt-3">Carregando pedidos...</p>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox fs-1 text-muted"></i>
              <p className="mt-3">Nenhum pedido aguardando aprovação.</p>
            </div>
          ) : (
            <Accordion className="shadow-sm">
              {pedidos.map((pedido, index) => (
                <Accordion.Item eventKey={index.toString()} key={pedido._id} className="border-0 mb-3">
                  <Accordion.Header className="rounded">
                    <div className="w-100">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div>
                          <strong className="text-primary">{pedido.cliente}</strong>
                          <Badge bg="warning" className="ms-2">Aguardando</Badge>
                        </div>
                        <span className="text-success">R$ {pedido.total.toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center small text-muted">
                        <span><i className="bi bi-box me-1"></i>{pedido.pesoTotal.toFixed(2)} kg</span>
                        <span><i className="bi bi-calendar-date me-1"></i>{formatDate(pedido.data)}</span>
                      </div>
                    </div>
                  </Accordion.Header>
                  <Accordion.Body className="bg-light p-2">
                    <Card className="border-0 shadow-sm">
                      <Card.Body>
                        {/* Produtos - Sempre visíveis e bem distribuídos */}
                        <div className="mb-3">
                          <h5 className="d-flex align-items-center mb-3">
                            <i className="bi bi-box-seam me-2"></i>
                            Produtos
                          </h5>
                          <div className="list-group">
                            {pedido.produtos.map((produto, idx) => (
                              <div key={idx} className="list-group-item p-2">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <div className="fw-bold">
                                    <span className="badge bg-secondary me-2">{produto.quantidade}x</span>
                                    {produto.produto}
                                  </div>
                                </div>
                                <div className="d-flex justify-content-between align-items-center small">
                                  {produto.peso && (
                                    <span className="text-muted">
                                      <i className="bi bi-box me-1"></i>
                                      {produto.peso.toFixed(2)} kg
                                    </span>
                                  )}
                                  <span className="text-success">
                                    <i className="bi bi-currency-dollar me-1"></i>
                                    R$ {produto.valorUnidade.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Accordion para Informações de Cliente e Pagamento */}
                        <Accordion className="mb-3">
                          <Accordion.Item eventKey="0" className="border-0">
                            <Accordion.Header className="bg-light rounded">
                              <span><i className="bi bi-info-circle me-2"></i>Detalhes do Pedido</span>
                            </Accordion.Header>
                            <Accordion.Body className="p-2">
                              <Row>
                                <Col xs={12} className="mb-3">
                                  <Card className="border-0 shadow-sm h-100">
                                    <Card.Header className="bg-light py-2">
                                      <h6 className="mb-0">
                                        <i className="bi bi-person me-2"></i>
                                        Informações do Cliente
                                      </h6>
                                    </Card.Header>
                                    <Card.Body className="py-2">
                                      <p className="mb-1"><strong>Cliente:</strong> {pedido.cliente}</p>
                                      {pedido.cnpj && <p className="mb-1"><strong>CNPJ:</strong> {pedido.cnpj}</p>}
                                      <p className="mb-1"><strong>Endereço:</strong> {pedido.endereco}</p>
                                      <p className="mb-1"><strong>Telefone:</strong> {pedido.telefone}</p>
                                    </Card.Body>
                                  </Card>
                                </Col>
                                <Col xs={12}>
                                  <Card className="border-0 shadow-sm h-100">
                                    <Card.Header className="bg-light py-2">
                                      <h6 className="mb-0">
                                        <i className="bi bi-cash-coin me-2"></i>
                                        Informações de Pagamento
                                      </h6>
                                    </Card.Header>
                                    <Card.Body className="py-2">
                                      <p className="mb-1"><strong>Total:</strong> R$ {pedido.total.toFixed(2)}</p>
                                      <p className="mb-1"><strong>Parcelamento:</strong> {pedido.parcelamento || "À vista"}</p>
                                      <p className="mb-1"><strong>Peso Total:</strong> {pedido.pesoTotal.toFixed(2)} kg</p>
                                    </Card.Body>
                                  </Card>
                                </Col>
                              </Row>
                            </Accordion.Body>
                          </Accordion.Item>
                        </Accordion>

                        {/* Botões de ação dentro do Card e responsivos */}
                        <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                          <Button 
                            variant="outline-warning" 
                            onClick={() => handleEdit(pedido)}
                            className="w-100 w-md-auto"
                            size="sm"
                          >
                            <i className="bi bi-pencil me-1"></i> Editar
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            onClick={() => handleDelete(pedido._id)}
                            className="w-100 w-md-auto"
                            size="sm"
                          >
                            <i className="bi bi-trash me-1"></i> Deletar
                          </Button>
                          <Button 
                            variant="outline-success" 
                            onClick={() => handleValidate(pedido._id)}
                            className="w-100 w-md-auto"
                            size="sm"
                          >
                            <i className="bi bi-check-circle me-1"></i> Validar
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </Card.Body>
      </Card>

      {showModal && selectedPedido && (
        <OrderModal 
          client={selectedPedido.client}
          isOpen={showModal}
          onClose={handleCloseModal}
          editMode={editMode}
          pedidoData={selectedPedido.pedidoData}
          onUpdate={handleUpdatePedido}
        />
      )}
    </Container>
  );
};

export default Pedidos;