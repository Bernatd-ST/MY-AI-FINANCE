const ExcelJS = require('exceljs');
const Transaction = require('../../models/Transaction.model');
const dayjs = require('dayjs');

const generateExcelReport = async (req, res) => {
  try {
    const { email, startDate, endDate } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email diperlukan' });
    }

    const filter = { email };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = dayjs(startDate).startOf('day').toDate();
      if (endDate) filter.date.$lte = dayjs(endDate).endOf('day').toDate();
    }

    const transactions = await Transaction.find(filter).sort({ date: 'asc' }).lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AI Financial Assistant';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Laporan Transaksi');

    // 1. Judul Utama
    worksheet.mergeCells('A1:D1');
    const title = worksheet.getCell('A1');
    title.value = 'Laporan Transaksi Keuangan';
    title.font = { name: 'Calibri', size: 18, bold: true };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    // 2. Informasi Laporan
    worksheet.mergeCells('A2:D2');
    const reportInfo = worksheet.getCell('A2');
    const period = startDate && endDate ? `${dayjs(startDate).format('DD MMM YYYY')} - ${dayjs(endDate).format('DD MMM YYYY')}` : 'Semua Transaksi';
    reportInfo.value = `Periode: ${period} | Akun: ${email}`;
    reportInfo.font = { name: 'Calibri', size: 10, italic: true };
    reportInfo.alignment = { horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    // Baris kosong sebagai pemisah
    worksheet.addRow([]);

    // 3. Header Tabel
    const headerRow = worksheet.addRow(['Tanggal', 'Merchant', 'Kategori', 'Nominal']);
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } }; // Biru
      cell.alignment = { horizontal: 'center' };
      cell.border = { 
        top: { style: 'thin' }, 
        left: { style: 'thin' }, 
        bottom: { style: 'thin' }, 
        right: { style: 'thin' } 
      };
    });

    // 4. Isi Data Transaksi
    let totalSpending = 0;
    transactions.forEach(t => {
      const row = worksheet.addRow([
        dayjs(t.date).format('DD MMM YYYY'),
        t.receiver,
        t.category || 'Lainnya', // Tambahkan kategori jika ada
        t.amount
      ]);
      const amountCell = row.getCell(4);
      amountCell.numFmt = '"Rp"#,##0;[Red]"-Rp"#,##0';
      amountCell.alignment = { horizontal: 'right' };
      totalSpending += t.amount;
    });

    // 5. Baris Total
    worksheet.addRow([]); // Baris pemisah
    const footerRow = worksheet.addRow(['', '', 'Total Pengeluaran', totalSpending]);
    const totalLabelCell = footerRow.getCell(3);
    totalLabelCell.font = { name: 'Calibri', bold: true, size: 12 };
    totalLabelCell.alignment = { horizontal: 'right' };
    const totalValueCell = footerRow.getCell(4);
    totalValueCell.font = { name: 'Calibri', bold: true, size: 12 };
    totalValueCell.numFmt = '"Rp"#,##0;[Red]"-Rp"#,##0';
    totalValueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }; // Abu-abu muda

    // 6. Auto-fit Lebar Kolom
    worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
            let columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength < 15 ? 15 : maxLength + 2;
    });

    // Kirim file ke client
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Laporan Keuangan - ${email}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error generating Excel report:', error);
    res.status(500).json({ success: false, error: 'Gagal membuat laporan Excel.' });
  }
};

module.exports = { generateExcelReport };
