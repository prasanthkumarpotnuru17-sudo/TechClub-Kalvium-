/**
 * Export data array to CSV file download in browser
 */
export function exportToCSV<T extends Record<string, any>>(data: T[], filename: string) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Add header line
  csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","));

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header] ?? "";
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data array to Excel (.xls) file download in browser using clean XML format
 */
export function exportToExcel<T extends Record<string, any>>(data: T[], filename: string) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);

  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#2563EB" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Sheet1">
    <Table>
`;

  // Headers
  xml += '      <Row ss:StyleID="Header">\n';
  headers.forEach((h) => {
    xml += `        <Cell><Data ss:Type="String">${h}</Data></Cell>\n`;
  });
  xml += "      </Row>\n";

  // Data
  data.forEach((row) => {
    xml += "      <Row>\n";
    headers.forEach((h) => {
      const val = row[h] !== null && row[h] !== undefined ? String(row[h]) : "";
      xml += `        <Cell><Data ss:Type="String">${val.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Data></Cell>\n`;
    });
    xml += "      </Row>\n";
  });

  xml += `    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
