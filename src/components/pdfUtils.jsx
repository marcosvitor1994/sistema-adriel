import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generatePDF = (orderData) => {
  const doc = new jsPDF();

  // Formatando a data para usar no nome do arquivo
  const today = new Date();
  const formattedDate = today.toLocaleDateString('pt-BR').replace(/\//g, '-');
  
  // Criando um nome de arquivo baseado no cliente e na data
  const fileName = `Pedido_${orderData.cliente.replace(/\s+/g, '_')}_${formattedDate}.pdf`;

  doc.setFontSize(18);
  doc.text('Pedido', 14, 22);

  doc.setFontSize(12);
  doc.text(`Cliente: ${orderData.cliente}`, 14, 32);
  doc.text(`CNPJ: ${orderData.cnpj}`, 14, 40);
  doc.text(`Endereço: ${orderData.endereco}`, 14, 48);
  doc.text(`Telefone: ${orderData.telefone}`, 14, 56);
  doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 64);

  let paymentY = 72;
  const paymentType = orderData.parcelamento ? 'Parcelado' : 'À Vista';
  doc.text(`Forma de Pagamento: ${paymentType}`, 14, paymentY);
  
  if (orderData.parcelamento) {
    doc.text(`Opção de Parcelamento: ${orderData.parcelamento}`, 14, paymentY + 8);
    
    // Calcular datas das parcelas
    const now = new Date();
    const offsets = orderData.parcelamento.split('/').map(Number);
    
    offsets.forEach((offset, index) => {
      const dueDate = new Date(now.getTime() + offset * 24 * 3600 * 1000);
      doc.text(`Parcela ${index + 1} vence em: ${dueDate.toLocaleDateString()}`, 14, paymentY + 16 + (index * 8));
    });
    
    paymentY += 16 + offsets.length * 8;
  } else {
    paymentY += 8;
  }

  const tableColumn = ["Produto", "Qtd", "Peso (kg)", "Valor Unit.", "Total"];
  const tableRows = [];

  orderData.produtos.forEach(item => {
    const rowData = [
      item.produto,
      item.quantidade.toString(),
      item.peso ? item.peso.toFixed(2) : '0',
      `R$ ${item.valorUnidade.toFixed(2)}`,
      `R$ ${item.subtotal.toFixed(2)}`
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
  doc.text(`Peso Total: ${orderData.pesoTotal.toFixed(2)} kg`, 14, finalY + 18);

  // Gera o Blob do PDF e converte para File para a Web Share API
  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
  
  // Se o navegador suportar compartilhamento de arquivos
  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    navigator.share({
      title: 'Pedido',
      text: `Segue o pedido de ${orderData.cliente}`,
      files: [pdfFile],
    })
    .then(() => console.log('PDF compartilhado com sucesso!'))
    .catch((error) => console.error('Erro ao compartilhar o PDF:', error));
  } else {
    // Fallback: Download do PDF
    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};