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
    return req.body ? JSON.parse(req.body) : {};
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

function toObjectId(id) {
  if (!id) return null;
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function generateCode(prefix) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}-${year}${month}${day}-${random}`;
}

function getItemStatus(totalStock, minStock) {
  const stock = Number(totalStock || 0);
  const min = Number(minStock || 0);

  if (stock <= 0) return "Out of Stock";
  if (stock <= min) return "Low Stock";
  return "In Stock";
}

function cleanItem(item) {
  return {
    _id: item._id?.toString(),
    itemCode: item.itemCode || "",
    name: item.name || "",
    category: item.category || "",
    department: item.department || "",
    unit: item.unit || "",
    description: item.description || "",
    minStock: Number(item.minStock || 0),
    totalStock: Number(item.totalStock || 0),
    status: item.status || getItemStatus(item.totalStock, item.minStock),
    supplierName: item.supplierName || "",
    location: item.location || "",
    notes: item.notes || "",
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

function cleanBatch(batch) {
  return {
    _id: batch._id?.toString(),
    batchNo: batch.batchNo || "",
    itemId: batch.itemId?.toString() || "",
    itemCode: batch.itemCode || "",
    itemName: batch.itemName || "",
    quantity: Number(batch.quantity || 0),
    remainingQuantity: Number(batch.remainingQuantity || 0),
    unitCost: Number(batch.unitCost || 0),
    totalCost: Number(batch.totalCost || 0),
    supplierName: batch.supplierName || "",
    receivedDate: batch.receivedDate || "",
    expiryDate: batch.expiryDate || "",
    location: batch.location || "",
    status: batch.status || "Active",
    notes: batch.notes || "",
    createdAt: batch.createdAt || null,
    updatedAt: batch.updatedAt || null,
  };
}

function cleanMovement(movement) {
  return {
    _id: movement._id?.toString(),
    movementNo: movement.movementNo || "",
    itemId: movement.itemId?.toString() || "",
    itemCode: movement.itemCode || "",
    itemName: movement.itemName || "",
    batchId: movement.batchId?.toString() || "",
    batchNo: movement.batchNo || "",
    movementType: movement.movementType || "",
    quantity: Number(movement.quantity || 0),
    fromLocation: movement.fromLocation || "",
    toLocation: movement.toLocation || "",
    department: movement.department || "",
    requestedBy: movement.requestedBy || "",
    approvedBy: movement.approvedBy || "",
    movementDate: movement.movementDate || "",
    reason: movement.reason || "",
    notes: movement.notes || "",
    createdAt: movement.createdAt || null,
    updatedAt: movement.updatedAt || null,
  };
}

/* ───────────────────────────── ITEMS ───────────────────────────── */

async function handleItems(req, res, db) {
  const itemsCollection = db.collection("inventory_items");
  const batchesCollection = db.collection("inventory_batches");

  if (req.method === "GET") {
    const {
      search = "",
      category = "",
      department = "",
      status = "",
    } = req.query;

    const filter = {};

    if (category && category !== "all") filter.category = category;
    if (department && department !== "all") filter.department = department;
    if (status && status !== "all") filter.status = status;

    if (search) {
      filter.$or = [
        { itemCode: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { supplierName: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    const items = await itemsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    const refreshedItems = await Promise.all(
      items.map(async (item) => {
        const batches = await batchesCollection
          .find({
            itemId: item._id,
            status: "Active",
          })
          .toArray();

        const totalStock = batches.reduce(
          (sum, batch) => sum + Number(batch.remainingQuantity || 0),
          0
        );

        const statusValue = getItemStatus(totalStock, item.minStock);

        await itemsCollection.updateOne(
          { _id: item._id },
          {
            $set: {
              totalStock,
              status: statusValue,
              updatedAt: new Date(),
            },
          }
        );

        return cleanItem({
          ...item,
          totalStock,
          status: statusValue,
        });
      })
    );

    return res.status(200).json(refreshedItems);
  }

  if (req.method === "POST") {
    const body = await getBody(req);

    if (!body.name) {
      return res.status(400).json({ message: "Item name is required" });
    }

    if (!body.unit) {
      return res.status(400).json({ message: "Unit is required" });
    }

    const minStock = Number(body.minStock || 0);

    if (minStock < 0) {
      return res.status(400).json({ message: "Minimum stock cannot be negative" });
    }

    const newItem = {
      itemCode: body.itemCode || generateCode("ITEM"),
      name: body.name,
      category: body.category || "General",
      department: body.department || "General",
      unit: body.unit,
      description: body.description || "",
      minStock,
      totalStock: 0,
      status: "Out of Stock",
      supplierName: body.supplierName || "",
      location: body.location || "",
      notes: body.notes || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const duplicate = await itemsCollection.findOne({
      itemCode: newItem.itemCode,
    });

    if (duplicate) {
      return res.status(409).json({ message: "Item code already exists" });
    }

    const result = await itemsCollection.insertOne(newItem);

    return res.status(201).json({
      message: "Item added successfully",
      item: {
        ...cleanItem(newItem),
        _id: result.insertedId.toString(),
      },
    });
  }

  if (req.method === "PUT") {
    const body = await getBody(req);

    if (!body.id) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    if (!ObjectId.isValid(body.id)) {
      return res.status(400).json({ message: "Invalid item ID" });
    }

    const itemId = new ObjectId(body.id);
    const existing = await itemsCollection.findOne({ _id: itemId });

    if (!existing) {
      return res.status(404).json({ message: "Item not found" });
    }

    const minStock =
      body.minStock !== undefined ? Number(body.minStock) : Number(existing.minStock || 0);

    if (minStock < 0) {
      return res.status(400).json({ message: "Minimum stock cannot be negative" });
    }

    const totalStock = Number(existing.totalStock || 0);

    const updates = {
      itemCode: body.itemCode ?? existing.itemCode ?? "",
      name: body.name ?? existing.name ?? "",
      category: body.category ?? existing.category ?? "General",
      department: body.department ?? existing.department ?? "General",
      unit: body.unit ?? existing.unit ?? "",
      description: body.description ?? existing.description ?? "",
      minStock,
      totalStock,
      status: getItemStatus(totalStock, minStock),
      supplierName: body.supplierName ?? existing.supplierName ?? "",
      location: body.location ?? existing.location ?? "",
      notes: body.notes ?? existing.notes ?? "",
      updatedAt: new Date(),
    };

    if (!updates.name) {
      return res.status(400).json({ message: "Item name is required" });
    }

    if (!updates.unit) {
      return res.status(400).json({ message: "Unit is required" });
    }

    if (updates.itemCode !== existing.itemCode) {
      const duplicate = await itemsCollection.findOne({
        _id: { $ne: itemId },
        itemCode: updates.itemCode,
      });

      if (duplicate) {
        return res.status(409).json({ message: "Item code already exists" });
      }
    }

    await itemsCollection.updateOne({ _id: itemId }, { $set: updates });

    return res.status(200).json({ message: "Item updated successfully" });
  }

  if (req.method === "DELETE") {
    const body = await getBody(req);

    if (!body.id) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    if (!ObjectId.isValid(body.id)) {
      return res.status(400).json({ message: "Invalid item ID" });
    }

    const itemId = new ObjectId(body.id);

    const batchCount = await batchesCollection.countDocuments({
      itemId,
    });

    if (batchCount > 0) {
      return res.status(400).json({
        message: "Cannot delete item because it has stock batches. Remove batches first.",
      });
    }

    const result = await itemsCollection.deleteOne({ _id: itemId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    return res.status(200).json({ message: "Item deleted successfully" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}

/* ───────────────────────────── BATCHES ───────────────────────────── */

async function refreshItemStock(itemsCollection, batchesCollection, itemId) {
  const batches = await batchesCollection
    .find({
      itemId,
      status: "Active",
    })
    .toArray();

  const totalStock = batches.reduce(
    (sum, batch) => sum + Number(batch.remainingQuantity || 0),
    0
  );

  const item = await itemsCollection.findOne({ _id: itemId });

  if (!item) return;

  await itemsCollection.updateOne(
    { _id: itemId },
    {
      $set: {
        totalStock,
        status: getItemStatus(totalStock, item.minStock),
        updatedAt: new Date(),
      },
    }
  );
}

async function handleBatches(req, res, db) {
  const batchesCollection = db.collection("inventory_batches");
  const itemsCollection = db.collection("inventory_items");

  if (req.method === "GET") {
    const {
      search = "",
      itemId = "",
      status = "",
      expiryFrom = "",
      expiryTo = "",
    } = req.query;

    const filter = {};

    if (itemId && ObjectId.isValid(itemId)) {
      filter.itemId = new ObjectId(itemId);
    }

    if (status && status !== "all") filter.status = status;

    if (expiryFrom || expiryTo) {
      filter.expiryDate = {};
      if (expiryFrom) filter.expiryDate.$gte = expiryFrom;
      if (expiryTo) filter.expiryDate.$lte = expiryTo;
    }

    if (search) {
      filter.$or = [
        { batchNo: { $regex: search, $options: "i" } },
        { itemCode: { $regex: search, $options: "i" } },
        { itemName: { $regex: search, $options: "i" } },
        { supplierName: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    const batches = await batchesCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(batches.map(cleanBatch));
  }

  if (req.method === "POST") {
    const body = await getBody(req);

    if (!body.itemId) {
      return res.status(400).json({ message: "Item is required" });
    }

    const itemObjectId = toObjectId(body.itemId);

    if (!itemObjectId) {
      return res.status(400).json({ message: "Invalid item ID" });
    }

    const item = await itemsCollection.findOne({ _id: itemObjectId });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const quantity = Number(body.quantity || 0);

    if (quantity <= 0) {
      return res.status(400).json({ message: "Batch quantity must be greater than zero" });
    }

    const unitCost = Number(body.unitCost || 0);

    if (unitCost < 0) {
      return res.status(400).json({ message: "Unit cost cannot be negative" });
    }

    const newBatch = {
      batchNo: body.batchNo || generateCode("BATCH"),
      itemId: itemObjectId,
      itemCode: item.itemCode || "",
      itemName: item.name || "",
      quantity,
      remainingQuantity: quantity,
      unitCost,
      totalCost: quantity * unitCost,
      supplierName: body.supplierName || item.supplierName || "",
      receivedDate: body.receivedDate || todayDate(),
      expiryDate: body.expiryDate || "",
      location: body.location || item.location || "",
      status: body.status || "Active",
      notes: body.notes || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const duplicate = await batchesCollection.findOne({
      batchNo: newBatch.batchNo,
    });

    if (duplicate) {
      return res.status(409).json({ message: "Batch number already exists" });
    }

    const result = await batchesCollection.insertOne(newBatch);

    await refreshItemStock(itemsCollection, batchesCollection, itemObjectId);

    return res.status(201).json({
      message: "Batch added successfully",
      batch: {
        ...cleanBatch(newBatch),
        _id: result.insertedId.toString(),
      },
    });
  }

  if (req.method === "PUT") {
    const body = await getBody(req);

    if (!body.id) {
      return res.status(400).json({ message: "Batch ID is required" });
    }

    if (!ObjectId.isValid(body.id)) {
      return res.status(400).json({ message: "Invalid batch ID" });
    }

    const batchId = new ObjectId(body.id);
    const existing = await batchesCollection.findOne({ _id: batchId });

    if (!existing) {
      return res.status(404).json({ message: "Batch not found" });
    }

    const quantity =
      body.quantity !== undefined ? Number(body.quantity) : Number(existing.quantity || 0);

    const remainingQuantity =
      body.remainingQuantity !== undefined
        ? Number(body.remainingQuantity)
        : Number(existing.remainingQuantity || 0);

    const unitCost =
      body.unitCost !== undefined ? Number(body.unitCost) : Number(existing.unitCost || 0);

    if (quantity < 0 || remainingQuantity < 0) {
      return res.status(400).json({
        message: "Quantity cannot be negative",
      });
    }

    if (remainingQuantity > quantity) {
      return res.status(400).json({
        message: "Remaining quantity cannot exceed original quantity",
      });
    }

    if (unitCost < 0) {
      return res.status(400).json({ message: "Unit cost cannot be negative" });
    }

    const updates = {
      batchNo: body.batchNo ?? existing.batchNo ?? "",
      quantity,
      remainingQuantity,
      unitCost,
      totalCost: quantity * unitCost,
      supplierName: body.supplierName ?? existing.supplierName ?? "",
      receivedDate: body.receivedDate ?? existing.receivedDate ?? todayDate(),
      expiryDate: body.expiryDate ?? existing.expiryDate ?? "",
      location: body.location ?? existing.location ?? "",
      status: body.status ?? existing.status ?? "Active",
      notes: body.notes ?? existing.notes ?? "",
      updatedAt: new Date(),
    };

    if (updates.batchNo !== existing.batchNo) {
      const duplicate = await batchesCollection.findOne({
        _id: { $ne: batchId },
        batchNo: updates.batchNo,
      });

      if (duplicate) {
        return res.status(409).json({ message: "Batch number already exists" });
      }
    }

    await batchesCollection.updateOne({ _id: batchId }, { $set: updates });

    await refreshItemStock(itemsCollection, batchesCollection, existing.itemId);

    return res.status(200).json({ message: "Batch updated successfully" });
  }

  if (req.method === "DELETE") {
    const body = await getBody(req);

    if (!body.id) {
      return res.status(400).json({ message: "Batch ID is required" });
    }

    if (!ObjectId.isValid(body.id)) {
      return res.status(400).json({ message: "Invalid batch ID" });
    }

    const batchId = new ObjectId(body.id);
    const existing = await batchesCollection.findOne({ _id: batchId });

    if (!existing) {
      return res.status(404).json({ message: "Batch not found" });
    }

    if (Number(existing.remainingQuantity || 0) < Number(existing.quantity || 0)) {
      return res.status(400).json({
        message: "Cannot delete batch because stock has already been used.",
      });
    }

    const result = await batchesCollection.deleteOne({ _id: batchId });

    await refreshItemStock(itemsCollection, batchesCollection, existing.itemId);

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Batch not found" });
    }

    return res.status(200).json({ message: "Batch deleted successfully" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}

/* ───────────────────────────── MOVEMENTS ───────────────────────────── */

async function handleMovements(req, res, db) {
  const movementsCollection = db.collection("inventory_movements");
  const batchesCollection = db.collection("inventory_batches");
  const itemsCollection = db.collection("inventory_items");

  if (req.method === "GET") {
    const {
      search = "",
      itemId = "",
      batchId = "",
      movementType = "",
      department = "",
      fromDate = "",
      toDate = "",
    } = req.query;

    const filter = {};

    if (itemId && ObjectId.isValid(itemId)) {
      filter.itemId = new ObjectId(itemId);
    }

    if (batchId && ObjectId.isValid(batchId)) {
      filter.batchId = new ObjectId(batchId);
    }

    if (movementType && movementType !== "all") {
      filter.movementType = movementType;
    }

    if (department && department !== "all") {
      filter.department = department;
    }

    if (fromDate || toDate) {
      filter.movementDate = {};
      if (fromDate) filter.movementDate.$gte = fromDate;
      if (toDate) filter.movementDate.$lte = toDate;
    }

    if (search) {
      filter.$or = [
        { movementNo: { $regex: search, $options: "i" } },
        { itemCode: { $regex: search, $options: "i" } },
        { itemName: { $regex: search, $options: "i" } },
        { batchNo: { $regex: search, $options: "i" } },
        { movementType: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { requestedBy: { $regex: search, $options: "i" } },
        { approvedBy: { $regex: search, $options: "i" } },
        { reason: { $regex: search, $options: "i" } },
      ];
    }

    const movements = await movementsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(movements.map(cleanMovement));
  }

  if (req.method === "POST") {
    const body = await getBody(req);

    if (!body.itemId) {
      return res.status(400).json({ message: "Item is required" });
    }

    const itemObjectId = toObjectId(body.itemId);

    if (!itemObjectId) {
      return res.status(400).json({ message: "Invalid item ID" });
    }

    const item = await itemsCollection.findOne({ _id: itemObjectId });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const quantity = Number(body.quantity || 0);

    if (quantity <= 0) {
      return res.status(400).json({ message: "Movement quantity must be greater than zero" });
    }

    const allowedTypes = ["Stock In", "Stock Out", "Adjustment", "Transfer"];
    const movementType = body.movementType || "Stock Out";

    if (!allowedTypes.includes(movementType)) {
      return res.status(400).json({
        message: "Movement type must be Stock In, Stock Out, Adjustment, or Transfer",
      });
    }

    let batchObjectId = null;
    let batchNo = "";
    let batch = null;

    if (body.batchId) {
      batchObjectId = toObjectId(body.batchId);

      if (!batchObjectId) {
        return res.status(400).json({ message: "Invalid batch ID" });
      }

      batch = await batchesCollection.findOne({
        _id: batchObjectId,
        itemId: itemObjectId,
      });

      if (!batch) {
        return res.status(404).json({ message: "Batch not found for selected item" });
      }

      batchNo = batch.batchNo || "";
    }

    if ((movementType === "Stock Out" || movementType === "Transfer") && !batch) {
      return res.status(400).json({
        message: "Batch is required for Stock Out or Transfer",
      });
    }

    if ((movementType === "Stock Out" || movementType === "Transfer") && batch) {
      if (Number(batch.remainingQuantity || 0) < quantity) {
        return res.status(400).json({
          message: "Not enough stock in selected batch",
        });
      }

      await batchesCollection.updateOne(
        { _id: batchObjectId },
        {
          $inc: {
            remainingQuantity: -quantity,
          },
          $set: {
            updatedAt: new Date(),
          },
        }
      );
    }

    if (movementType === "Stock In") {
      if (!batch) {
        return res.status(400).json({
          message: "Please add stock using batches first, then record stock in if needed.",
        });
      }

      await batchesCollection.updateOne(
        { _id: batchObjectId },
        {
          $inc: {
            remainingQuantity: quantity,
            quantity,
          },
          $set: {
            updatedAt: new Date(),
          },
        }
      );
    }

    if (movementType === "Adjustment" && batch) {
      const newRemaining = Number(body.newRemainingQuantity);

      if (Number.isNaN(newRemaining) || newRemaining < 0) {
        return res.status(400).json({
          message: "Valid new remaining quantity is required for adjustment",
        });
      }

      await batchesCollection.updateOne(
        { _id: batchObjectId },
        {
          $set: {
            remainingQuantity: newRemaining,
            updatedAt: new Date(),
          },
        }
      );
    }

    const newMovement = {
      movementNo: body.movementNo || generateCode("MOVE"),
      itemId: itemObjectId,
      itemCode: item.itemCode || "",
      itemName: item.name || "",
      batchId: batchObjectId,
      batchNo,
      movementType,
      quantity,
      fromLocation: body.fromLocation || "",
      toLocation: body.toLocation || "",
      department: body.department || "",
      requestedBy: body.requestedBy || "",
      approvedBy: body.approvedBy || "",
      movementDate: body.movementDate || todayDate(),
      reason: body.reason || "",
      notes: body.notes || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const duplicateMovementNo = await movementsCollection.findOne({
      movementNo: newMovement.movementNo,
    });

    if (duplicateMovementNo) {
      return res.status(409).json({ message: "Movement number already exists" });
    }

    const result = await movementsCollection.insertOne(newMovement);

    await refreshItemStock(itemsCollection, batchesCollection, itemObjectId);

    return res.status(201).json({
      message: "Stock movement recorded successfully",
      movement: {
        ...cleanMovement(newMovement),
        _id: result.insertedId.toString(),
      },
    });
  }

  return res.status(405).json({ message: "Method not allowed" });
}

/* ───────────────────────────── SUMMARY ───────────────────────────── */

function isExpiringSoon(expiryDate) {
  if (!expiryDate) return false;

  const today = new Date(todayDate());
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= 90;
}

async function handleSummary(req, res, db) {
  const itemsCollection = db.collection("inventory_items");
  const batchesCollection = db.collection("inventory_batches");
  const movementsCollection = db.collection("inventory_movements");

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const items = await itemsCollection.find({}).toArray();
  const batches = await batchesCollection.find({}).toArray();
  const movements = await movementsCollection.find({}).toArray();

  const totalItems = items.length;
  const lowStockItems = items.filter((item) => item.status === "Low Stock").length;
  const outOfStockItems = items.filter((item) => item.status === "Out of Stock").length;
  const expiringSoonBatches = batches.filter((batch) => isExpiringSoon(batch.expiryDate)).length;

  const totalStockValue = batches.reduce(
    (sum, batch) =>
      sum + Number(batch.remainingQuantity || 0) * Number(batch.unitCost || 0),
    0
  );

  const stockInCount = movements.filter((m) => m.movementType === "Stock In").length;
  const stockOutCount = movements.filter((m) => m.movementType === "Stock Out").length;
  const adjustmentCount = movements.filter((m) => m.movementType === "Adjustment").length;
  const transferCount = movements.filter((m) => m.movementType === "Transfer").length;

  return res.status(200).json({
    totalItems,
    lowStockItems,
    outOfStockItems,
    expiringSoonBatches,
    totalBatches: batches.length,
    totalMovements: movements.length,
    stockInCount,
    stockOutCount,
    adjustmentCount,
    transferCount,
    totalStockValue,
  });
}

/* ───────────────────────────── MAIN ROUTER ───────────────────────────── */

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("hospital");

    const type = String(req.query.type || "").toLowerCase();

    if (type === "items") {
      return await handleItems(req, res, db);
    }

    if (type === "batches") {
      return await handleBatches(req, res, db);
    }

    if (type === "movements") {
      return await handleMovements(req, res, db);
    }

    if (type === "summary") {
      return await handleSummary(req, res, db);
    }

    return res.status(400).json({
      message:
        "Invalid inventory type. Use ?type=items, ?type=batches, ?type=movements, or ?type=summary",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}