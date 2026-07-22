const mongoose = require("mongoose");

const ProspectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    category: { type: String, default: "autre" },

    address: {
      street: { type: String, default: null },
      housenumber: { type: String, default: null },
      city: { type: String, default: null },
      postcode: { type: String, default: null },
      province: { type: String, default: null },
      country: { type: String, default: "Belgium" },
    },

    sessionId: { type: String, default: null },

    // Format GeoJSON — obligatoire pour faire des recherches géo MongoDB (ex: "prospects à 5km de X")
    // Pas de "default" ici : si aucune coordonnée n'est fournie, le champ location reste totalement absent
    location: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number], default: undefined },
    },

    phone: { type: String, default: null },
    email: { type: String, default: null },
    website: { type: String, default: null },

    rating: { type: Number, default: null },
    score: { type: Number, default: null }, // calculé plus tard par le RAG
    temperature: { type: String, enum: ["chaud", "tiede", "froid", null], default: null }, // score de chaleur commercial (hot/warm/cold)
    createdBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      userName: { type: String, default: null },
    },

    source: { type: String, enum: ["osm", "linkedin", "manuel"], required: true },

    // Spécifique OSM, optionnel pour les autres sources
    osm_id: { type: Number, default: null },
    osm_type: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

// Index géospatial — nécessaire pour des requêtes type "prospects proches de ce point"
ProspectSchema.index({ location: "2dsphere" });

// Index pour éviter les doublons OSM (même logique que côté Python)
ProspectSchema.index({ osm_id: 1, source: 1 });

module.exports = mongoose.model("Prospect", ProspectSchema);