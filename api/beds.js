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

function toObjectId(id) {
  if (!id) return null;
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

function generateBedCode() {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BED-${year}-${random}`;
}

function cleanBed(bed) {
  return {
    _id: bed._id?.toString(),

    bedCode: bed.bedCode || "",
    bedNumber: bed.bedNumber || "",

    wardId: bed.wardId?.toString() || "",
    wardName: bed.wardName || "",
    wardCode: bed.wardCode || "",

    bedType: bed.bedType || "General",
    status: bed.status || "Available",

    patientId: bed.patientId?.toString() || "",
    patientName: bed.patientName || "",

    notes: bed.notes || "",

    createdAt: bed.createdAt || null,
    updatedAt: bed.updatedAt || null,
  };
}

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("hospital");

    const bedsCollection = db.collection("beds");
    const wardsCollection = db.collection("wards");
    const patientsCollection = db.collection("patients");

    // GET: list beds
    if (req.method === "GET") {
      const {
        search = "",
        status = "",
        bedType = "",
        wardId = "",
      } = req.query;

      const filter = {};

      if (status && status !== "all") {
        filter.status = status;
      }

      if (bedType && bedType !== "all") {
        filter.bedType = bedType;
      }

      if (wardId && ObjectId.isValid(wardId)) {
        filter.wardId = new ObjectId(wardId);
      }

      if (search) {
        filter.$or = [
          { bedCode: { $regex: search, $options: "i" } },
          { bedNumber: { $regex: search, $options: "i" } },
          { wardName: { $regex: search, $options: "i" } },
          { wardCode: { $regex: search, $options: "i" } },
          { bedType: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
          { patientName: { $regex: search, $options: "i" } },
          { notes: { $regex: search, $options: "i" } },
        ];
      }

      const beds = await bedsCollection
        .find(filter)
        .sort({ wardName: 1, bedNumber: 1, createdAt: -1 })
        .toArray();

      return res.status(200).json(beds.map(cleanBed));
    }

    // POST: add bed
    if (req.method === "POST") {
      const body = await getBody(req);

      if (!body.wardId) {
        return res.status(400).json({
          message: "Ward is required",
        });
      }

      if (!body.bedNumber) {
        return res.status(400).json({
          message: "Bed number is required",
        });
      }

      const wardObjectId = toObjectId(body.wardId);

      if (!wardObjectId) {
        return res.status(400).json({
          message: "Invalid ward ID",
        });
      }

      const ward = await wardsCollection.findOne({
        _id: wardObjectId,
      });

      if (!ward) {
        return res.status(404).json({
          message: "Ward not found",
        });
      }

      const existingBedNumber = await bedsCollection.findOne({
        wardId: wardObjectId,
        bedNumber: body.bedNumber,
      });

      if (existingBedNumber) {
        return res.status(409).json({
          message: "This bed number already exists in this ward",
        });
      }

      let patientObjectId = null;
      let patientName = "";

      if (body.patientId) {
        patientObjectId = toObjectId(body.patientId);

        if (!patientObjectId) {
          return res.status(400).json({
            message: "Invalid patient ID",
          });
        }

        const patient = await patientsCollection.findOne({
          _id: patientObjectId,
        });

        if (!patient) {
          return res.status(404).json({
            message: "Patient not found",
          });
        }

        patientName = patient.name || patient.fullName || "";
      }

      const status = body.status || (patientObjectId ? "Occupied" : "Available");

      const newBed = {
        bedCode: body.bedCode || generateBedCode(),
        bedNumber: body.bedNumber,

        wardId: wardObjectId,
        wardName: ward.name || "",
        wardCode: ward.wardCode || "",

        bedType: body.bedType || "General",
        status,

        patientId: patientObjectId,
        patientName,

        notes: body.notes || "",

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingBedCode = await bedsCollection.findOne({
        bedCode: newBed.bedCode,
      });

      if (existingBedCode) {
        return res.status(409).json({
          message: "Bed code already exists",
        });
      }

      const result = await bedsCollection.insertOne(newBed);

      return res.status(201).json({
        message: "Bed added successfully",
        bed: {
          ...cleanBed(newBed),
          _id: result.insertedId.toString(),
        },
      });
    }

    // PUT: update bed
    if (req.method === "PUT") {
      const body = await getBody(req);

      if (!body.id) {
        return res.status(400).json({
          message: "Bed ID is required",
        });
      }

      if (!ObjectId.isValid(body.id)) {
        return res.status(400).json({
          message: "Invalid bed ID",
        });
      }

      const bedId = new ObjectId(body.id);

      const existingBed = await bedsCollection.findOne({
        _id: bedId,
      });

      if (!existingBed) {
        return res.status(404).json({
          message: "Bed not found",
        });
      }

      let wardObjectId = existingBed.wardId;
      let wardName = existingBed.wardName || "";
      let wardCode = existingBed.wardCode || "";

      if (body.wardId) {
        const newWardId = toObjectId(body.wardId);

        if (!newWardId) {
          return res.status(400).json({
            message: "Invalid ward ID",
          });
        }

        const ward = await wardsCollection.findOne({
          _id: newWardId,
        });

        if (!ward) {
          return res.status(404).json({
            message: "Ward not found",
          });
        }

        wardObjectId = newWardId;
        wardName = ward.name || "";
        wardCode = ward.wardCode || "";
      }

      const nextBedNumber = body.bedNumber ?? existingBed.bedNumber ?? "";

      if (!nextBedNumber) {
        return res.status(400).json({
          message: "Bed number is required",
        });
      }

      const duplicateBedNumber = await bedsCollection.findOne({
        _id: { $ne: bedId },
        wardId: wardObjectId,
        bedNumber: nextBedNumber,
      });

      if (duplicateBedNumber) {
        return res.status(409).json({
          message: "This bed number already exists in this ward",
        });
      }

      let patientObjectId = existingBed.patientId || null;
      let patientName = existingBed.patientName || "";

      if (body.patientId !== undefined) {
        if (body.patientId === "" || body.patientId === null) {
          patientObjectId = null;
          patientName = "";
        } else {
          const newPatientId = toObjectId(body.patientId);

          if (!newPatientId) {
            return res.status(400).json({
              message: "Invalid patient ID",
            });
          }

          const patient = await patientsCollection.findOne({
            _id: newPatientId,
          });

          if (!patient) {
            return res.status(404).json({
              message: "Patient not found",
            });
          }

          patientObjectId = newPatientId;
          patientName = patient.name || patient.fullName || "";
        }
      }

      let nextStatus = body.status ?? existingBed.status ?? "Available";

      if (patientObjectId && nextStatus === "Available") {
        nextStatus = "Occupied";
      }

      if (!patientObjectId && nextStatus === "Occupied") {
        return res.status(400).json({
          message: "Cannot set bed as Occupied without assigning a patient",
        });
      }

      const updates = {
        bedCode: body.bedCode ?? existingBed.bedCode ?? "",
        bedNumber: nextBedNumber,

        wardId: wardObjectId,
        wardName,
        wardCode,

        bedType: body.bedType ?? existingBed.bedType ?? "General",
        status: nextStatus,

        patientId: patientObjectId,
        patientName,

        notes: body.notes ?? existingBed.notes ?? "",

        updatedAt: new Date(),
      };

      if (updates.bedCode !== existingBed.bedCode) {
        const duplicateBedCode = await bedsCollection.findOne({
          _id: { $ne: bedId },
          bedCode: updates.bedCode,
        });

        if (duplicateBedCode) {
          return res.status(409).json({
            message: "Bed code already exists",
          });
        }
      }

      await bedsCollection.updateOne(
        { _id: bedId },
        { $set: updates }
      );

      return res.status(200).json({
        message: "Bed updated successfully",
      });
    }

    // DELETE: delete bed
    if (req.method === "DELETE") {
      const body = await getBody(req);

      if (!body.id) {
        return res.status(400).json({
          message: "Bed ID is required",
        });
      }

      if (!ObjectId.isValid(body.id)) {
        return res.status(400).json({
          message: "Invalid bed ID",
        });
      }

      const bedId = new ObjectId(body.id);

      const existingBed = await bedsCollection.findOne({
        _id: bedId,
      });

      if (!existingBed) {
        return res.status(404).json({
          message: "Bed not found",
        });
      }

      if (existingBed.status === "Occupied") {
        return res.status(400).json({
          message: "Cannot delete occupied bed. Discharge or move patient first.",
        });
      }

      const result = await bedsCollection.deleteOne({
        _id: bedId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          message: "Bed not found",
        });
      }

      return res.status(200).json({
        message: "Bed deleted successfully",
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