const ExcelJS = require("exceljs");
const fs = require("fs");

const inputFile = "./pipeline/leads.json";
const outputFile = "./pipeline/leads.xlsx";

async function main() {
  console.log("Reading leads...");
  const leads = JSON.parse(fs.readFileSync(inputFile, "utf8"));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sales Pipeline";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Leads", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  // Define columns
  sheet.columns = [
    { header: "ID", key: "id", width: 18 },
    { header: "Name", key: "name", width: 35 },
    { header: "Company", key: "company", width: 35 },
    { header: "Original Title", key: "title", width: 60 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 25;

  // Add data rows
  leads.forEach((lead, index) => {
    const row = sheet.addRow({
      id: lead.id,
      name: lead.name || "",
      company: lead.company || "",
      title: lead.title,
    });

    // Alternate row colors
    if (index % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2F2F2" },
      };
    }

    row.alignment = { vertical: "middle", wrapText: true };
    row.height = 20;
  });

  // Add borders to all cells
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9D9D9" } },
        left: { style: "thin", color: { argb: "FFD9D9D9" } },
        bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
        right: { style: "thin", color: { argb: "FFD9D9D9" } },
      };
    });
  });

  // Enable auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: leads.length + 1, column: 4 },
  };

  await workbook.xlsx.writeFile(outputFile);
  console.log(`Generated ${outputFile} with ${leads.length} leads`);
}

main().catch(console.error);
