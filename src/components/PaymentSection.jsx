import React from 'react';
import { Form } from 'react-bootstrap';

const PaymentSection = ({ 
  paymentMethod, 
  setPaymentMethod, 
  selectedSchedule, 
  setSelectedSchedule, 
  installmentOptions 
}) => {
  return (
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
  );
};

export default PaymentSection;