import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;

let client;
let clientPromise;

if (!uri) {
  throw new Error("Please add MONGODB_URI");
}

if (!clientPromise) {
  client = new MongoClient(uri, {
    tls: true,
  });
  clientPromise = client.connect();
}

async function getBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }

  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function calculateStockStatus(quantity, reorderLevel, expiryDate) {
  const qty = Number(quantity || 0);
  const reorder = Number(reorderLevel || 10);

  if (qty <= 0) {
    return "Out of Stock";
  }

  if (expiryDate) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      return "Expired";
    }

    if (daysLeft <= 30) {
      return "Expiring Soon";
    }
  }

  if (qty <= reorder) {
    return "Low Stock";
  }

  return "In Stock";
}

function cleanMedicine(item) {
  return {
    _id: item._id?.toString(),

    medicineCode: item.medicineCode || "",
    name: item.name || "",
    category: item.category || "",
    dosageForm: item.dosageForm || "",
    strength: item.strength || "",

    batchNo: item.batchNo || "",
    supplier: item.supplier || "",

    quantity: Number(item.quantity || 0),
    reorderLevel: Number(item.reorderLevel || 0),
    unitPrice: Number(item.unitPrice || 0),
    totalValue: Number(item.totalValue || 0),

    expiryDate: item.expiryDate || "",
    status: item.status || "In Stock",

    location: item.location || "",
    notes: item.notes || "",

    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

function generateMedicineCode() {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `MED-${year}-${random}`;
}

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("hospital");
    const pharmacyCollection = db.collection("pharmacy");

    // GET: list medicines
    if (req.method === "GET") {
      const {
        search = "",
        status = "",
        category = "",
      } = req.query;

      const filter = {};

      if (status && status !== "all") {
        filter.status = status;
      }

      if (category && category !== "all") {
        filter.category = category;
      }

      if (search) {
        filter.$or = [
          { medicineCode: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
          { dosageForm: { $regex: search, $options: "i" } },
          { strength: { $regex: search, $options: "i" } },
          { batchNo: { $regex: search, $options: "i" } },
          { supplier: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
        ];
      }

      const medicines = await pharmacyCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();

      // Update status dynamically before returning
      const cleanedMedicines = medicines.map((item) => {
        const status = calculateStockStatus(
          item.quantity,
          item.reorderLevel,
          item.expiryDate
        );

        return cleanMedicine({
          ...item,
          status,
          totalValue: Number(item.quantity || 0) * Number(item.unitPrice || 0),
        });
      });

      return res.status(200).json(cleanedMedicines);
    }

    // POST: add medicine
    if (req.method === "POST") {
      const body = await getBody(req);

      if (!body.name) {
        return res.status(400).json({
          message: "Medicine name is required",
        });
      }

      if (!body.category) {
        return res.status(400).json({
          message: "Category is required",
        });
      }

      if (body.quantity === undefined || Number(body.quantity) < 0) {
        return res.status(400).json({
          message: "Valid quantity is required",
        });
      }

      const quantity = Number(body.quantity || 0);
      const reorderLevel = Number(body.reorderLevel || 10);
      const unitPrice = Number(body.unitPrice || 0);
      const totalValue = quantity * unitPrice;

      const status = calculateStockStatus(
        quantity,
        reorderLevel,
        body.expiryDate
      );

      const newMedicine = {
        medicineCode: body.medicineCode || generateMedicineCode(),

        name: body.name,
        category: body.category,
        dosageForm: body.dosageForm || "",
        strength: body.strength || "",

        batchNo: body.batchNo || "",
        supplier: body.supplier || "",

        quantity,
        reorderLevel,
        unitPrice,
        totalValue,

        expiryDate: body.expiryDate || "",
        status,

        location: body.location || "",
        notes: body.notes || "",

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingCode = await pharmacyCollection.findOne({
        medicineCode: newMedicine.medicineCode,
      });

      if (existingCode) {
        return res.status(409).json({
          message: "Medicine code already exists",
        });
      }

      const result = await pharmacyCollection.insertOne(newMedicine);

      return res.status(201).json({
        message: "Medicine added successfully",
        medicine: {
          ...cleanMedicine(newMedicine),
          _id: result.insertedId.toString(),
        },
      });
    }

    // PUT: update medicine
    if (req.method === "PUT") {
      const body = await getBody(req);

      if (!body.id) {
        return res.status(400).json({
          message: "Medicine ID is required",
        });
      }

      if (!ObjectId.isValid(body.id)) {
        return res.status(400).json({
          message: "Invalid medicine ID",
        });
      }

      const medicineId = new ObjectId(body.id);

      const existingMedicine = await pharmacyCollection.findOne({
        _id: medicineId,
      });

      if (!existingMedicine) {
        return res.status(404).json({
          message: "Medicine not found",
        });
      }

      const quantity =
        body.quantity !== undefined
          ? Number(body.quantity)
          : Number(existingMedicine.quantity || 0);

      const reorderLevel =
        body.reorderLevel !== undefined
          ? Number(body.reorderLevel)
          : Number(existingMedicine.reorderLevel || 10);

      const unitPrice =
        body.unitPrice !== undefined
          ? Number(body.unitPrice)
          : Number(existingMedicine.unitPrice || 0);

      if (quantity < 0) {
        return res.status(400).json({
          message: "Quantity cannot be negative",
        });
      }

      if (unitPrice < 0) {
        return res.status(400).json({
          message: "Unit price cannot be negative",
        });
      }

      const expiryDate =
        body.expiryDate !== undefined
          ? body.expiryDate
          : existingMedicine.expiryDate || "";

      const status = calculateStockStatus(quantity, reorderLevel, expiryDate);
      const totalValue = quantity * unitPrice;

      const updates = {
        medicineCode: body.medicineCode ?? existingMedicine.medicineCode ?? "",
        name: body.name ?? existingMedicine.name ?? "",
        category: body.category ?? existingMedicine.category ?? "",
        dosageForm: body.dosageForm ?? existingMedicine.dosageForm ?? "",
        strength: body.strength ?? existingMedicine.strength ?? "",

        batchNo: body.batchNo ?? existingMedicine.batchNo ?? "",
        supplier: body.supplier ?? existingMedicine.supplier ?? "",

        quantity,
        reorderLevel,
        unitPrice,
        totalValue,

        expiryDate,
        status,

        location: body.location ?? existingMedicine.location ?? "",
        notes: body.notes ?? existingMedicine.notes ?? "",

        updatedAt: new Date(),
      };

      if (updates.medicineCode !== existingMedicine.medicineCode) {
        const duplicateCode = await pharmacyCollection.findOne({
          medicineCode: updates.medicineCode,
          _id: { $ne: medicineId },
        });

        if (duplicateCode) {
          return res.status(409).json({
            message: "Medicine code already exists",
          });
        }
      }

      await pharmacyCollection.updateOne(
        { _id: medicineId },
        { $set: updates }
      );

      return res.status(200).json({
        message: "Medicine updated successfully",
      });
    }

    // DELETE: delete medicine
    if (req.method === "DELETE") {
      const body = await getBody(req);

      if (!body.id) {
        return res.status(400).json({
          message: "Medicine ID is required",
        });
      }

      if (!ObjectId.isValid(body.id)) {
        return res.status(400).json({
          message: "Invalid medicine ID",
        });
      }

      const result = await pharmacyCollection.deleteOne({
        _id: new ObjectId(body.id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          message: "Medicine not found",
        });
      }

      return res.status(200).json({
        message: "Medicine deleted successfully",
      });
    }

    return res.status(405).json({
      message: "Method not allowed",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}