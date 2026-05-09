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

function formatPatient(patient) {
  return {
    ...patient,
    _id: patient._id instanceof ObjectId ? patient._id.toString() : patient._id,
  };
}

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("hospital");
    const collection = db.collection("patients");

    // GET: fetch all patients
    if (req.method === "GET") {
      const patients = await collection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json(patients.map(formatPatient));
    }

    // POST: add new patient
    if (req.method === "POST") {
      const body = await getBody(req);

      if (!body || !body.name) {
        return res.status(400).json({
          message: "Patient name is required",
        });
      }

      const newPatient = {
        name: body.name || "",
        age: body.age || "",
        gender: body.gender || "",
        phone: body.phone || "",
        address: body.address || "",
        department: body.department || "",
        doctor: body.doctor || "",
        diagnosis: body.diagnosis || "",
        status: body.status || "Active",
        notes: body.notes || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(newPatient);

      return res.status(201).json({
        message: "Patient added successfully",
        patient: {
          ...newPatient,
          _id: result.insertedId.toString(),
        },
      });
    }

    // PUT: update patient
    if (req.method === "PUT") {
      const body = await getBody(req);
      const { id, ...updates } = body;

      if (!id) {
        return res.status(400).json({
          message: "Patient id is required",
        });
      }

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid patient id",
        });
      }

      const allowedUpdates = {
        name: updates.name || "",
        age: updates.age || "",
        gender: updates.gender || "",
        phone: updates.phone || "",
        address: updates.address || "",
        department: updates.department || "",
        doctor: updates.doctor || "",
        diagnosis: updates.diagnosis || "",
        status: updates.status || "Active",
        notes: updates.notes || "",
        updatedAt: new Date(),
      };

      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: allowedUpdates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          message: "Patient not found",
        });
      }

      return res.status(200).json({
        message: "Patient updated successfully",
      });
    }

    // DELETE: delete patient
    if (req.method === "DELETE") {
      const body = await getBody(req);
      const { id } = body;

      if (!id) {
        return res.status(400).json({
          message: "Patient id is required",
        });
      }

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid patient id",
        });
      }

      const result = await collection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          message: "Patient not found",
        });
      }

      return res.status(200).json({
        message: "Patient deleted successfully",
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