import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;

let client;
let clientPromise;

if (!uri) {
  throw new Error("Please add MONGODB_URI");
}

if (!clientPromise) {
  client = new MongoClient(uri, { tls: true });
  clientPromise = client.connect();
}

async function getBody(req) {
  if (req.body && typeof req.body === "object") return req.body;

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

function toObjectId(id) {
  if (!id) return null;
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function currentTime() {
  return new Date().toTimeString().slice(0, 5);
}

function generateCode(prefix) {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${random}`;
}

function generateAdmissionNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ADM-${year}${month}${day}-${random}`;
}

function calculateAvailableBeds(capacity, occupiedBeds) {
  const cap = Number(capacity || 0);
  const occ = Number(occupiedBeds || 0);
  return Math.max(cap - occ, 0);
}

function cleanWard(ward) {
  return {
    _id: ward._id?.toString(),
    wardCode: ward.wardCode || "",
    name: ward.name || "",
    department: ward.department || "",
    floor: ward.floor || "",
    wardType: ward.wardType || "General",
    capacity: Number(ward.capacity || 0),
    occupiedBeds: Number(ward.occupiedBeds || 0),
    availableBeds: Number(ward.availableBeds || 0),
    status: ward.status || "Active",
    notes: ward.notes || "",
    createdAt: ward.createdAt || null,
    updatedAt: ward.updatedAt || null,
  };
}

function cleanBed(bed) {
  return {
    _id: bed._id?.toString(),
    bedCode: bed.bedCode || "",
    bedNumber: bed.bedNumber || "",
    wardId: bed.wardId?.toString() || "",
    wardName: bed.wardName || "",
    wardCode: bed.wardCode || "",
    bedType: bed.bedType || "General",
    status: bed.status || "Available",
    patientId: bed.patientId?.toString() || "",
    patientName: bed.patientName || "",
    notes: bed.notes || "",
    createdAt: bed.createdAt || null,
    updatedAt: bed.updatedAt || null,
  };
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

function generateDischargeNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `DIS-${year}${month}${day}-${random}`;
}

function cleanDischarge(discharge) {
  return {
    _id: discharge._id?.toString(),
    dischargeNo: discharge.dischargeNo || "",
    admissionId: discharge.admissionId?.toString() || "",
    admissionNo: discharge.admissionNo || "",
    patientId: discharge.patientId?.toString() || "",
    patientName: discharge.patientName || "",
    doctorId: discharge.doctorId?.toString() || "",
    doctorName: discharge.doctorName || "",
    wardId: discharge.wardId?.toString() || "",
    wardName: discharge.wardName || "",
    bedId: discharge.bedId?.toString() || "",
    bedNumber: discharge.bedNumber || "",
    dischargeDate: discharge.dischargeDate || "",
    dischargeTime: discharge.dischargeTime || "",
    dischargeType: discharge.dischargeType || "Recovered",
    finalDiagnosis: discharge.finalDiagnosis || "",
    dischargeSummary: discharge.dischargeSummary || "",
    instructions: discharge.instructions || "",
    followUpDate: discharge.followUpDate || "",
    bedNextStatus: discharge.bedNextStatus || "Cleaning",
    notes: discharge.notes || "",
    createdAt: discharge.createdAt || null,
    updatedAt: discharge.updatedAt || null,
  };
}

/* ───────────────────────────── WARDS ───────────────────────────── */

async function handleWards(req, res, db) {
  const wardsCollection = db.collection("wards");
  const bedsCollection = db.collection("beds");

  if (req.method === "GET") {
    const { search = "", status = "", department = "" } = req.query;

    const filter = {};

    if (status && status !== "all") filter.status = status;
    if (department && department !== "all") filter.department = department;

    if (search) {
      filter.$or = [
        { wardCode: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { floor: { $regex: search, $options: "i" } },
        { wardType: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    const wards = await wardsCollection.find(filter).sort({ createdAt: -1 }).toArray();

    const cleaned = await Promise.all(
      wards.map(async (ward) => {
        const occupiedBeds = await bedsCollection.countDocuments({
          wardId: ward._id,
          status: "Occupied",
        });

        const allBeds = await bedsCollection.countDocuments({
          wardId: ward._id,
        });

        const capacity = allBeds > 0 ? allBeds : Number(ward.capacity || 0);
        const availableBeds = calculateAvailableBeds(capacity, occupiedBeds);

        return cleanWard({
          ...ward,
          capacity,
          occupiedBeds,
          availableBeds,
        });
      })
    );

    return res.status(200).json(cleaned);
  }

  if (req.method === "POST") {
    const body = await getBody(req);

    if (!body.name) return res.status(400).json({ message: "Ward name is required" });
    if (!body.department) return res.status(400).json({ message: "Department is required" });

    const capacity = Number(body.capacity || 0);

    if (capacity < 0) {
      return res.status(400).json({ message: "Capacity cannot be negative" });
    }

    const newWard = {
      wardCode: body.wardCode || generateCode("WARD"),
      name: body.name,
      department: body.department,
      floor: body.floor || "",
      wardType: body.wardType || "General",
      capacity,
      occupiedBeds: 0,
      availableBeds: capacity,
      status: body.status || "Active",
      notes: body.notes || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const duplicate = await wardsCollection.findOne({ wardCode: newWard.wardCode });

    if (duplicate) {
      return res.status(409).json({ message: "Ward code already exists" });
    }

    const result = await wardsCollection.insertOne(newWard);

    return res.status(201).json({
      message: "Ward added successfully",
      ward: { ...cleanWard(newWard), _id: result.insertedId.toString() },
    });
  }

  if (req.method === "PUT") {
    const body = await getBody(req);

    if (!body.id) return res.status(400).json({ message: "Ward ID is required" });
    if (!ObjectId.isValid(body.id)) return res.status(400).json({ message: "Invalid ward ID" });

    const wardId = new ObjectId(body.id);
    const existingWard = await wardsCollection.findOne({ _id: wardId });

    if (!existingWard) return res.status(404).json({ message: "Ward not found" });

    const capacity =
      body.capacity !== undefined ? Number(body.capacity) : Number(existingWard.capacity || 0);

    if (capacity < 0) {
      return res.status(400).json({ message: "Capacity cannot be negative" });
    }

    const occupiedBeds = await bedsCollection.countDocuments({
      wardId,
      status: "Occupied",
    });

    if (capacity < occupiedBeds) {
      return res.status(400).json({
        message: "Capacity cannot be less than occupied beds",
      });
    }

    const updates = {
      wardCode: body.wardCode ?? existingWard.wardCode ?? "",
      name: body.name ?? existingWard.name ?? "",
      department: body.department ?? existingWard.department ?? "",
      floor: body.floor ?? existingWard.floor ?? "",
      wardType: body.wardType ?? existingWard.wardType ?? "General",
      capacity,
      occupiedBeds,
      availableBeds: calculateAvailableBeds(capacity, occupiedBeds),
      status: body.status ?? existingWard.status ?? "Active",
      notes: body.notes ?? existingWard.notes ?? "",
      updatedAt: new Date(),
    };

    if (updates.wardCode !== existingWard.wardCode) {
      const duplicate = await wardsCollection.findOne({
        wardCode: updates.wardCode,
        _id: { $ne: wardId },
      });

      if (duplicate) {
        return res.status(409).json({ message: "Ward code already exists" });
      }
    }

    await wardsCollection.updateOne({ _id: wardId }, { $set: updates });

    return res.status(200).json({ message: "Ward updated successfully" });
  }

  if (req.method === "DELETE") {
    const body = await getBody(req);

    if (!body.id) return res.status(400).json({ message: "Ward ID is required" });
    if (!ObjectId.isValid(body.id)) return res.status(400).json({ message: "Invalid ward ID" });

    const wardId = new ObjectId(body.id);

    const bedCount = await bedsCollection.countDocuments({ wardId });

    if (bedCount > 0) {
      return res.status(400).json({
        message: "Cannot delete ward because it has beds. Delete or move beds first.",
      });
    }

    const result = await wardsCollection.deleteOne({ _id: wardId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Ward not found" });
    }

    return res.status(200).json({ message: "Ward deleted successfully" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}

/* ───────────────────────────── BEDS ───────────────────────────── */

async function handleBeds(req, res, db) {
  const bedsCollection = db.collection("beds");
  const wardsCollection = db.collection("wards");
  const patientsCollection = db.collection("patients");

  if (req.method === "GET") {
    const { search = "", status = "", bedType = "", wardId = "" } = req.query;

    const filter = {};

    if (status && status !== "all") filter.status = status;
    if (bedType && bedType !== "all") filter.bedType = bedType;

    if (wardId && ObjectId.isValid(wardId)) {
      filter.wardId = new ObjectId(wardId);
    }

    if (search) {
      filter.$or = [
        { bedCode: { $regex: search, $options: "i" } },
        { bedNumber: { $regex: search, $options: "i" } },
        { wardName: { $regex: search, $options: "i" } },
        { wardCode: { $regex: search, $options: "i" } },
        { bedType: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
        { patientName: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    const beds = await bedsCollection
      .find(filter)
      .sort({ wardName: 1, bedNumber: 1, createdAt: -1 })
      .toArray();

    return res.status(200).json(beds.map(cleanBed));
  }

  if (req.method === "POST") {
    const body = await getBody(req);

    if (!body.wardId) return res.status(400).json({ message: "Ward is required" });
    if (!body.bedNumber) return res.status(400).json({ message: "Bed number is required" });

    const wardObjectId = toObjectId(body.wardId);

    if (!wardObjectId) return res.status(400).json({ message: "Invalid ward ID" });

    const ward = await wardsCollection.findOne({ _id: wardObjectId });

    if (!ward) return res.status(404).json({ message: "Ward not found" });

    const existingBedNumber = await bedsCollection.findOne({
      wardId: wardObjectId,
      bedNumber: body.bedNumber,
    });

    if (existingBedNumber) {
      return res.status(409).json({
        message: "This bed number already exists in this ward",
      });
    }

    let patientObjectId = null;
    let patientName = "";

    if (body.patientId) {
      patientObjectId = toObjectId(body.patientId);

      if (!patientObjectId) return res.status(400).json({ message: "Invalid patient ID" });

      const patient = await patientsCollection.findOne({ _id: patientObjectId });

      if (!patient) return res.status(404).json({ message: "Patient not found" });

      patientName = patient.name || patient.fullName || "";
    }

    const status = body.status || (patientObjectId ? "Occupied" : "Available");

    const newBed = {
      bedCode: body.bedCode || generateCode("BED"),
      bedNumber: body.bedNumber,
      wardId: wardObjectId,
      wardName: ward.name || "",
      wardCode: ward.wardCode || "",
      bedType: body.bedType || "General",
      status,
      patientId: patientObjectId,
      patientName,
      notes: body.notes || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingBedCode = await bedsCollection.findOne({ bedCode: newBed.bedCode });

    if (existingBedCode) {
      return res.status(409).json({ message: "Bed code already exists" });
    }

    const result = await bedsCollection.insertOne(newBed);

    return res.status(201).json({
      message: "Bed added successfully",
      bed: { ...cleanBed(newBed), _id: result.insertedId.toString() },
    });
  }

  if (req.method === "PUT") {
    const body = await getBody(req);

    if (!body.id) return res.status(400).json({ message: "Bed ID is required" });
    if (!ObjectId.isValid(body.id)) return res.status(400).json({ message: "Invalid bed ID" });

    const bedId = new ObjectId(body.id);
    const existingBed = await bedsCollection.findOne({ _id: bedId });

    if (!existingBed) return res.status(404).json({ message: "Bed not found" });

    let wardObjectId = existingBed.wardId;
    let wardName = existingBed.wardName || "";
    let wardCode = existingBed.wardCode || "";

    if (body.wardId) {
      const newWardId = toObjectId(body.wardId);

      if (!newWardId) return res.status(400).json({ message: "Invalid ward ID" });

      const ward = await wardsCollection.findOne({ _id: newWardId });

      if (!ward) return res.status(404).json({ message: "Ward not found" });

      wardObjectId = newWardId;
      wardName = ward.name || "";
      wardCode = ward.wardCode || "";
    }

    const nextBedNumber = body.bedNumber ?? existingBed.bedNumber ?? "";

    if (!nextBedNumber) {
      return res.status(400).json({ message: "Bed number is required" });
    }

    const duplicateBedNumber = await bedsCollection.findOne({
      _id: { $ne: bedId },
      wardId: wardObjectId,
      bedNumber: nextBedNumber,
    });

    if (duplicateBedNumber) {
      return res.status(409).json({
        message: "This bed number already exists in this ward",
      });
    }

    let patientObjectId = existingBed.patientId || null;
    let patientName = existingBed.patientName || "";

    if (body.patientId !== undefined) {
      if (body.patientId === "" || body.patientId === null) {
        patientObjectId = null;
        patientName = "";
      } else {
        const newPatientId = toObjectId(body.patientId);

        if (!newPatientId) return res.status(400).json({ message: "Invalid patient ID" });

        const patient = await patientsCollection.findOne({ _id: newPatientId });

        if (!patient) return res.status(404).json({ message: "Patient not found" });

        patientObjectId = newPatientId;
        patientName = patient.name || patient.fullName || "";
      }
    }

    let nextStatus = body.status ?? existingBed.status ?? "Available";

    if (patientObjectId && nextStatus === "Available") nextStatus = "Occupied";

    if (!patientObjectId && nextStatus === "Occupied") {
      return res.status(400).json({
        message: "Cannot set bed as Occupied without assigning a patient",
      });
    }

    const updates = {
      bedCode: body.bedCode ?? existingBed.bedCode ?? "",
      bedNumber: nextBedNumber,
      wardId: wardObjectId,
      wardName,
      wardCode,
      bedType: body.bedType ?? existingBed.bedType ?? "General",
      status: nextStatus,
      patientId: patientObjectId,
      patientName,
      notes: body.notes ?? existingBed.notes ?? "",
      updatedAt: new Date(),
    };

    if (updates.bedCode !== existingBed.bedCode) {
      const duplicateBedCode = await bedsCollection.findOne({
        _id: { $ne: bedId },
        bedCode: updates.bedCode,
      });

      if (duplicateBedCode) {
        return res.status(409).json({ message: "Bed code already exists" });
      }
    }

    await bedsCollection.updateOne({ _id: bedId }, { $set: updates });

    return res.status(200).json({ message: "Bed updated successfully" });
  }

  if (req.method === "DELETE") {
    const body = await getBody(req);

    if (!body.id) return res.status(400).json({ message: "Bed ID is required" });
    if (!ObjectId.isValid(body.id)) return res.status(400).json({ message: "Invalid bed ID" });

    const bedId = new ObjectId(body.id);
    const existingBed = await bedsCollection.findOne({ _id: bedId });

    if (!existingBed) return res.status(404).json({ message: "Bed not found" });

    if (existingBed.status === "Occupied") {
      return res.status(400).json({
        message: "Cannot delete occupied bed. Discharge or move patient first.",
      });
    }

    const result = await bedsCollection.deleteOne({ _id: bedId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Bed not found" });
    }

    return res.status(200).json({ message: "Bed deleted successfully" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}

/* ───────────────────────────── ADMISSIONS ───────────────────────────── */

async function handleAdmissions(req, res, db) {
  const admissionsCollection = db.collection("admissions");
  const patientsCollection = db.collection("patients");
  const usersCollection = db.collection("users");
  const wardsCollection = db.collection("wards");
  const bedsCollection = db.collection("beds");

  if (req.method === "GET") {
    const { search = "", status = "", patientId = "", doctorId = "", wardId = "", bedId = "" } =
      req.query;

    const filter = {};

    if (status && status !== "all") filter.status = status;
    if (patientId && ObjectId.isValid(patientId)) filter.patientId = new ObjectId(patientId);
    if (doctorId && ObjectId.isValid(doctorId)) filter.doctorId = new ObjectId(doctorId);
    if (wardId && ObjectId.isValid(wardId)) filter.wardId = new ObjectId(wardId);
    if (bedId && ObjectId.isValid(bedId)) filter.bedId = new ObjectId(bedId);

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

    const admissions = await admissionsCollection.find(filter).sort({ createdAt: -1 }).toArray();

    return res.status(200).json(admissions.map(cleanAdmission));
  }

  if (req.method === "POST") {
    const body = await getBody(req);

    if (!body.patientId) return res.status(400).json({ message: "Patient is required" });
    if (!body.wardId) return res.status(400).json({ message: "Ward is required" });
    if (!body.bedId) return res.status(400).json({ message: "Bed is required" });

    const patientObjectId = toObjectId(body.patientId);
    const wardObjectId = toObjectId(body.wardId);
    const bedObjectId = toObjectId(body.bedId);

    if (!patientObjectId) return res.status(400).json({ message: "Invalid patient ID" });
    if (!wardObjectId) return res.status(400).json({ message: "Invalid ward ID" });
    if (!bedObjectId) return res.status(400).json({ message: "Invalid bed ID" });

    const patient = await patientsCollection.findOne({ _id: patientObjectId });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const ward = await wardsCollection.findOne({ _id: wardObjectId });
    if (!ward) return res.status(404).json({ message: "Ward not found" });

    const bed = await bedsCollection.findOne({ _id: bedObjectId });
    if (!bed) return res.status(404).json({ message: "Bed not found" });

    if (String(bed.wardId) !== String(wardObjectId)) {
      return res.status(400).json({
        message: "Selected bed does not belong to selected ward",
      });
    }

    if (bed.status === "Occupied") {
      return res.status(409).json({ message: "Bed is already occupied" });
    }

    if (bed.status === "Maintenance") {
      return res.status(409).json({ message: "Bed is under maintenance" });
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

      if (!doctorObjectId) return res.status(400).json({ message: "Invalid doctor ID" });

      const doctor = await usersCollection.findOne({
        _id: doctorObjectId,
        role: "doctor",
        status: "Active",
      });

      if (!doctor) return res.status(404).json({ message: "Doctor not found or not active" });

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

    const duplicateAdmissionNo = await admissionsCollection.findOne({
      admissionNo: newAdmission.admissionNo,
    });

    if (duplicateAdmissionNo) {
      return res.status(409).json({ message: "Admission number already exists" });
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
      admission: { ...cleanAdmission(newAdmission), _id: result.insertedId.toString() },
    });
  }

  if (req.method === "PUT") {
    const body = await getBody(req);

    if (!body.id) return res.status(400).json({ message: "Admission ID is required" });
    if (!ObjectId.isValid(body.id)) {
      return res.status(400).json({ message: "Invalid admission ID" });
    }

    const admissionId = new ObjectId(body.id);
    const existingAdmission = await admissionsCollection.findOne({ _id: admissionId });

    if (!existingAdmission) return res.status(404).json({ message: "Admission not found" });

    if (existingAdmission.status === "Discharged") {
      return res.status(400).json({ message: "Cannot update discharged admission" });
    }

    let doctorObjectId = existingAdmission.doctorId || null;
    let doctorName = existingAdmission.doctorName || "";

    if (body.doctorId !== undefined) {
      if (!body.doctorId) {
        doctorObjectId = null;
        doctorName = "";
      } else {
        const newDoctorId = toObjectId(body.doctorId);

        if (!newDoctorId) return res.status(400).json({ message: "Invalid doctor ID" });

        const doctor = await usersCollection.findOne({
          _id: newDoctorId,
          role: "doctor",
          status: "Active",
        });

        if (!doctor) return res.status(404).json({ message: "Doctor not found or not active" });

        doctorObjectId = newDoctorId;
        doctorName = doctor.fullName || doctor.name || "";
      }
    }

    const updates = {
      doctorId: doctorObjectId,
      doctorName,
      admissionDate: body.admissionDate ?? existingAdmission.admissionDate ?? todayDate(),
      admissionTime: body.admissionTime ?? existingAdmission.admissionTime ?? currentTime(),
      diagnosis: body.diagnosis ?? existingAdmission.diagnosis ?? "",
      reason: body.reason ?? existingAdmission.reason ?? "",
      condition: body.condition ?? existingAdmission.condition ?? "Stable",
      status: body.status ?? existingAdmission.status ?? "Admitted",
      notes: body.notes ?? existingAdmission.notes ?? "",
      updatedAt: new Date(),
    };

    await admissionsCollection.updateOne({ _id: admissionId }, { $set: updates });

    return res.status(200).json({ message: "Admission updated successfully" });
  }

  if (req.method === "DELETE") {
    const body = await getBody(req);

    if (!body.id) return res.status(400).json({ message: "Admission ID is required" });
    if (!ObjectId.isValid(body.id)) {
      return res.status(400).json({ message: "Invalid admission ID" });
    }

    const admissionId = new ObjectId(body.id);
    const admission = await admissionsCollection.findOne({ _id: admissionId });

    if (!admission) return res.status(404).json({ message: "Admission not found" });

    if (admission.status === "Admitted") {
      return res.status(400).json({
        message: "Cannot delete active admission. Discharge patient first.",
      });
    }

    const result = await admissionsCollection.deleteOne({ _id: admissionId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Admission not found" });
    }

    return res.status(200).json({ message: "Admission deleted successfully" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}


/* ───────────────────────────── DISCHARGES ───────────────────────────── */

async function handleDischarges(req, res, db) {
  const dischargesCollection = db.collection("discharges");
  const admissionsCollection = db.collection("admissions");
  const bedsCollection = db.collection("beds");

  if (req.method === "GET") {
    const {
      search = "",
      patientId = "",
      admissionId = "",
      wardId = "",
      bedId = "",
      dischargeType = "",
    } = req.query;

    const filter = {};

    if (patientId && ObjectId.isValid(patientId)) {
      filter.patientId = new ObjectId(patientId);
    }

    if (admissionId && ObjectId.isValid(admissionId)) {
      filter.admissionId = new ObjectId(admissionId);
    }

    if (wardId && ObjectId.isValid(wardId)) {
      filter.wardId = new ObjectId(wardId);
    }

    if (bedId && ObjectId.isValid(bedId)) {
      filter.bedId = new ObjectId(bedId);
    }

    if (dischargeType && dischargeType !== "all") {
      filter.dischargeType = dischargeType;
    }

    if (search) {
      filter.$or = [
        { dischargeNo: { $regex: search, $options: "i" } },
        { admissionNo: { $regex: search, $options: "i" } },
        { patientName: { $regex: search, $options: "i" } },
        { doctorName: { $regex: search, $options: "i" } },
        { wardName: { $regex: search, $options: "i" } },
        { bedNumber: { $regex: search, $options: "i" } },
        { dischargeType: { $regex: search, $options: "i" } },
        { finalDiagnosis: { $regex: search, $options: "i" } },
        { dischargeSummary: { $regex: search, $options: "i" } },
        { instructions: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    const discharges = await dischargesCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(discharges.map(cleanDischarge));
  }

  if (req.method === "POST") {
    const body = await getBody(req);

    if (!body.admissionId) {
      return res.status(400).json({ message: "Admission ID is required" });
    }

    if (!ObjectId.isValid(body.admissionId)) {
      return res.status(400).json({ message: "Invalid admission ID" });
    }

    const admissionId = new ObjectId(body.admissionId);
    const admission = await admissionsCollection.findOne({ _id: admissionId });

    if (!admission) {
      return res.status(404).json({ message: "Admission not found" });
    }

    if (admission.status === "Discharged") {
      return res.status(409).json({ message: "Patient is already discharged" });
    }

    const existingDischarge = await dischargesCollection.findOne({
      admissionId,
    });

    if (existingDischarge) {
      return res.status(409).json({
        message: "Discharge record already exists for this admission",
      });
    }

    const bedNextStatus = body.bedNextStatus || "Cleaning";

    if (!["Available", "Cleaning", "Maintenance"].includes(bedNextStatus)) {
      return res.status(400).json({
        message: "Bed next status must be Available, Cleaning, or Maintenance",
      });
    }

    const newDischarge = {
      dischargeNo: body.dischargeNo || generateDischargeNo(),

      admissionId,
      admissionNo: admission.admissionNo || "",

      patientId: admission.patientId || null,
      patientName: admission.patientName || "",

      doctorId: admission.doctorId || null,
      doctorName: admission.doctorName || "",

      wardId: admission.wardId || null,
      wardName: admission.wardName || "",

      bedId: admission.bedId || null,
      bedNumber: admission.bedNumber || "",

      dischargeDate: body.dischargeDate || todayDate(),
      dischargeTime: body.dischargeTime || currentTime(),

      dischargeType: body.dischargeType || "Recovered",
      finalDiagnosis: body.finalDiagnosis || admission.diagnosis || "",
      dischargeSummary: body.dischargeSummary || "",
      instructions: body.instructions || "",
      followUpDate: body.followUpDate || "",

      bedNextStatus,
      notes: body.notes || "",

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const duplicateDischargeNo = await dischargesCollection.findOne({
      dischargeNo: newDischarge.dischargeNo,
    });

    if (duplicateDischargeNo) {
      return res.status(409).json({ message: "Discharge number already exists" });
    }

    const result = await dischargesCollection.insertOne(newDischarge);

    await admissionsCollection.updateOne(
      { _id: admissionId },
      {
        $set: {
          status: "Discharged",
          dischargedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (admission.bedId) {
      await bedsCollection.updateOne(
        { _id: admission.bedId },
        {
          $set: {
            status: bedNextStatus,
            patientId: null,
            patientName: "",
            updatedAt: new Date(),
          },
        }
      );
    }

    return res.status(201).json({
      message: "Patient discharged successfully",
      discharge: {
        ...cleanDischarge(newDischarge),
        _id: result.insertedId.toString(),
      },
    });
  }

  if (req.method === "PUT") {
    const body = await getBody(req);

    if (!body.id) {
      return res.status(400).json({ message: "Discharge ID is required" });
    }

    if (!ObjectId.isValid(body.id)) {
      return res.status(400).json({ message: "Invalid discharge ID" });
    }

    const dischargeId = new ObjectId(body.id);

    const existingDischarge = await dischargesCollection.findOne({
      _id: dischargeId,
    });

    if (!existingDischarge) {
      return res.status(404).json({ message: "Discharge record not found" });
    }

    const updates = {
      dischargeDate: body.dischargeDate ?? existingDischarge.dischargeDate ?? todayDate(),
      dischargeTime: body.dischargeTime ?? existingDischarge.dischargeTime ?? currentTime(),
      dischargeType: body.dischargeType ?? existingDischarge.dischargeType ?? "Recovered",
      finalDiagnosis: body.finalDiagnosis ?? existingDischarge.finalDiagnosis ?? "",
      dischargeSummary: body.dischargeSummary ?? existingDischarge.dischargeSummary ?? "",
      instructions: body.instructions ?? existingDischarge.instructions ?? "",
      followUpDate: body.followUpDate ?? existingDischarge.followUpDate ?? "",
      notes: body.notes ?? existingDischarge.notes ?? "",
      updatedAt: new Date(),
    };

    await dischargesCollection.updateOne(
      { _id: dischargeId },
      { $set: updates }
    );

    return res.status(200).json({ message: "Discharge updated successfully" });
  }

  if (req.method === "DELETE") {
    const body = await getBody(req);

    if (!body.id) {
      return res.status(400).json({ message: "Discharge ID is required" });
    }

    if (!ObjectId.isValid(body.id)) {
      return res.status(400).json({ message: "Invalid discharge ID" });
    }

    const dischargeId = new ObjectId(body.id);

    const existingDischarge = await dischargesCollection.findOne({
      _id: dischargeId,
    });

    if (!existingDischarge) {
      return res.status(404).json({ message: "Discharge record not found" });
    }

    const result = await dischargesCollection.deleteOne({ _id: dischargeId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Discharge record not found" });
    }

    return res.status(200).json({ message: "Discharge deleted successfully" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}


/* ───────────────────────────── MAIN ROUTER ───────────────────────────── */

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("hospital");

    const type = String(req.query.type || "").toLowerCase();

    if (type === "wards") {
      return await handleWards(req, res, db);
    }

    if (type === "beds") {
      return await handleBeds(req, res, db);
    }

    if (type === "admissions") {
      return await handleAdmissions(req, res, db);
    }


    if (type === "discharges") {
      return await handleDischarges(req, res, db);
    }

    return res.status(400).json({
      message: "Invalid bedward type. Use ?type=wards, ?type=beds, ?type=admissions, or ?type=discharges",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}