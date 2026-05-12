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

function generateWardCode() {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(100 + Math.random() * 900);
  return `WARD-${year}-${random}`;
}

function cleanWard(ward) {
  return {
    _id: ward._id?.toString(),

    wardCode: ward.wardCode || "",
    name: ward.name || "",
    department: ward.department || "",
    floor: ward.floor || "",
    wardType: ward.wardType || "",

    capacity: Number(ward.capacity || 0),
    occupiedBeds: Number(ward.occupiedBeds || 0),
    availableBeds: Number(ward.availableBeds || 0),

    status: ward.status || "Active",
    notes: ward.notes || "",

    createdAt: ward.createdAt || null,
    updatedAt: ward.updatedAt || null,
  };
}

function calculateAvailableBeds(capacity, occupiedBeds) {
  const cap = Number(capacity || 0);
  const occ = Number(occupiedBeds || 0);
  return Math.max(cap - occ, 0);
}

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("hospital");

    const wardsCollection = db.collection("wards");
    const bedsCollection = db.collection("beds");

    // GET: list wards
    if (req.method === "GET") {
      const {
        search = "",
        status = "",
        department = "",
      } = req.query;

      const filter = {};

      if (status && status !== "all") {
        filter.status = status;
      }

      if (department && department !== "all") {
        filter.department = department;
      }

      if (search) {
        filter.$or = [
          { wardCode: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
          { department: { $regex: search, $options: "i" } },
          { floor: { $regex: search, $options: "i" } },
          { wardType: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
          { notes: { $regex: search, $options: "i" } },
        ];
      }

      const wards = await wardsCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();

      // Recalculate occupied/available from beds collection, if beds exist
      const cleanedWards = await Promise.all(
        wards.map(async (ward) => {
          const occupiedBeds = await bedsCollection.countDocuments({
            wardId: ward._id,
            status: "Occupied",
          });

          const allBeds = await bedsCollection.countDocuments({
            wardId: ward._id,
          });

          const capacity = allBeds > 0 ? allBeds : Number(ward.capacity || 0);
          const availableBeds = calculateAvailableBeds(capacity, occupiedBeds);

          return cleanWard({
            ...ward,
            capacity,
            occupiedBeds,
            availableBeds,
          });
        })
      );

      return res.status(200).json(cleanedWards);
    }

    // POST: add ward
    if (req.method === "POST") {
      const body = await getBody(req);

      if (!body.name) {
        return res.status(400).json({
          message: "Ward name is required",
        });
      }

      if (!body.department) {
        return res.status(400).json({
          message: "Department is required",
        });
      }

      const capacity = Number(body.capacity || 0);

      if (capacity < 0) {
        return res.status(400).json({
          message: "Capacity cannot be negative",
        });
      }

      const newWard = {
        wardCode: body.wardCode || generateWardCode(),
        name: body.name,
        department: body.department,
        floor: body.floor || "",
        wardType: body.wardType || "General",

        capacity,
        occupiedBeds: 0,
        availableBeds: capacity,

        status: body.status || "Active",
        notes: body.notes || "",

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingWardCode = await wardsCollection.findOne({
        wardCode: newWard.wardCode,
      });

      if (existingWardCode) {
        return res.status(409).json({
          message: "Ward code already exists",
        });
      }

      const result = await wardsCollection.insertOne(newWard);

      return res.status(201).json({
        message: "Ward added successfully",
        ward: {
          ...cleanWard(newWard),
          _id: result.insertedId.toString(),
        },
      });
    }

    // PUT: update ward
    if (req.method === "PUT") {
      const body = await getBody(req);

      if (!body.id) {
        return res.status(400).json({
          message: "Ward ID is required",
        });
      }

      if (!ObjectId.isValid(body.id)) {
        return res.status(400).json({
          message: "Invalid ward ID",
        });
      }

      const wardId = new ObjectId(body.id);

      const existingWard = await wardsCollection.findOne({
        _id: wardId,
      });

      if (!existingWard) {
        return res.status(404).json({
          message: "Ward not found",
        });
      }

      const capacity =
        body.capacity !== undefined
          ? Number(body.capacity)
          : Number(existingWard.capacity || 0);

      if (capacity < 0) {
        return res.status(400).json({
          message: "Capacity cannot be negative",
        });
      }

      const occupiedBeds = await bedsCollection.countDocuments({
        wardId,
        status: "Occupied",
      });

      if (capacity < occupiedBeds) {
        return res.status(400).json({
          message: "Capacity cannot be less than occupied beds",
        });
      }

      const updates = {
        wardCode: body.wardCode ?? existingWard.wardCode ?? "",
        name: body.name ?? existingWard.name ?? "",
        department: body.department ?? existingWard.department ?? "",
        floor: body.floor ?? existingWard.floor ?? "",
        wardType: body.wardType ?? existingWard.wardType ?? "General",

        capacity,
        occupiedBeds,
        availableBeds: calculateAvailableBeds(capacity, occupiedBeds),

        status: body.status ?? existingWard.status ?? "Active",
        notes: body.notes ?? existingWard.notes ?? "",

        updatedAt: new Date(),
      };

      if (updates.wardCode !== existingWard.wardCode) {
        const duplicateWardCode = await wardsCollection.findOne({
          wardCode: updates.wardCode,
          _id: { $ne: wardId },
        });

        if (duplicateWardCode) {
          return res.status(409).json({
            message: "Ward code already exists",
          });
        }
      }

      await wardsCollection.updateOne(
        { _id: wardId },
        { $set: updates }
      );

      return res.status(200).json({
        message: "Ward updated successfully",
      });
    }

    // DELETE: delete ward
    if (req.method === "DELETE") {
      const body = await getBody(req);

      if (!body.id) {
        return res.status(400).json({
          message: "Ward ID is required",
        });
      }

      if (!ObjectId.isValid(body.id)) {
        return res.status(400).json({
          message: "Invalid ward ID",
        });
      }

      const wardId = new ObjectId(body.id);

      const bedCount = await bedsCollection.countDocuments({
        wardId,
      });

      if (bedCount > 0) {
        return res.status(400).json({
          message: "Cannot delete ward because it has beds. Delete or move beds first.",
        });
      }

      const result = await wardsCollection.deleteOne({
        _id: wardId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          message: "Ward not found",
        });
      }

      return res.status(200).json({
        message: "Ward deleted successfully",
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