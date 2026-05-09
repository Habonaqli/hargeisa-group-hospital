import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

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
    const { email, password } = body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const client = await clientPromise;
    const db = client.db("hospital");

    const user = await db.collection("users").findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.status !== "Active") {
      return res.status(403).json({
        message: "Your account is waiting for admin approval.",
      });
    }

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}