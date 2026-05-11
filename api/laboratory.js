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

function generateLabNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `LAB-${year}${month}${day}-${random}`;
}

function cleanLab(lab) {
  return {
    _id: lab._id?.toString(),

    labNo: lab.labNo || "",

    patientId: lab.patientId?.toString() || "",
    patientName: lab.patientName || "",

    doctorId: lab.doctorId?.toString() || "",
    doctorName: lab.doctorName || "",

    appointmentId: lab.appointmentId?.toString() || "",
    appointmentDate: lab.appointmentDate || "",
    appointmentTime: lab.appointmentTime || "",

    testName: lab.testName || "",
    testCategory: lab.testCategory || "",
    sampleType: lab.sampleType || "",

    priority: lab.priority || "Normal",
    urgent: Boolean(lab.urgent),

    status: lab.status || "Pending",

    result: lab.result || "",
    resultSummary: lab.resultSummary || "",
    referenceRange: lab.referenceRange || "",
    resultStatus: lab.resultStatus || "",

    requestedAt: lab.requestedAt || null,
    collectedAt: lab.collectedAt || null,
    completedAt: lab.completedAt || null,

    notes: lab.notes || "",

    createdAt: lab.createdAt || null,
    updatedAt: lab.updatedAt || null,
  };
}

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("hospital");

    const laboratoryCollection = db.collection("laboratory");
    const patientsCollection = db.collection("patients");
    const usersCollection = db.collection("users");
    const appointmentsCollection = db.collection("appointments");

    // GET: list laboratory records
    if (req.method === "GET") {
      const {
        search = "",
        status = "",
        priority = "",
        patientId = "",
        doctorId = "",
        urgent = "",
      } = req.query;

      const filter = {};

      if (status && status !== "all") {
        filter.status = status;
      }

      if (priority && priority !== "all") {
        filter.priority = priority;
      }

      if (urgent === "true") {
        filter.urgent = true;
      }

      if (urgent === "false") {
        filter.urgent = false;
      }

      if (patientId && ObjectId.isValid(patientId)) {
        filter.patientId = new ObjectId(patientId);
      }

      if (doctorId && ObjectId.isValid(doctorId)) {
        filter.doctorId = new ObjectId(doctorId);
      }

      if (search) {
        filter.$or = [
          { labNo: { $regex: search, $options: "i" } },
          { patientName: { $regex: search, $options: "i" } },
          { doctorName: { $regex: search, $options: "i" } },
          { testName: { $regex: search, $options: "i" } },
          { testCategory: { $regex: search, $options: "i" } },
          { sampleType: { $regex: search, $options: "i" } },
          { result: { $regex: search, $options: "i" } },
          { resultSummary: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
          { notes: { $regex: search, $options: "i" } },
        ];
      }

      const labs = await laboratoryCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json(labs.map(cleanLab));
    }

    // POST: create laboratory request
    if (req.method === "POST") {
      const body = await getBody(req);

      if (!body.patientId) {
        return res.status(400).json({
          message: "Patient is required",
        });
      }

      if (!body.doctorId) {
        return res.status(400).json({
          message: "Doctor is required",
        });
      }

      if (!body.testName) {
        return res.status(400).json({
          message: "Test name is required",
        });
      }

      if (!body.sampleType) {
        return res.status(400).json({
          message: "Sample type is required",
        });
      }

      const patientObjectId = toObjectId(body.patientId);
      const doctorObjectId = toObjectId(body.doctorId);

      if (!patientObjectId) {
        return res.status(400).json({
          message: "Invalid patient ID",
        });
      }

      if (!doctorObjectId) {
        return res.status(400).json({
          message: "Invalid doctor ID",
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

      const doctor = await usersCollection.findOne({
        _id: doctorObjectId,
        role: "doctor",
        status: "Active",
      });

      if (!doctor) {
        return res.status(404).json({
          message: "Doctor not found or not active",
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

      const priority = body.priority || "Normal";
      const urgent = body.urgent === true || priority === "Urgent" || priority === "STAT";

      const newLab = {
        labNo: body.labNo || generateLabNo(),

        patientId: patientObjectId,
        patientName: patient.name || patient.fullName || "",

        doctorId: doctorObjectId,
        doctorName: doctor.fullName || doctor.name || "",

        appointmentId: appointmentObjectId,
        appointmentDate,
        appointmentTime,

        testName: body.testName || "",
        testCategory: body.testCategory || "General",
        sampleType: body.sampleType || "",

        priority,
        urgent,

        status: body.status || "Pending",

        result: body.result || "",
        resultSummary: body.resultSummary || "",
        referenceRange: body.referenceRange || "",
        resultStatus: body.resultStatus || "",

        requestedAt: new Date(),
        collectedAt: body.collectedAt || null,
        completedAt: body.completedAt || null,

        notes: body.notes || "",

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingLabNo = await laboratoryCollection.findOne({
        labNo: newLab.labNo,
      });

      if (existingLabNo) {
        return res.status(409).json({
          message: "Lab number already exists",
        });
      }

      const result = await laboratoryCollection.insertOne(newLab);

      return res.status(201).json({
        message: "Lab request created successfully",
        lab: {
          ...cleanLab(newLab),
          _id: result.insertedId.toString(),
        },
      });
    }

    // PUT: update laboratory record/result
    if (req.method === "PUT") {
      const body = await getBody(req);

      if (!body.id) {
        return res.status(400).json({
          message: "Lab ID is required",
        });
      }

      if (!ObjectId.isValid(body.id)) {
        return res.status(400).json({
          message: "Invalid lab ID",
        });
      }

      const labId = new ObjectId(body.id);

      const existingLab = await laboratoryCollection.findOne({
        _id: labId,
      });

      if (!existingLab) {
        return res.status(404).json({
          message: "Lab record not found",
        });
      }

      let patientObjectId = existingLab.patientId;
      let patientName = existingLab.patientName;

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

      let doctorObjectId = existingLab.doctorId;
      let doctorName = existingLab.doctorName;

      if (body.doctorId) {
        const newDoctorId = toObjectId(body.doctorId);

        if (!newDoctorId) {
          return res.status(400).json({
            message: "Invalid doctor ID",
          });
        }

        const doctor = await usersCollection.findOne({
          _id: newDoctorId,
          role: "doctor",
          status: "Active",
        });

        if (!doctor) {
          return res.status(404).json({
            message: "Doctor not found or not active",
          });
        }

        doctorObjectId = newDoctorId;
        doctorName = doctor.fullName || doctor.name || "";
      }

      let appointmentObjectId = existingLab.appointmentId || null;
      let appointmentDate = existingLab.appointmentDate || "";
      let appointmentTime = existingLab.appointmentTime || "";

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

      const nextPriority = body.priority ?? existingLab.priority ?? "Normal";
      const nextStatus = body.status ?? existingLab.status ?? "Pending";
      const nextUrgent =
        body.urgent !== undefined
          ? Boolean(body.urgent)
          : nextPriority === "Urgent" || nextPriority === "STAT";

      let collectedAt = existingLab.collectedAt || null;
      let completedAt = existingLab.completedAt || null;

      if (nextStatus === "In Progress" && !collectedAt) {
        collectedAt = new Date();
      }

      if (nextStatus === "Completed" && !completedAt) {
        completedAt = new Date();
      }

      const updates = {
        patientId: patientObjectId,
        patientName,

        doctorId: doctorObjectId,
        doctorName,

        appointmentId: appointmentObjectId,
        appointmentDate,
        appointmentTime,

        testName: body.testName ?? existingLab.testName ?? "",
        testCategory: body.testCategory ?? existingLab.testCategory ?? "General",
        sampleType: body.sampleType ?? existingLab.sampleType ?? "",

        priority: nextPriority,
        urgent: nextUrgent,

        status: nextStatus,

        result: body.result ?? existingLab.result ?? "",
        resultSummary: body.resultSummary ?? existingLab.resultSummary ?? "",
        referenceRange: body.referenceRange ?? existingLab.referenceRange ?? "",
        resultStatus: body.resultStatus ?? existingLab.resultStatus ?? "",

        collectedAt,
        completedAt,

        notes: body.notes ?? existingLab.notes ?? "",

        updatedAt: new Date(),
      };

      await laboratoryCollection.updateOne(
        { _id: labId },
        { $set: updates }
      );

      return res.status(200).json({
        message: "Lab record updated successfully",
      });
    }

    // DELETE: delete laboratory record
    if (req.method === "DELETE") {
      const body = await getBody(req);

      if (!body.id) {
        return res.status(400).json({
          message: "Lab ID is required",
        });
      }

      if (!ObjectId.isValid(body.id)) {
        return res.status(400).json({
          message: "Invalid lab ID",
        });
      }

      const result = await laboratoryCollection.deleteOne({
        _id: new ObjectId(body.id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          message: "Lab record not found",
        });
      }

      return res.status(200).json({
        message: "Lab record deleted successfully",
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