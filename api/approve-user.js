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
  if (req.body) return req.body;

  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const body = await getBody(req);
    const { userId, action, role } = body;

    if (!userId || !action) {
      return res.status(400).json({
        message: "userId and action are required",
      });
    }

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid userId",
      });
    }

    const allowedActions = ["approve", "reject"];
    if (!allowedActions.includes(action)) {
      return res.status(400).json({
        message: "Action must be approve or reject",
      });
    }

    const allowedRoles = ["admin", "doctor", "nurse", "receptionist", "staff"];

    if (action === "approve" && !allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Valid role is required for approval",
      });
    }

    const client = await clientPromise;
    const db = client.db("hospital");

    const updateData =
      action === "approve"
        ? {
            role,
            status: "Active",
            approvedAt: new Date(),
          }
        : {
            role: "rejected",
            status: "Rejected",
            rejectedAt: new Date(),
          };

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: updateData,
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message:
        action === "approve"
          ? "User approved successfully"
          : "User rejected successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}