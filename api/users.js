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

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const client = await clientPromise;
    const db = client.db("hospital");

    const users = await db
      .collection("users")
      .find({})
      .project({
        password: 0,
      })
      .sort({ createdAt: -1 })
      .toArray();

    const formattedUsers = users.map((user) => ({
      ...user,
      _id: user._id instanceof ObjectId ? user._id.toString() : user._id,
    }));

    return res.status(200).json(formattedUsers);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}