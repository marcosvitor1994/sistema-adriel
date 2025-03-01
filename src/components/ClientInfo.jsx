import React from 'react';
import { Form } from 'react-bootstrap';

const ClientInfo = ({ client }) => {
  return (
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
  );
};

export default ClientInfo;