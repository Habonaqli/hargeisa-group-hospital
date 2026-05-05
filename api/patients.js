import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

let client;
let clientPromise;

if (!uri) {
  throw new Error("Please add MONGODB_URI");
}

if (!clientPromise) {
  client = new MongoClient(uri);
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

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("hospital");
    const collection = db.collection("patients");

    if (req.method === "GET") {
      const patients = await collection.find({}).toArray();
      return res.status(200).json(patients);
    }

    if (req.method === "POST") {
      const body = await getBody(req);

      if (!body || !body.name) {
        return res.status(400).json({
          message: "Patient name is required",
        });
      }

      const result = await collection.insertOne({
        ...body,
        createdAt: new Date(),
      });

      return res.status(201).json({
        message: "Patient added successfully",
        insertedId: result.insertedId,
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