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

function cleanAppointment(appointment) {
  return {
    _id: appointment._id?.toString(),

    patientId: appointment.patientId?.toString() || "",
    patientName: appointment.patientName || "",

    doctorId: appointment.doctorId?.toString() || "",
    doctorName: appointment.doctorName || "",

    department: appointment.department || "",
    appointmentDate: appointment.appointmentDate || "",
    appointmentTime: appointment.appointmentTime || "",
    reason: appointment.reason || "",
    notes: appointment.notes || "",

    status: appointment.status || "Scheduled",

    createdAt: appointment.createdAt || null,
    updatedAt: appointment.updatedAt || null,
  };
}

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("hospital");

    const appointmentsCollection = db.collection("appointments");
    const patientsCollection = db.collection("patients");
    const usersCollection = db.collection("users");

    // GET: list appointments
    if (req.method === "GET") {
      const {
        search = "",
        status = "",
        doctorId = "",
        patientId = "",
        date = "",
      } = req.query;

      const filter = {};

      if (status && status !== "all") {
        filter.status = status;
      }

      if (doctorId && ObjectId.isValid(doctorId)) {
        filter.doctorId = new ObjectId(doctorId);
      }

      if (patientId && ObjectId.isValid(patientId)) {
        filter.patientId = new ObjectId(patientId);
      }

      if (date) {
        filter.appointmentDate = date;
      }

      if (search) {
        filter.$or = [
          { patientName: { $regex: search, $options: "i" } },
          { doctorName: { $regex: search, $options: "i" } },
          { department: { $regex: search, $options: "i" } },
          { reason: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
        ];
      }

      const appointments = await appointmentsCollection
        .find(filter)
        .sort({ appointmentDate: -1, appointmentTime: -1, createdAt: -1 })
        .toArray();

      return res.status(200).json(appointments.map(cleanAppointment));
    }

    // POST: create appointment
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

      if (!body.appointmentDate) {
        return res.status(400).json({
          message: "Appointment date is required",
        });
      }

      if (!body.appointmentTime) {
        return res.status(400).json({
          message: "Appointment time is required",
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

      const conflict = await appointmentsCollection.findOne({
        doctorId: doctorObjectId,
        appointmentDate: body.appointmentDate,
        appointmentTime: body.appointmentTime,
        status: {
          $in: ["Scheduled", "Checked In", "In Progress"],
        },
      });

      if (conflict) {
        return res.status(409).json({
          message: "Doctor already has appointment at this date and time",
        });
      }

      const newAppointment = {
        patientId: patientObjectId,
        patientName: patient.name || patient.fullName || "",

        doctorId: doctorObjectId,
        doctorName: doctor.fullName || doctor.name || "",

        department: body.department || doctor.department || "General",
        appointmentDate: body.appointmentDate,
        appointmentTime: body.appointmentTime,
        reason: body.reason || "",
        notes: body.notes || "",

        status: body.status || "Scheduled",

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await appointmentsCollection.insertOne(newAppointment);

      return res.status(201).json({
        message: "Appointment created successfully",
        appointment: {
          ...cleanAppointment(newAppointment),
          _id: result.insertedId.toString(),
        },
      });
    }

    // PUT: update appointment
    if (req.method === "PUT") {
      const body = await getBody(req);

      if (!body.id) {
        return res.status(400).json({
          message: "Appointment ID is required",
        });
      }

      if (!ObjectId.isValid(body.id)) {
        return res.status(400).json({
          message: "Invalid appointment ID",
        });
      }

      const appointmentId = new ObjectId(body.id);

      const existingAppointment = await appointmentsCollection.findOne({
        _id: appointmentId,
      });

      if (!existingAppointment) {
        return res.status(404).json({
          message: "Appointment not found",
        });
      }

      let patientObjectId = existingAppointment.patientId;
      let patientName = existingAppointment.patientName;

      let doctorObjectId = existingAppointment.doctorId;
      let doctorName = existingAppointment.doctorName;

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

      const nextDate = body.appointmentDate || existingAppointment.appointmentDate;
      const nextTime = body.appointmentTime || existingAppointment.appointmentTime;

      const conflict = await appointmentsCollection.findOne({
        _id: { $ne: appointmentId },
        doctorId: doctorObjectId,
        appointmentDate: nextDate,
        appointmentTime: nextTime,
        status: {
          $in: ["Scheduled", "Checked In", "In Progress"],
        },
      });

      if (conflict) {
        return res.status(409).json({
          message: "Doctor already has appointment at this date and time",
        });
      }

      const updates = {
        patientId: patientObjectId,
        patientName,

        doctorId: doctorObjectId,
        doctorName,

        department: body.department || existingAppointment.department || "General",
        appointmentDate: nextDate,
        appointmentTime: nextTime,
        reason: body.reason ?? existingAppointment.reason ?? "",
        notes: body.notes ?? existingAppointment.notes ?? "",
        status: body.status || existingAppointment.status || "Scheduled",

        updatedAt: new Date(),
      };

      await appointmentsCollection.updateOne(
        { _id: appointmentId },
        { $set: updates }
      );

      return res.status(200).json({
        message: "Appointment updated successfully",
      });
    }

    // DELETE: delete appointment
    if (req.method === "DELETE") {
      const body = await getBody(req);

      if (!body.id) {
        return res.status(400).json({
          message: "Appointment ID is required",
        });
      }

      if (!ObjectId.isValid(body.id)) {
        return res.status(400).json({
          message: "Invalid appointment ID",
        });
      }

      const result = await appointmentsCollection.deleteOne({
        _id: new ObjectId(body.id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          message: "Appointment not found",
        });
      }

      return res.status(200).json({
        message: "Appointment deleted successfully",
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