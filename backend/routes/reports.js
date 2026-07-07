const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const authMiddleware = require("../middleware/auth");
const authorizeRoles = require("../middleware/roleMiddleware");
const User = require("../models/users");



// GET /api/reports - liste paginée de tous les bilans
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const db = mongoose.connection.db;
    const reportsCollection = db.collection("reports");

    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      reportsCollection
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .toArray(),
      reportsCollection.countDocuments({}),
    ]);

    res.json({ total, page: Number(page), limit: Number(limit), results: reports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/reports/:id - supprime un bilan
router.delete("/:id", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const reportsCollection = db.collection("reports");

    const result = await reportsCollection.deleteOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Bilan non trouvé" });
    }

    res.json({ message: "Bilan supprimé", id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// GET /api/reports/:id/export/pdf
router.get("/:id/export/pdf", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const report = await db.collection("reports").findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!report) return res.status(404).json({ error: "Rapport non trouvé" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="bilan-${report.name.replace(/[^a-z0-9]/gi, "_")}.pdf"`
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // En-tête
    doc.fontSize(20).fillColor("#6d5ef0").text("Bilan de Prospection", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#888").text(`Généré le ${new Date(report.createdAt).toLocaleDateString("fr-BE")}`);
    doc.moveDown(1.5);

    // Entreprise
doc.fontSize(16).fillColor("#000").text(report.name);
doc.fontSize(10).fillColor("#555").text(report.category);
doc.moveDown(0.5);

const address = [
  report.address?.street,
  report.address?.housenumber,
  report.address?.postcode,
  report.address?.city,
].filter(Boolean).join(", ");
if (address) doc.fontSize(10).fillColor("#555").text(`Adresse : ${address}`);

doc.moveDown(0.5);
if (report.phone) doc.text(`Tel : ${report.phone}`);
if (report.email) doc.text(`Email : ${report.email}`);
if (report.website) doc.text(`Site web : ${report.website}`);

doc.moveDown(1);

// Score
doc.fontSize(14).fillColor("#6d5ef0").text(`Score de prospection : ${report.score}/100`);
doc.fontSize(10).fillColor("#555").text(`Presence digitale : ${report.presence_digitale}`);
doc.moveDown(1);

// Analyse
doc.fontSize(12).fillColor("#000").text("Analyse IA", { underline: true });
doc.moveDown(0.3);
doc.fontSize(10).fillColor("#333").text(report.analyse || "", { align: "justify" });
doc.moveDown(1);

// Forces / Faiblesses
doc.fontSize(12).fillColor("#10b981").text("Forces", { underline: true });
doc.moveDown(0.3);
(report.forces || []).forEach((f) => doc.fontSize(10).fillColor("#333").text(`+ ${f}`));
doc.moveDown(0.8);

doc.fontSize(12).fillColor("#ef4444").text("Faiblesses", { underline: true });
doc.moveDown(0.3);
(report.faiblesses || []).forEach((f) => doc.fontSize(10).fillColor("#333").text(`- ${f}`));
doc.moveDown(1);

// Argumentaire
doc.fontSize(12).fillColor("#000").text("Argumentaire commercial", { underline: true });
doc.moveDown(0.3);
doc.fontSize(10).fillColor("#333").text(report.argumentaire || "", { align: "justify" });

// Sources web
if (report.web_sources && report.web_sources.length > 0) {
  doc.moveDown(1);
  doc.fontSize(12).fillColor("#000").text("Sources web", { underline: true });
  doc.moveDown(0.3);
  report.web_sources.forEach((s) => {
    doc.fontSize(9).fillColor("#6d5ef0").text(s.title, { link: s.url });
    doc.fontSize(8).fillColor("#888").text(s.snippet);
    doc.moveDown(0.3);
  });
}

    doc.end();
  } catch (error) {
    console.error("Erreur export PDF:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/:id/export/excel
router.get("/:id/export/excel", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const report = await db.collection("reports").findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!report) return res.status(404).json({ error: "Rapport non trouvé" });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bilan");

    sheet.columns = [
      { header: "Champ", key: "field", width: 25 },
      { header: "Valeur", key: "value", width: 70 },
    ];

    sheet.addRows([
      { field: "Entreprise", value: report.name },
      { field: "Secteur", value: report.category },
      { field: "Adresse", value: [report.address?.street, report.address?.postcode, report.address?.city].filter(Boolean).join(", ") },
      { field: "Téléphone", value: report.phone || "—" },
      { field: "Email", value: report.email || "—" },
      { field: "Site web", value: report.website || "—" },
      { field: "Source", value: report.source },
      { field: "Score de prospection", value: `${report.score}/100` },
      { field: "Présence digitale", value: report.presence_digitale },
      { field: "Analyse IA", value: report.analyse },
      { field: "Forces", value: (report.forces || []).join(" | ") },
      { field: "Faiblesses", value: (report.faiblesses || []).join(" | ") },
      { field: "Argumentaire", value: report.argumentaire },
      { field: "Généré le", value: new Date(report.createdAt).toLocaleString("fr-BE") },
    ]);

    sheet.getRow(1).font = { bold: true };
    sheet.getColumn("value").alignment = { wrapText: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="bilan-${report.name.replace(/[^a-z0-9]/gi, "_")}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Erreur export Excel:", error);
    res.status(500).json({ error: error.message });
  }
});


// GET /api/reports/:id - récupère un rapport par son ID
router.get("/:id", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const reportsCollection = db.collection("reports");

    const report = await reportsCollection.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
    });

    if (!report) {
      return res.status(404).json({ error: "Rapport non trouvé" });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/by-prospect/:prospectId - dernier rapport pour un prospect donné
router.get("/by-prospect/:prospectId", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const reportsCollection = db.collection("reports");

    const report = await reportsCollection
      .find({ prospect_id: req.params.prospectId })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();

    if (!report) {
      return res.status(404).json({ error: "Aucun rapport trouvé pour ce prospect" });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// POST /api/reports/fix-requestedBy - admin only
// Remplit requestedBy.userName pour les rapports existants si missing
router.post("/fix-requestedBy", authMiddleware, authorizeRoles("Administrateur"), async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const reportsCollection = db.collection("reports");

    const cursor = reportsCollection.find({
      "requestedBy.userId": { $exists: true },
      $or: [{ "requestedBy.userName": null }, { "requestedBy.userName": "" }],
    });

    let updated = 0;
    while (await cursor.hasNext()) {
      const rep = await cursor.next();
      const userId = rep.requestedBy?.userId;
      if (!userId) continue;
      // try to resolve user name from Users collection
      let user = null;
      try {
        user = await User.findById(userId).lean();
      } catch (e) {
        // no-op
      }
      if (user && user.name) {
        await reportsCollection.updateOne({ _id: rep._id }, { $set: { "requestedBy.userName": user.name } });
        updated++;
      }
    }

    res.json({ updated });
  } catch (error) {
    console.error("Erreur migration requestedBy:", error);
    res.status(500).json({ error: error.message });
  }
});