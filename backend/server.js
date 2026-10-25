require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" })); // photo ke liye thodi badi limit

// ---------- Database table (Mongoose "model") ----------
const donationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    diet: String,
    quantityAmount: Number,
    quantityUnit: String,
    servings: { type: Number, required: true },
    condition: String,
    storage: String,
    preparedAt: Date,
    expiresAt: { type: Date, required: true },
    deadline: { type: Date, required: true },
    location: { type: String, required: true },
    donor: { type: String, required: true },
    donorId: String,
    notes: String,
    image: String,
    status: { type: String, enum: ["Available", "Reserved", "Picked Up"], default: "Available" },
    reservedBy: { type: String, default: "" },
    reservedOrg: { type: String, default: "" },
    verification: { type: String, default: "required" },
    sample: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// _id ko "id" bana do, taaki website ko aasaani rahe
donationSchema.set("toJSON", {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

const Donation = mongoose.model("Donation", donationSchema);

// ---------- Routes ----------

// Saari listings dikhao
app.get("/api/donations", async (req, res) => {
  try {
    const items = await Donation.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Nayi donation save karo
app.post("/api/donations", async (req, res) => {
  try {
    const item = await Donation.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Food reserve karo (sirf tab jab abhi bhi Available ho)
app.patch("/api/donations/:id/reserve", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const org = String(req.body.org || "").trim();
    if (name.length < 2) return res.status(400).json({ error: "Name is required." });

    const updated = await Donation.findOneAndUpdate(
      { _id: req.params.id, status: "Available" },
      { status: "Reserved", reservedBy: name, reservedOrg: org },
      { new: true }
    );
    if (!updated) return res.status(409).json({ error: "Already requested or not found." });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Picked up mark karo (sirf tab jab Reserved ho)
app.patch("/api/donations/:id/pickup", async (req, res) => {
  try {
    const updated = await Donation.findOneAndUpdate(
      { _id: req.params.id, status: "Reserved" },
      { status: "Picked Up" },
      { new: true }
    );
    if (!updated) return res.status(409).json({ error: "Not reserved or not found." });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------- Start ----------
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log("Server running on port " + PORT));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });