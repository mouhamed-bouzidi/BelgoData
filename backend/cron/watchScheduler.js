const cron = require("node-cron");
const axios = require("axios");
const WatchedSearch = require("../models/WatchedSearch");
const Notification = require("../models/Notification");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5001";

/**
 * Exécute une alerte : relance un scraping OSM via l'ai-service pour la
 * catégorie/code postal surveillés, puis crée une notification in-app si
 * de nouveaux prospects ont été trouvés depuis la dernière exécution.
 */
async function runWatchedSearch(watch) {
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/scrape/osm`, {
      postal_code: watch.postalCode,
      category: watch.category,
      userId: String(watch.userId),
    }, { timeout: 60000 });

    const newProspects = data.new_prospects || [];

    if (newProspects.length > 0) {
      const sample = newProspects.slice(0, 5).map((p) => p.name).filter(Boolean);
      await Notification.create({
        userId: watch.userId,
        type: "new_prospects",
        message: `${newProspects.length} nouveau(x) prospect(s) détecté(s) pour "${watch.label || watch.category}"`,
        meta: {
          category: watch.category,
          postalCode: watch.postalCode,
          count: newProspects.length,
          sample,
        },
      });
    }

    watch.lastRunAt = new Date();
    await watch.save();
  } catch (error) {
    console.error(`⚠️ Échec de l'alerte "${watch.label || watch.category}" (${watch.postalCode}):`, error.message);
  }
}

function isDue(watch) {
  if (!watch.lastRunAt) return true;
  const hoursSinceLastRun = (Date.now() - new Date(watch.lastRunAt).getTime()) / (1000 * 60 * 60);
  return hoursSinceLastRun >= (watch.frequencyHours || 24);
}

/**
 * Démarre le scheduler : vérifie toutes les heures les alertes actives dont
 * la fréquence est échue, et les exécute séquentiellement (pour ne pas
 * surcharger l'API Overpass/OSM avec des appels en parallèle).
 */
function startWatchScheduler() {
  cron.schedule("0 * * * *", async () => {
    try {
      const dueWatches = (await WatchedSearch.find({ active: true })).filter(isDue);
      if (dueWatches.length === 0) return;

      console.log(`🔔 Exécution de ${dueWatches.length} alerte(s) programmée(s)...`);
      for (const watch of dueWatches) {
        await runWatchedSearch(watch);
      }
    } catch (error) {
      console.error("⚠️ Erreur du scheduler d'alertes:", error.message);
    }
  });

  console.log("🔔 Scheduler d'alertes démarré (vérification toutes les heures).");
}

module.exports = { startWatchScheduler, runWatchedSearch };
