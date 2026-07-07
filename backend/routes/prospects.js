const express = require("express");
const router = express.Router();
const Prospect = require("../models/Prospect");
const { calculateGrowthRate } = require("../utils/prospectStats");
const authMiddleware = require("../middleware/auth");
const authorizeRoles = require("../middleware/roleMiddleware");
const buildProspectFilter = (query) => {
  const { postal_code, category, source, search, email, score_min } = query;
  const filter = {};
  const conditions = [];

  if (postal_code) conditions.push({ "address.postcode": postal_code });
  if (category) conditions.push({ category });
  if (source) conditions.push({ source: source.toLowerCase() });
  if (score_min) conditions.push({ score: { $gte: Number(score_min) } });

  if (email === "Disponible") {
    conditions.push({ email: { $regex: /\S/ } });
  }

  if (email === "Non disponible") {
    conditions.push({
      $or: [
        { email: { $exists: false } },
        { email: null },
        { email: "" },
        { email: { $regex: /^\s*$/ } },
      ],
    });
  }

  if (search) {
    conditions.push({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ],
    });
  }

  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  return filter;
};

// GET /api/prospects?postal_code=1000&category=restaurant&page=1&limit=20
router.get("/",authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = buildProspectFilter(req.query);

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
    const currentEnd = new Date();
    currentEnd.setHours(23, 59, 59, 999);
    const currentStart = new Date(currentEnd);
    currentStart.setDate(currentEnd.getDate() - 29);
    currentStart.setHours(0, 0, 0, 0);

    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);
    previousEnd.setHours(23, 59, 59, 999);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 29);
    previousStart.setHours(0, 0, 0, 0);

    const periodMatch = (start, end) => ({ createdAt: { $gte: start, $lte: end } });

    const [total, emailsCount, websitesCount, avgScoreResult, hotLeadsCount, currentPeriodStats, previousPeriodStats, byCategory, bySource, byPostcode, recent] = await Promise.all([
      Prospect.countDocuments(),
      Prospect.countDocuments({ email: { $regex: /\S/ } }),
      Prospect.countDocuments({ website: { $regex: /\S/ } }),
      Prospect.aggregate([
        { $match: { score: { $ne: null } } },
        { $group: { _id: null, avgScore: { $avg: "$score" } } },
      ]),
      Prospect.countDocuments({ score: { $gte: 80 } }),
      Promise.all([
        Prospect.countDocuments(periodMatch(currentStart, currentEnd)),
        Prospect.countDocuments({ ...periodMatch(currentStart, currentEnd), email: { $regex: /\S/ } }),
        Prospect.countDocuments({ ...periodMatch(currentStart, currentEnd), website: { $regex: /\S/ } }),
        Prospect.aggregate([
          { $match: { ...periodMatch(currentStart, currentEnd), score: { $ne: null } } },
          { $group: { _id: null, avgScore: { $avg: "$score" } } },
        ]),
        Prospect.countDocuments({ ...periodMatch(currentStart, currentEnd), score: { $gte: 80 } }),
      ]),
      Promise.all([
        Prospect.countDocuments(periodMatch(previousStart, previousEnd)),
        Prospect.countDocuments({ ...periodMatch(previousStart, previousEnd), email: { $regex: /\S/ } }),
        Prospect.countDocuments({ ...periodMatch(previousStart, previousEnd), website: { $regex: /\S/ } }),
        Prospect.aggregate([
          { $match: { ...periodMatch(previousStart, previousEnd), score: { $ne: null } } },
          { $group: { _id: null, avgScore: { $avg: "$score" } } },
        ]),
        Prospect.countDocuments({ ...periodMatch(previousStart, previousEnd), score: { $gte: 80 } }),
      ]),
      Prospect.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Prospect.aggregate([
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Prospect.aggregate([
        { $group: { _id: "$address.postcode", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Prospect.find().sort({ createdAt: -1 }).limit(5),
    ]);

    const avgScore = Math.round(avgScoreResult[0]?.avgScore ?? 0);
    const currentValues = [
      currentPeriodStats[0],
      currentPeriodStats[1],
      currentPeriodStats[2],
      Math.round(currentPeriodStats[3][0]?.avgScore ?? 0),
      currentPeriodStats[4],
    ];
    const previousValues = [
      previousPeriodStats[0],
      previousPeriodStats[1],
      previousPeriodStats[2],
      Math.round(previousPeriodStats[3][0]?.avgScore ?? 0),
      previousPeriodStats[4],
    ];

    res.json({
      total,
      emailsCount,
      websitesCount,
      avgScore,
      hotLeads: hotLeadsCount,
      trends: {
        total: calculateGrowthRate(currentValues[0], previousValues[0]),
        emails: calculateGrowthRate(currentValues[1], previousValues[1]),
        websites: calculateGrowthRate(currentValues[2], previousValues[2]),
        avgScore: calculateGrowthRate(currentValues[3], previousValues[3]),
        hotLeads: calculateGrowthRate(currentValues[4], previousValues[4]),
      },
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
    const prospect = await Prospect.findById(req.params.id);
    if (!prospect) {
      return res.status(404).json({ error: "Prospect non trouvé" });
    }
    res.json(prospect);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/prospects/:id
router.delete("/:id", authMiddleware, authorizeRoles("Administrateur", "Commercial"),async (req, res) => {
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
router.post("/", authMiddleware, authorizeRoles("Administrateur", "Commercial"),async (req, res) => {
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
      createdBy: {
        userId: req.user?.id || null,
        userName: req.user?.name || null,
      },
    };

    const newProspect = new Prospect(prospectData);
    const saved = await newProspect.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("❌ Erreur ajout prospect:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- helper: préfixe code postal belge -> code ISO province ---
const PROVINCES = [
  { id: "BE-BRU", name: "Bruxelles" },
  { id: "BE-VAN", name: "Anvers" },
  { id: "BE-VBR", name: "Brabant flamand" },
  { id: "BE-WBR", name: "Brabant wallon" },
  { id: "BE-VWV", name: "Flandre-Occidentale" },
  { id: "BE-VOV", name: "Flandre-Orientale" },
  { id: "BE-WHT", name: "Hainaut" },
  { id: "BE-WLG", name: "Liège" },
  { id: "BE-VLI", name: "Limbourg" },
  { id: "BE-WLX", name: "Luxembourg" },
  { id: "BE-WNA", name: "Namur" },
];

function cpToProvince(cp) {
  const n = parseInt(String(cp).trim(), 10);
  if (!n) return null;
  if (n >= 1000 && n <= 1299) return "BE-BRU";
  if (n >= 1300 && n <= 1499) return "BE-WBR";
  if ((n >= 1500 && n <= 1999) || (n >= 3000 && n <= 3499)) return "BE-VBR";
  if (n >= 2000 && n <= 2999) return "BE-VAN";
  if (n >= 3500 && n <= 3999) return "BE-VLI";
  if (n >= 4000 && n <= 4999) return "BE-WLG";
  if (n >= 5000 && n <= 5999) return "BE-WNA";
  if ((n >= 6000 && n <= 6599) || (n >= 7000 && n <= 7999)) return "BE-WHT";
  if (n >= 6600 && n <= 6999) return "BE-WLX";
  if (n >= 8000 && n <= 8999) return "BE-VWV";
  if (n >= 9000 && n <= 9999) return "BE-VOV";
  return null;
}

// GET /dashboard/geo-distribution
router.get("/dashboard/geo-distribution", async (req, res) => {
  try {
    const rows = await Prospect.find({}, "address.postcode").lean();

    const counts = Object.fromEntries(PROVINCES.map((p) => [p.id, 0]));
    for (const row of rows) {
      const id = cpToProvince(row?.address?.postcode);
      if (id) counts[id]++;
    }

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;

    const data = PROVINCES.map((p) => ({
      id: p.id,
      name: p.name,
      count: counts[p.id],
      percentage: total > 0 ? Number(((counts[p.id] / total) * 100).toFixed(1)) : 0,
    }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);

    res.json({ total, data });
  } catch (error) {
    console.error("❌ Erreur distribution géo:", error);
    res.status(500).json({ error: "geo_distribution_failed" });
  }
});

module.exports = router;