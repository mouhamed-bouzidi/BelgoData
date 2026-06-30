const express = require("express");
const router = express.Router();
const Prospect = require("../models/Prospect");

// GET /api/prospects?postal_code=1000&category=restaurant&page=1&limit=20
router.get("/", async (req, res) => {
  try {
    const { postal_code, category, source, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (postal_code) filter["address.postcode"] = postal_code;
    if (category) filter.category = category;
    if (source) filter.source = source;

    const skip = (Number(page) - 1) * Number(limit);

    const [prospects, total] = await Promise.all([
      Prospect.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Prospect.countDocuments(filter),
    ]);

    res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      results: prospects,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/prospects/stats - statistiques agrégées pour le Dashboard
router.get("/stats", async (req, res) => {
  try {
    const total = await Prospect.countDocuments();
    const emailsCount = await Prospect.countDocuments({ email: { $ne: null } });
    const websitesCount = await Prospect.countDocuments({ website: { $ne: null } });

    // Répartition par catégorie
    const byCategory = await Prospect.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Répartition par source
    const bySource = await Prospect.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Répartition par code postal (proxy pour la géo, en attendant la province)
    const byPostcode = await Prospect.aggregate([
      { $group: { _id: "$address.postcode", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Derniers prospects ajoutés
    const recent = await Prospect.find().sort({ createdAt: -1 }).limit(5);

    res.json({
      total,
      emailsCount,
      websitesCount,
      byCategory,
      bySource,
      byPostcode,
      recent,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");

// GET /api/prospects/export/csv - export CSV avec filtres
router.get("/export/csv", async (req, res) => {
  try {
    const { postal_code, category, source, search } = req.query;
    const filter = {};
    if (postal_code) filter["address.postcode"] = postal_code;
    if (category) filter.category = category;
    if (source) filter.source = source.toLowerCase();
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
      ];
    }

    const prospects = await Prospect.find(filter).lean();

    const rows = prospects.map((p) => ({
      Nom: p.name,
      Secteur: p.category,
      Rue: p.address?.street || "",
      CodePostal: p.address?.postcode || "",
      Ville: p.address?.city || "",
      Telephone: p.phone || "",
      Email: p.email || "",
      SiteWeb: p.website || "",
      Source: p.source,
      Score: p.score ?? "",
      AjouteLe: p.createdAt,
    }));

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="prospects_export.csv"`);
    res.send("\uFEFF" + csv); // BOM pour compatibilité Excel avec accents
  } catch (error) {
    console.error("Erreur export CSV:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/prospects/export/excel - export Excel avec filtres
router.get("/export/excel", async (req, res) => {
  try {
    const { postal_code, category, source, search } = req.query;
    const filter = {};
    if (postal_code) filter["address.postcode"] = postal_code;
    if (category) filter.category = category;
    if (source) filter.source = source.toLowerCase();
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
      ];
    }

    const prospects = await Prospect.find(filter).lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Prospects");

    sheet.columns = [
      { header: "Nom", key: "name", width: 30 },
      { header: "Secteur", key: "category", width: 25 },
      { header: "Rue", key: "street", width: 25 },
      { header: "Code postal", key: "postcode", width: 12 },
      { header: "Ville", key: "city", width: 18 },
      { header: "Téléphone", key: "phone", width: 18 },
      { header: "Email", key: "email", width: 28 },
      { header: "Site web", key: "website", width: 30 },
      { header: "Source", key: "source", width: 10 },
      { header: "Score", key: "score", width: 10 },
      { header: "Ajouté le", key: "createdAt", width: 20 },
    ];

    prospects.forEach((p) => {
      sheet.addRow({
        name: p.name,
        category: p.category,
        street: p.address?.street || "",
        postcode: p.address?.postcode || "",
        city: p.address?.city || "",
        phone: p.phone || "",
        email: p.email || "",
        website: p.website || "",
        source: p.source,
        score: p.score ?? "",
        createdAt: new Date(p.createdAt).toLocaleDateString("fr-BE"),
      });
    });

    sheet.getRow(1).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="prospects_export.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Erreur export Excel:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/prospects/:id
router.get("/:id", async (req, res) => {
  try {
    const { postal_code, category, source, search, email, score_min, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (postal_code) filter["address.postcode"] = postal_code;
    if (category) filter.category = category;
    if (source) filter.source = source.toLowerCase();
    if (email === "Disponible") filter.email = { $ne: null };
    if (email === "Non disponible") filter.email = null;
    if (score_min) filter.score = { $gte: Number(score_min) };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [prospects, total] = await Promise.all([
      Prospect.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Prospect.countDocuments(filter),
    ]);

    res.json({ total, page: Number(page), limit: Number(limit), results: prospects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/prospects/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Prospect.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Prospect non trouvé" });
    }
    res.json({ message: "Prospect supprimé", id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/prospects - ajout manuel
router.post("/", async (req, res) => {
  try {
    const { name, category, address, phone, email, website } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Le nom de l'entreprise est requis." });
    }

    const prospectData = {
      name,
      category: category || "Autre",
      address: {
        street: address?.street || null,
        housenumber: address?.housenumber || null,
        city: address?.city || null,
        postcode: address?.postcode || null,
        province: address?.province || null,
        country: "Belgium",
      },
      phone: phone || null,
      email: email || null,
      website: website || null,
      source: "manuel",
      score: null,
    };

    const newProspect = new Prospect(prospectData);
    const saved = await newProspect.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("❌ Erreur ajout prospect:", error);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;