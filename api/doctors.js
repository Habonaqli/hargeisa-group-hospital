import { MongoClient } from "mongodb";

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

function cleanUser(user) {
  return {
    _id: user._id?.toString(),
    fullName: user.fullName || user.name || "",
    phone: user.phone || "",
    email: user.email || "",
    role: user.role || "",
    status: user.status || "",
    createdAt: user.createdAt || null,
    approvedAt: user.approvedAt || null,
  };
}

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("hospital");
    const usersCollection = db.collection("users");

    if (req.method === "GET") {
      const doctors = await usersCollection
        .find({
          role: "doctor",
          status: "Active",
        })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json(doctors.map(cleanUser));
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