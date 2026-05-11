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

function calculateStatus(totalAmount, paidAmount) {
  const total = Number(totalAmount || 0);
  const paid = Number(paidAmount || 0);

  if (paid <= 0) return "Unpaid";
  if (paid >= total) return "Paid";
  return "Partial";
}

function cleanBilling(invoice) {
  return {
    _id: invoice._id?.toString(),

    invoiceNo: invoice.invoiceNo || "",

    patientId: invoice.patientId?.toString() || "",
    patientName: invoice.patientName || "",

    appointmentId: invoice.appointmentId?.toString() || "",
    appointmentDate: invoice.appointmentDate || "",
    appointmentTime: invoice.appointmentTime || "",

    serviceName: invoice.serviceName || "",
    department: invoice.department || "",
    description: invoice.description || "",

    totalAmount: Number(invoice.totalAmount || 0),
    paidAmount: Number(invoice.paidAmount || 0),
    balance: Number(invoice.balance || 0),

    paymentMethod: invoice.paymentMethod || "",
    status: invoice.status || "Unpaid",

    notes: invoice.notes || "",

    createdAt: invoice.createdAt || null,
    updatedAt: invoice.updatedAt || null,
  };
}

function generateInvoiceNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `INV-${year}${month}${day}-${random}`;
}

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("hospital");

    const billingCollection = db.collection("billing");
    const patientsCollection = db.collection("patients");
    const appointmentsCollection = db.collection("appointments");

    // GET: list billing invoices
    if (req.method === "GET") {
      const {
        search = "",
        status = "",
        patientId = "",
        appointmentId = "",
      } = req.query;

      const filter = {};

      if (status && status !== "all") {
        filter.status = status;
      }

      if (patientId && ObjectId.isValid(patientId)) {
        filter.patientId = new ObjectId(patientId);
      }

      if (appointmentId && ObjectId.isValid(appointmentId)) {
        filter.appointmentId = new ObjectId(appointmentId);
      }

      if (search) {
        filter.$or = [
          { invoiceNo: { $regex: search, $options: "i" } },
          { patientName: { $regex: search, $options: "i" } },
          { serviceName: { $regex: search, $options: "i" } },
          { department: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
          { paymentMethod: { $regex: search, $options: "i" } },
        ];
      }

      const invoices = await billingCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json(invoices.map(cleanBilling));
    }

    // POST: create invoice
    if (req.method === "POST") {
      const body = await getBody(req);

      if (!body.patientId) {
        return res.status(400).json({
          message: "Patient is required",
        });
      }

      if (!body.serviceName) {
        return res.status(400).json({
          message: "Service name is required",
        });
      }

      if (body.totalAmount === undefined || Number(body.totalAmount) < 0) {
        return res.status(400).json({
          message: "Valid total amount is required",
        });
      }

      const patientObjectId = toObjectId(body.patientId);

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

      let appointmentObjectId = null;
      let appointmentDate = "";
      let appointmentTime = "";

      if (body.appointmentId) {
        appointmentObjectId = toObjectId(body.appointmentId);

        if (!appointmentObjectId) {
          return res.status(400).json({
            message: "Invalid appointment ID",
          });
        }

        const appointment = await appointmentsCollection.findOne({
          _id: appointmentObjectId,
        });

        if (!appointment) {
          return res.status(404).json({
            message: "Appointment not found",
          });
        }

        appointmentDate = appointment.appointmentDate || "";
        appointmentTime = appointment.appointmentTime || "";
      }

      const totalAmount = Number(body.totalAmount || 0);
      const paidAmount = Number(body.paidAmount || 0);
      const balance = Math.max(totalAmount - paidAmount, 0);
      const status = body.status || calculateStatus(totalAmount, paidAmount);

      const newInvoice = {
        invoiceNo: body.invoiceNo || generateInvoiceNo(),

        patientId: patientObjectId,
        patientName: patient.name || patient.fullName || "",

        appointmentId: appointmentObjectId,
        appointmentDate,
        appointmentTime,

        serviceName: body.serviceName || "",
        department: body.department || "",
        description: body.description || "",

        totalAmount,
        paidAmount,
        balance,

        paymentMethod: body.paymentMethod || "",
        status,

        notes: body.notes || "",

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await billingCollection.insertOne(newInvoice);

      return res.status(201).json({
        message: "Invoice created successfully",
        invoice: {
          ...cleanBilling(newInvoice),
          _id: result.insertedId.toString(),
        },
      });
    }

    // PUT: update invoice
    if (req.method === "PUT") {
      const body = await getBody(req);

      if (!body.id) {
        return res.status(400).json({
          message: "Invoice ID is required",
        });
      }

      if (!ObjectId.isValid(body.id)) {
        return res.status(400).json({
          message: "Invalid invoice ID",
        });
      }

      const invoiceId = new ObjectId(body.id);

      const existingInvoice = await billingCollection.findOne({
        _id: invoiceId,
      });

      if (!existingInvoice) {
        return res.status(404).json({
          message: "Invoice not found",
        });
      }

      let patientObjectId = existingInvoice.patientId;
      let patientName = existingInvoice.patientName;

      if (body.patientId) {
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

      let appointmentObjectId = existingInvoice.appointmentId || null;
      let appointmentDate = existingInvoice.appointmentDate || "";
      let appointmentTime = existingInvoice.appointmentTime || "";

      if (body.appointmentId) {
        const newAppointmentId = toObjectId(body.appointmentId);

        if (!newAppointmentId) {
          return res.status(400).json({
            message: "Invalid appointment ID",
          });
        }

        const appointment = await appointmentsCollection.findOne({
          _id: newAppointmentId,
        });

        if (!appointment) {
          return res.status(404).json({
            message: "Appointment not found",
          });
        }

        appointmentObjectId = newAppointmentId;
        appointmentDate = appointment.appointmentDate || "";
        appointmentTime = appointment.appointmentTime || "";
      }

      const totalAmount =
        body.totalAmount !== undefined
          ? Number(body.totalAmount)
          : Number(existingInvoice.totalAmount || 0);

      const paidAmount =
        body.paidAmount !== undefined
          ? Number(body.paidAmount)
          : Number(existingInvoice.paidAmount || 0);

      const balance = Math.max(totalAmount - paidAmount, 0);
      const status = body.status || calculateStatus(totalAmount, paidAmount);

      const updates = {
        patientId: patientObjectId,
        patientName,

        appointmentId: appointmentObjectId,
        appointmentDate,
        appointmentTime,

        serviceName: body.serviceName ?? existingInvoice.serviceName ?? "",
        department: body.department ?? existingInvoice.department ?? "",
        description: body.description ?? existingInvoice.description ?? "",

        totalAmount,
        paidAmount,
        balance,

        paymentMethod: body.paymentMethod ?? existingInvoice.paymentMethod ?? "",
        status,

        notes: body.notes ?? existingInvoice.notes ?? "",

        updatedAt: new Date(),
      };

      await billingCollection.updateOne(
        { _id: invoiceId },
        { $set: updates }
      );

      return res.status(200).json({
        message: "Invoice updated successfully",
      });
    }

    // DELETE: delete invoice
    if (req.method === "DELETE") {
      const body = await getBody(req);

      if (!body.id) {
        return res.status(400).json({
          message: "Invoice ID is required",
        });
      }

      if (!ObjectId.isValid(body.id)) {
        return res.status(400).json({
          message: "Invalid invoice ID",
        });
      }

      const result = await billingCollection.deleteOne({
        _id: new ObjectId(body.id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          message: "Invoice not found",
        });
      }

      return res.status(200).json({
        message: "Invoice deleted successfully",
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