import { MongoClient, ObjectId } from "mongodb";
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

function cleanUser(user) {
  return {
    _id: user._id instanceof ObjectId ? user._id.toString() : user._id,
    fullName: user.fullName || "",
    phone: user.phone || "",
    email: user.email || "",
    role: user.role || "pending",
    status: user.status || "Pending Approval",
    createdAt: user.createdAt || null,
    approvedAt: user.approvedAt || null,
    rejectedAt: user.rejectedAt || null,
    updatedAt: user.updatedAt || null,
    passwordResetAt: user.passwordResetAt || null,
    disabledAt: user.disabledAt || null,
  };
}

function isValidObjectId(id) {
  return id && ObjectId.isValid(id);
}

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("hospital");
    const usersCollection = db.collection("users");

    const allowedRoles = [
      "admin",
      "doctor",
      "nurse",
      "receptionist",
      "staff",
      "pharmacy",
      "laboratory",
      "cashier",
      "pending",
      "rejected",
    ];

    const allowedStatuses = [
      "Active",
      "Pending Approval",
      "Rejected",
      "Disabled",
    ];

    // GET: list users/staff
    if (req.method === "GET") {
      const {
        search = "",
        role = "",
        status = "",
      } = req.query;

      const filter = {};

      if (role && role !== "all") {
        filter.role = role;
      }

      if (status && status !== "all") {
        filter.status = status;
      }

      if (search) {
        filter.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { role: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
        ];
      }

      const users = await usersCollection
        .find(filter)
        .project({ password: 0 })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json(users.map(cleanUser));
    }

    // PUT: edit user account
    if (req.method === "PUT") {
      const body = await getBody(req);
      const { id, fullName, phone, email, role, status } = body;

      if (!id) {
        return res.status(400).json({
          message: "User ID is required",
        });
      }

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      const userId = new ObjectId(id);

      const existingUser = await usersCollection.findOne({
        _id: userId,
      });

      if (!existingUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const updates = {
        fullName: fullName ?? existingUser.fullName ?? "",
        phone: phone ?? existingUser.phone ?? "",
        email: email ? email.toLowerCase() : existingUser.email,
        role: role ?? existingUser.role ?? "pending",
        status: status ?? existingUser.status ?? "Pending Approval",
        updatedAt: new Date(),
      };

      if (!updates.fullName) {
        return res.status(400).json({
          message: "Full name is required",
        });
      }

      if (!updates.phone) {
        return res.status(400).json({
          message: "Phone is required",
        });
      }

      if (!updates.email) {
        return res.status(400).json({
          message: "Email is required",
        });
      }

      if (!allowedRoles.includes(updates.role)) {
        return res.status(400).json({
          message: "Invalid role",
        });
      }

      if (!allowedStatuses.includes(updates.status)) {
        return res.status(400).json({
          message: "Invalid status",
        });
      }

      if (updates.email !== existingUser.email) {
        const duplicateEmail = await usersCollection.findOne({
          _id: { $ne: userId },
          email: updates.email,
        });

        if (duplicateEmail) {
          return res.status(409).json({
            message: "This email is already used by another user",
          });
        }
      }

      await usersCollection.updateOne(
        { _id: userId },
        { $set: updates }
      );

      return res.status(200).json({
        message: "User updated successfully",
      });
    }

    // POST: reset password
    if (req.method === "POST") {
      const body = await getBody(req);
      const { id, newPassword } = body;

      if (!id) {
        return res.status(400).json({
          message: "User ID is required",
        });
      }

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      if (!newPassword) {
        return res.status(400).json({
          message: "New password is required",
        });
      }

      if (String(newPassword).length < 6) {
        return res.status(400).json({
          message: "New password must be at least 6 characters",
        });
      }

      const userId = new ObjectId(id);

      const user = await usersCollection.findOne({
        _id: userId,
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const hashedPassword = await bcrypt.hash(String(newPassword), 10);

      await usersCollection.updateOne(
        { _id: userId },
        {
          $set: {
            password: hashedPassword,
            passwordResetAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      return res.status(200).json({
        message: "Password reset successfully",
      });
    }

    // DELETE: deactivate or delete user
    if (req.method === "DELETE") {
      const body = await getBody(req);
      const { id, mode = "deactivate" } = body;

      if (!id) {
        return res.status(400).json({
          message: "User ID is required",
        });
      }

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      const userId = new ObjectId(id);

      const user = await usersCollection.findOne({
        _id: userId,
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (mode === "delete") {
        const result = await usersCollection.deleteOne({
          _id: userId,
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({
            message: "User not found",
          });
        }

        return res.status(200).json({
          message: "User deleted successfully",
        });
      }

      await usersCollection.updateOne(
        { _id: userId },
        {
          $set: {
            status: "Disabled",
            disabledAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      return res.status(200).json({
        message: "User deactivated successfully",
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