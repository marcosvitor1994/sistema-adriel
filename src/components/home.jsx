import axios from "axios";
import React, { useEffect, useState } from "react";
import { Accordion, Container, Row, Col, Table, Button, Form, Modal, Spinner, Alert } from "react-bootstrap";
import OrderModal from "./OrderModal";
import PerfilVendedor from "./PerfilVendedor";

const Home = () => {
  const [clients, setClients] = useState([]);
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleClients, setVisibleClients] = useState(10);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientesRes, historicoRes] = await Promise.all([
          axios.get("https://api-google-sheets-7zph.vercel.app/clientes_adriel"),
          axios.get("https://api-google-sheets-7zph.vercel.app/historico_clientes_adriel"),
        ]);

        setClients(parseData(clientesRes.data.values));
        setHistory(parseData(historicoRes.data.values));
      } catch (error) {
        console.error("Erro ao buscar os dados:", error);
      }
    };

    fetchData();
  }, []);

  const parseData = (data) => {
    const [header, ...rows] = data;
    return rows.map((row) => Object.fromEntries(header.map((key, index) => [key, row[index]])));
  };

  const handleOpenUploadModal = () => {
    setIsUploadModalOpen(true);
    setUploadMessage(null); // Reseta a mensagem ao abrir o modal
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    setLoading(false);
    setUploadMessage(null);
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Selecione um arquivo PDF!");
      return;
    }

    setLoading(true);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post("https://hs67sbxkkfvfn2m5xfm3ayuoci0qbupx.lambda-url.us-east-2.on.aws/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Resposta da API:", response.data);
      setUploadMessage({ type: "success", text: "Arquivo processado com sucesso!" });
    } catch (error) {
      console.error("Erro ao enviar o arquivo:", error);
      setUploadMessage({ type: "danger", text: "Erro ao processar o arquivo. Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-4">
      <PerfilVendedor data={history} />

      <h2 className="mb-4">Clientes</h2>

      {/* Botão para abrir o modal de upload */}
      <Button variant="primary" className="mb-3" onClick={handleOpenUploadModal}>
        Enviar PDF
      </Button>

      <Form.Group className="mb-3">
        <Form.Control
          type="text"
          placeholder="Pesquisar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Form.Group>

      {/* Modal de Upload */}
      <Modal show={isUploadModalOpen} onHide={handleCloseUploadModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Upload de Pedido (PDF)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Control type="file" accept="application/pdf" onChange={handleFileChange} />
          </Form.Group>
          <Button onClick={handleUpload} disabled={loading} className="w-100">
            {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : "Enviar PDF"}
          </Button>

          {uploadMessage && (
            <Alert variant={uploadMessage.type} className="mt-3">
              {uploadMessage.text}
            </Alert>
          )}
        </Modal.Body>
      </Modal>

      {/* Lista de clientes */}
      <Accordion>
        {clients.slice(0, visibleClients).map((client, idx) => (
          <Accordion.Item eventKey={idx.toString()} key={client["Código"]}>
            <Accordion.Header>
              {client["Cliente"]} - {client["Fantasia"]}
            </Accordion.Header>
            <Accordion.Body>
              <Row className="mb-3">
                <Col md={4}><strong>Código:</strong> {client["Código"]}</Col>
                <Col md={4}><strong>CNPJ:</strong> {client["CNPJ"]}</Col>
                <Col md={4}><strong>Telefone:</strong> {client["Telefone"]}</Col>
              </Row>
              <Button onClick={() => { setSelectedClient(client); setIsOrderModalOpen(true); }}>
                Novo Pedido
              </Button>
            </Accordion.Body>
          </Accordion.Item>
        ))}
      </Accordion>

      {visibleClients < clients.length && (
        <div className="mt-3 text-center">
          <Button onClick={() => setVisibleClients((prev) => prev + 10)}>Carregar mais</Button>
        </div>
      )}

      {selectedClient && (
        <OrderModal client={selectedClient} isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} />
      )}
    </Container>
  );
};

export default Home;