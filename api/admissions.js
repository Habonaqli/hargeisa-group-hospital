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

function generateAdmissionNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `ADM-${year}${month}${day}-${random}`;
}

function cleanAdmission(admission) {
  return {
    _id: admission._id?.toString(),

    admissionNo: admission.admissionNo || "",

    patientId: admission.patientId?.toString() || "",
    patientName: admission.patientName || "",

    doctorId: admission.doctorId?.toString() || "",
    doctorName: admission.doctorName || "",

    wardId: admission.wardId?.toString() || "",
    wardName: admission.wardName || "",
    wardCode: admission.wardCode || "",

    bedId: admission.bedId?.toString() || "",
    bedNumber: admission.bedNumber || "",
    bedCode: admission.bedCode || "",

    admissionDate: admission.admissionDate || "",
    admissionTime: admission.admissionTime || "",

    diagnosis: admission.diagnosis || "",
    reason: admission.reason || "",
    condition: admission.condition || "Stable",

    status: admission.status || "Admitted",

    notes: admission.notes || "",

    createdAt: admission.createdAt || null,
    updatedAt: admission.updatedAt || null,
    dischargedAt: admission.dischargedAt || null,
  };
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function currentTime() {
  return new Date().toTimeString().slice(0, 5);
}

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("hospital");

    const admissionsCollection = db.collection("admissions");
    const patientsCollection = db.collection("patients");
    const usersCollection = db.collection("users");
    const wardsCollection = db.collection("wards");
    const bedsCollection = db.collection("beds");

    // GET: list admissions
    if (req.method === "GET") {
      const {
        search = "",
        status = "",
        patientId = "",
        doctorId = "",
        wardId = "",
        bedId = "",
      } = req.query;

      const filter = {};

      if (status && status !== "all") {
        filter.status = status;
      }

      if (patientId && ObjectId.isValid(patientId)) {
        filter.patientId = new ObjectId(patientId);
      }

      if (doctorId && ObjectId.isValid(doctorId)) {
        filter.doctorId = new ObjectId(doctorId);
      }

      if (wardId && ObjectId.isValid(wardId)) {
        filter.wardId = new ObjectId(wardId);
      }

      if (bedId && ObjectId.isValid(bedId)) {
        filter.bedId = new ObjectId(bedId);
      }

      if (search) {
        filter.$or = [
          { admissionNo: { $regex: search, $options: "i" } },
          { patientName: { $regex: search, $options: "i" } },
          { doctorName: { $regex: search, $options: "i" } },
          { wardName: { $regex: search, $options: "i" } },
          { wardCode: { $regex: search, $options: "i" } },
          { bedNumber: { $regex: search, $options: "i" } },
          { bedCode: { $regex: search, $options: "i" } },
          { diagnosis: { $regex: search, $options: "i" } },
          { reason: { $regex: search, $options: "i" } },
          { condition: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
          { notes: { $regex: search, $options: "i" } },
        ];
      }

      const admissions = await admissionsCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json(admissions.map(cleanAdmission));
    }

    // POST: admit patient
    if (req.method === "POST") {
      const body = await getBody(req);

      if (!body.patientId) {
        return res.status(400).json({
          message: "Patient is required",
        });
      }

      if (!body.wardId) {
        return res.status(400).json({
          message: "Ward is required",
        });
      }

      if (!body.bedId) {
        return res.status(400).json({
          message: "Bed is required",
        });
      }

      const patientObjectId = toObjectId(body.patientId);
      const wardObjectId = toObjectId(body.wardId);
      const bedObjectId = toObjectId(body.bedId);

      if (!patientObjectId) {
        return res.status(400).json({
          message: "Invalid patient ID",
        });
      }

      if (!wardObjectId) {
        return res.status(400).json({
          message: "Invalid ward ID",
        });
      }

      if (!bedObjectId) {
        return res.status(400).json({
          message: "Invalid bed ID",
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

      const ward = await wardsCollection.findOne({
        _id: wardObjectId,
      });

      if (!ward) {
        return res.status(404).json({
          message: "Ward not found",
        });
      }

      const bed = await bedsCollection.findOne({
        _id: bedObjectId,
      });

      if (!bed) {
        return res.status(404).json({
          message: "Bed not found",
        });
      }

      if (String(bed.wardId) !== String(wardObjectId)) {
        return res.status(400).json({
          message: "Selected bed does not belong to selected ward",
        });
      }

      if (bed.status === "Occupied") {
        return res.status(409).json({
          message: "Bed is already occupied",
        });
      }

      if (bed.status === "Maintenance") {
        return res.status(409).json({
          message: "Bed is under maintenance",
        });
      }

      const activeAdmission = await admissionsCollection.findOne({
        patientId: patientObjectId,
        status: "Admitted",
      });

      if (activeAdmission) {
        return res.status(409).json({
          message: "Patient already has an active admission",
        });
      }

      let doctorObjectId = null;
      let doctorName = "";

      if (body.doctorId) {
        doctorObjectId = toObjectId(body.doctorId);

        if (!doctorObjectId) {
          return res.status(400).json({
            message: "Invalid doctor ID",
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

        doctorName = doctor.fullName || doctor.name || "";
      }

      const patientName = patient.name || patient.fullName || "";

      const newAdmission = {
        admissionNo: body.admissionNo || generateAdmissionNo(),

        patientId: patientObjectId,
        patientName,

        doctorId: doctorObjectId,
        doctorName,

        wardId: wardObjectId,
        wardName: ward.name || "",
        wardCode: ward.wardCode || "",

        bedId: bedObjectId,
        bedNumber: bed.bedNumber || "",
        bedCode: bed.bedCode || "",

        admissionDate: body.admissionDate || todayDate(),
        admissionTime: body.admissionTime || currentTime(),

        diagnosis: body.diagnosis || "",
        reason: body.reason || "",
        condition: body.condition || "Stable",

        status: "Admitted",

        notes: body.notes || "",

        createdAt: new Date(),
        updatedAt: new Date(),
        dischargedAt: null,
      };

      const existingAdmissionNo = await admissionsCollection.findOne({
        admissionNo: newAdmission.admissionNo,
      });

      if (existingAdmissionNo) {
        return res.status(409).json({
          message: "Admission number already exists",
        });
      }

      const result = await admissionsCollection.insertOne(newAdmission);

      await bedsCollection.updateOne(
        { _id: bedObjectId },
        {
          $set: {
            status: "Occupied",
            patientId: patientObjectId,
            patientName,
            updatedAt: new Date(),
          },
        }
      );

      return res.status(201).json({
        message: "Patient admitted successfully",
        admission: {
          ...cleanAdmission(newAdmission),
          _id: result.insertedId.toString(),
        },
      });
    }

    // PUT: update admission
    if (req.method === "PUT") {
      const body = await getBody(req);

      if (!body.id) {
        return res.status(400).json({
          message: "Admission ID is required",
        });
      }

      if (!ObjectId.isValid(body.id)) {
        return res.status(400).json({
          message: "Invalid admission ID",
        });
      }

      const admissionId = new ObjectId(body.id);

      const existingAdmission = await admissionsCollection.findOne({
        _id: admissionId,
      });

      if (!existingAdmission) {
        return res.status(404).json({
          message: "Admission not found",
        });
      }

      if (existingAdmission.status === "Discharged") {
        return res.status(400).json({
          message: "Cannot update discharged admission",
        });
      }

      let doctorObjectId = existingAdmission.doctorId || null;
      let doctorName = existingAdmission.doctorName || "";

      if (body.doctorId !== undefined) {
        if (!body.doctorId) {
          doctorObjectId = null;
          doctorName = "";
        } else {
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
      }

      const updates = {
        doctorId: doctorObjectId,
        doctorName,

        admissionDate:
          body.admissionDate ?? existingAdmission.admissionDate ?? todayDate(),
        admissionTime:
          body.admissionTime ?? existingAdmission.admissionTime ?? currentTime(),

        diagnosis: body.diagnosis ?? existingAdmission.diagnosis ?? "",
        reason: body.reason ?? existingAdmission.reason ?? "",
        condition: body.condition ?? existingAdmission.condition ?? "Stable",

        status: body.status ?? existingAdmission.status ?? "Admitted",

        notes: body.notes ?? existingAdmission.notes ?? "",

        updatedAt: new Date(),
      };

      await admissionsCollection.updateOne(
        { _id: admissionId },
        { $set: updates }
      );

      return res.status(200).json({
        message: "Admission updated successfully",
      });
    }

    // DELETE: delete admission
    if (req.method === "DELETE") {
      const body = await getBody(req);

      if (!body.id) {
        return res.status(400).json({
          message: "Admission ID is required",
        });
      }

      if (!ObjectId.isValid(body.id)) {
        return res.status(400).json({
          message: "Invalid admission ID",
        });
      }

      const admissionId = new ObjectId(body.id);

      const admission = await admissionsCollection.findOne({
        _id: admissionId,
      });

      if (!admission) {
        return res.status(404).json({
          message: "Admission not found",
        });
      }

      if (admission.status === "Admitted") {
        return res.status(400).json({
          message: "Cannot delete active admission. Discharge patient first.",
        });
      }

      const result = await admissionsCollection.deleteOne({
        _id: admissionId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          message: "Admission not found",
        });
      }

      return res.status(200).json({
        message: "Admission deleted successfully",
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