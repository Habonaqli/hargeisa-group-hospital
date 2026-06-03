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

function generateCode(prefix) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}-${year}${month}${day}-${random}`;
}

function calculateInvoiceStatus(totalAmount, paidAmount) {
  const total = Number(totalAmount || 0);
  const paid = Number(paidAmount || 0);

  if (paid <= 0) return "Unpaid";
  if (paid >= total) return "Paid";
  return "Partial";
}

function cleanService(service) {
  return {
    _id: service._id?.toString(),
    serviceCode: service.serviceCode || "",
    name: service.name || "",
    category: service.category || "",
    department: service.department || "",
    description: service.description || "",
    price: Number(service.price || 0),
    status: service.status || "Active",
    createdAt: service.createdAt || null,
    updatedAt: service.updatedAt || null,
  };
}

function cleanInvoice(invoice) {
  return {
    _id: invoice._id?.toString(),
    invoiceNo: invoice.invoiceNo || "",

    patientId: invoice.patientId?.toString() || "",
    patientName: invoice.patientName || "",

    appointmentId: invoice.appointmentId?.toString() || "",
    appointmentDate: invoice.appointmentDate || "",
    appointmentTime: invoice.appointmentTime || "",

    invoiceDate: invoice.invoiceDate || "",
    department: invoice.department || "",
    cashierName: invoice.cashierName || "",

    items: Array.isArray(invoice.items)
      ? invoice.items.map((item) => ({
          serviceId: item.serviceId?.toString?.() || item.serviceId || "",
          serviceName: item.serviceName || "",
          description: item.description || "",
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          lineTotal: Number(item.lineTotal || 0),
        }))
      : [],

    totalAmount: Number(invoice.totalAmount || 0),
    paidAmount: Number(invoice.paidAmount || 0),
    balance: Number(invoice.balance || 0),

    status: invoice.status || "Unpaid",
    notes: invoice.notes || "",

    createdAt: invoice.createdAt || null,
    updatedAt: invoice.updatedAt || null,
  };
}

function cleanPayment(payment) {
  return {
    _id: payment._id?.toString(),
    paymentNo: payment.paymentNo || "",

    invoiceId: payment.invoiceId?.toString() || "",
    invoiceNo: payment.invoiceNo || "",

    patientId: payment.patientId?.toString() || "",
    patientName: payment.patientName || "",

    amount: Number(payment.amount || 0),
    paymentMethod: payment.paymentMethod || "",
    referenceNo: payment.referenceNo || "",
    paymentDate: payment.paymentDate || "",

    cashierName: payment.cashierName || "",
    notes: payment.notes || "",

    createdAt: payment.createdAt || null,
    updatedAt: payment.updatedAt || null,
  };
}

function cleanExpense(expense) {
  return {
    _id: expense._id?.toString(),
    expenseNo: expense.expenseNo || "",
    title: expense.title || "",
    category: expense.category || "",
    department: expense.department || "",
    amount: Number(expense.amount || 0),
    paymentMethod: expense.paymentMethod || "",
    expenseDate: expense.expenseDate || "",
    paidTo: expense.paidTo || "",
    approvedBy: expense.approvedBy || "",
    status: expense.status || "Approved",
    notes: expense.notes || "",
    createdAt: expense.createdAt || null,
    updatedAt: expense.updatedAt || null,
  };
}

/* ───────────────────────────── SERVICES ───────────────────────────── */

async function handleServices(req, res, db) {
  const servicesCollection = db.collection("finance_services");

  if (req.method === "GET") {
    const { search = "", status = "", category = "", department = "" } = req.query;

    const filter = {};

    if (status && status !== "all") filter.status = status;
    if (category && category !== "all") filter.category = category;
    if (department && department !== "all") filter.department = department;

    if (search) {
      filter.$or = [
        { serviceCode: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const services = await servicesCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(services.map(cleanService));
  }

  if (req.method === "POST") {
    const body = await getBody(req);

    if (!body.name) {
      return res.status(400).json({ message: "Service name is required" });
    }

    if (body.price === undefined || Number(body.price) < 0) {
      return res.status(400).json({ message: "Valid service price is required" });
    }

    const newService = {
      serviceCode: body.serviceCode || generateCode("SRV"),
      name: body.name,
      category: body.category || "General",
      department: body.department || "General",
      description: body.description || "",
      price: Number(body.price || 0),
      status: body.status || "Active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const duplicate = await servicesCollection.findOne({
      serviceCode: newService.serviceCode,
    });

    if (duplicate) {
      return res.status(409).json({ message: "Service code already exists" });
    }

    const result = await servicesCollection.insertOne(newService);

    return res.status(201).json({
      message: "Service added successfully",
      service: {
        ...cleanService(newService),
        _id: result.insertedId.toString(),
      },
    });
  }

  if (req.method === "PUT") {
    const body = await getBody(req);

    if (!body.id) {
      return res.status(400).json({ message: "Service ID is required" });
    }

    if (!ObjectId.isValid(body.id)) {
      return res.status(400).json({ message: "Invalid service ID" });
    }

    const serviceId = new ObjectId(body.id);
    const existing = await servicesCollection.findOne({ _id: serviceId });

    if (!existing) {
      return res.status(404).json({ message: "Service not found" });
    }

    const price =
      body.price !== undefined ? Number(body.price) : Number(existing.price || 0);

    if (price < 0) {
      return res.status(400).json({ message: "Price cannot be negative" });
    }

    const updates = {
      serviceCode: body.serviceCode ?? existing.serviceCode ?? "",
      name: body.name ?? existing.name ?? "",
      category: body.category ?? existing.category ?? "General",
      department: body.department ?? existing.department ?? "General",
      description: body.description ?? existing.description ?? "",
      price,
      status: body.status ?? existing.status ?? "Active",
      updatedAt: new Date(),
    };

    if (updates.serviceCode !== existing.serviceCode) {
      const duplicate = await servicesCollection.findOne({
        _id: { $ne: serviceId },
        serviceCode: updates.serviceCode,
      });

      if (duplicate) {
        return res.status(409).json({ message: "Service code already exists" });
      }
    }

    await servicesCollection.updateOne({ _id: serviceId }, { $set: updates });

    return res.status(200).json({ message: "Service updated successfully" });
  }

  if (req.method === "DELETE") {
    const body = await getBody(req);

    if (!body.id) {
      return res.status(400).json({ message: "Service ID is required" });
    }

    if (!ObjectId.isValid(body.id)) {
      return res.status(400).json({ message: "Invalid service ID" });
    }

    const result = await servicesCollection.deleteOne({
      _id: new ObjectId(body.id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.status(200).json({ message: "Service deleted successfully" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}

/* ───────────────────────────── INVOICES ───────────────────────────── */

async function handleInvoices(req, res, db) {
  const invoicesCollection = db.collection("finance_invoices");
  const patientsCollection = db.collection("patients");
  const appointmentsCollection = db.collection("appointments");
  const servicesCollection = db.collection("finance_services");

  if (req.method === "GET") {
    const {
      search = "",
      status = "",
      patientId = "",
      fromDate = "",
      toDate = "",
    } = req.query;

    const filter = {};

    if (status && status !== "all") filter.status = status;

    if (patientId && ObjectId.isValid(patientId)) {
      filter.patientId = new ObjectId(patientId);
    }

    if (fromDate || toDate) {
      filter.invoiceDate = {};
      if (fromDate) filter.invoiceDate.$gte = fromDate;
      if (toDate) filter.invoiceDate.$lte = toDate;
    }

    if (search) {
      filter.$or = [
        { invoiceNo: { $regex: search, $options: "i" } },
        { patientName: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
        { "items.serviceName": { $regex: search, $options: "i" } },
      ];
    }

    const invoices = await invoicesCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(invoices.map(cleanInvoice));
  }

  if (req.method === "POST") {
    const body = await getBody(req);

    if (!body.patientId) {
      return res.status(400).json({ message: "Patient is required" });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ message: "At least one invoice item is required" });
    }

    const patientObjectId = toObjectId(body.patientId);

    if (!patientObjectId) {
      return res.status(400).json({ message: "Invalid patient ID" });
    }

    const patient = await patientsCollection.findOne({ _id: patientObjectId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    let appointmentObjectId = null;
    let appointmentDate = "";
    let appointmentTime = "";

    if (body.appointmentId) {
      appointmentObjectId = toObjectId(body.appointmentId);

      if (!appointmentObjectId) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }

      const appointment = await appointmentsCollection.findOne({
        _id: appointmentObjectId,
      });

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      appointmentDate = appointment.appointmentDate || "";
      appointmentTime = appointment.appointmentTime || "";
    }

    const cleanedItems = [];

    for (const item of body.items) {
      if (!item.serviceName && !item.serviceId) {
        return res.status(400).json({
          message: "Each item must have serviceName or serviceId",
        });
      }

      let serviceObjectId = null;
      let serviceName = item.serviceName || "";
      let description = item.description || "";
      let unitPrice = Number(item.unitPrice || 0);

      if (item.serviceId) {
        serviceObjectId = toObjectId(item.serviceId);

        if (!serviceObjectId) {
          return res.status(400).json({ message: "Invalid service ID in item" });
        }

        const service = await servicesCollection.findOne({
          _id: serviceObjectId,
        });

        if (!service) {
          return res.status(404).json({ message: "Service not found in item" });
        }

        serviceName = service.name || serviceName;
        description = item.description || service.description || "";
        unitPrice = item.unitPrice !== undefined ? unitPrice : Number(service.price || 0);
      }

      const quantity = Number(item.quantity || 1);

      if (quantity <= 0) {
        return res.status(400).json({ message: "Item quantity must be greater than zero" });
      }

      if (unitPrice < 0) {
        return res.status(400).json({ message: "Item price cannot be negative" });
      }

      const lineTotal = quantity * unitPrice;

      cleanedItems.push({
        serviceId: serviceObjectId,
        serviceName,
        description,
        quantity,
        unitPrice,
        lineTotal,
      });
    }

    const totalAmount = cleanedItems.reduce(
      (sum, item) => sum + Number(item.lineTotal || 0),
      0
    );

    const paidAmount = Number(body.paidAmount || 0);

    if (paidAmount < 0) {
      return res.status(400).json({ message: "Paid amount cannot be negative" });
    }

    if (paidAmount > totalAmount) {
      return res.status(400).json({ message: "Paid amount cannot exceed total amount" });
    }

    const balance = Math.max(totalAmount - paidAmount, 0);
    const status = calculateInvoiceStatus(totalAmount, paidAmount);

    const newInvoice = {
      invoiceNo: body.invoiceNo || generateCode("FIN-INV"),

      patientId: patientObjectId,
      patientName: patient.name || patient.fullName || "",

      appointmentId: appointmentObjectId,
      appointmentDate,
      appointmentTime,

      invoiceDate: body.invoiceDate || todayDate(),
      department: body.department || "General",
      cashierName: body.cashierName || "",

      items: cleanedItems,

      totalAmount,
      paidAmount,
      balance,
      status,

      notes: body.notes || "",

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const duplicateInvoiceNo = await invoicesCollection.findOne({
      invoiceNo: newInvoice.invoiceNo,
    });

    if (duplicateInvoiceNo) {
      return res.status(409).json({ message: "Invoice number already exists" });
    }

    const result = await invoicesCollection.insertOne(newInvoice);

    return res.status(201).json({
      message: "Invoice created successfully",
      invoice: {
        ...cleanInvoice(newInvoice),
        _id: result.insertedId.toString(),
      },
    });
  }

  if (req.method === "PUT") {
    const body = await getBody(req);

    if (!body.id) {
      return res.status(400).json({ message: "Invoice ID is required" });
    }

    if (!ObjectId.isValid(body.id)) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }

    const invoiceId = new ObjectId(body.id);
    const existing = await invoicesCollection.findOne({ _id: invoiceId });

    if (!existing) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const allowedUpdates = {
      invoiceDate: body.invoiceDate ?? existing.invoiceDate ?? todayDate(),
      department: body.department ?? existing.department ?? "General",
      cashierName: body.cashierName ?? existing.cashierName ?? "",
      notes: body.notes ?? existing.notes ?? "",
      updatedAt: new Date(),
    };

    await invoicesCollection.updateOne(
      { _id: invoiceId },
      { $set: allowedUpdates }
    );

    return res.status(200).json({ message: "Invoice updated successfully" });
  }

  if (req.method === "DELETE") {
    const body = await getBody(req);

    if (!body.id) {
      return res.status(400).json({ message: "Invoice ID is required" });
    }

    if (!ObjectId.isValid(body.id)) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }

    const invoiceId = new ObjectId(body.id);
    const existing = await invoicesCollection.findOne({ _id: invoiceId });

    if (!existing) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (Number(existing.paidAmount || 0) > 0) {
      return res.status(400).json({
        message: "Cannot delete invoice with payments. Cancel or reverse payments first.",
      });
    }

    const result = await invoicesCollection.deleteOne({ _id: invoiceId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    return res.status(200).json({ message: "Invoice deleted successfully" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}

/* ───────────────────────────── PAYMENTS ───────────────────────────── */

async function handlePayments(req, res, db) {
  const paymentsCollection = db.collection("finance_payments");
  const invoicesCollection = db.collection("finance_invoices");

  if (req.method === "GET") {
    const {
      search = "",
      patientId = "",
      invoiceId = "",
      paymentMethod = "",
      fromDate = "",
      toDate = "",
    } = req.query;

    const filter = {};

    if (patientId && ObjectId.isValid(patientId)) {
      filter.patientId = new ObjectId(patientId);
    }

    if (invoiceId && ObjectId.isValid(invoiceId)) {
      filter.invoiceId = new ObjectId(invoiceId);
    }

    if (paymentMethod && paymentMethod !== "all") {
      filter.paymentMethod = paymentMethod;
    }

    if (fromDate || toDate) {
      filter.paymentDate = {};
      if (fromDate) filter.paymentDate.$gte = fromDate;
      if (toDate) filter.paymentDate.$lte = toDate;
    }

    if (search) {
      filter.$or = [
        { paymentNo: { $regex: search, $options: "i" } },
        { invoiceNo: { $regex: search, $options: "i" } },
        { patientName: { $regex: search, $options: "i" } },
        { paymentMethod: { $regex: search, $options: "i" } },
        { referenceNo: { $regex: search, $options: "i" } },
        { cashierName: { $regex: search, $options: "i" } },
      ];
    }

    const payments = await paymentsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(payments.map(cleanPayment));
  }

  if (req.method === "POST") {
    const body = await getBody(req);

    if (!body.invoiceId) {
      return res.status(400).json({ message: "Invoice is required" });
    }

    if (!ObjectId.isValid(body.invoiceId)) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }

    if (body.amount === undefined || Number(body.amount) <= 0) {
      return res.status(400).json({ message: "Payment amount must be greater than zero" });
    }

    if (!body.paymentMethod) {
      return res.status(400).json({ message: "Payment method is required" });
    }

    const invoiceId = new ObjectId(body.invoiceId);
    const invoice = await invoicesCollection.findOne({ _id: invoiceId });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const amount = Number(body.amount || 0);
    const currentPaid = Number(invoice.paidAmount || 0);
    const totalAmount = Number(invoice.totalAmount || 0);
    const nextPaidAmount = currentPaid + amount;

    if (nextPaidAmount > totalAmount) {
      return res.status(400).json({
        message: "Payment exceeds invoice balance",
      });
    }

    const nextBalance = Math.max(totalAmount - nextPaidAmount, 0);
    const nextStatus = calculateInvoiceStatus(totalAmount, nextPaidAmount);

    const newPayment = {
      paymentNo: body.paymentNo || generateCode("PAY"),

      invoiceId,
      invoiceNo: invoice.invoiceNo || "",

      patientId: invoice.patientId || null,
      patientName: invoice.patientName || "",

      amount,
      paymentMethod: body.paymentMethod,
      referenceNo: body.referenceNo || "",
      paymentDate: body.paymentDate || todayDate(),

      cashierName: body.cashierName || "",
      notes: body.notes || "",

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const duplicatePaymentNo = await paymentsCollection.findOne({
      paymentNo: newPayment.paymentNo,
    });

    if (duplicatePaymentNo) {
      return res.status(409).json({ message: "Payment number already exists" });
    }

    const result = await paymentsCollection.insertOne(newPayment);

    await invoicesCollection.updateOne(
      { _id: invoiceId },
      {
        $set: {
          paidAmount: nextPaidAmount,
          balance: nextBalance,
          status: nextStatus,
          updatedAt: new Date(),
        },
      }
    );

    return res.status(201).json({
      message: "Payment added successfully",
      payment: {
        ...cleanPayment(newPayment),
        _id: result.insertedId.toString(),
      },
    });
  }

  return res.status(405).json({ message: "Method not allowed" });
}

/* ───────────────────────────── EXPENSES ───────────────────────────── */

async function handleExpenses(req, res, db) {
  const expensesCollection = db.collection("finance_expenses");

  if (req.method === "GET") {
    const {
      search = "",
      category = "",
      department = "",
      status = "",
      fromDate = "",
      toDate = "",
    } = req.query;

    const filter = {};

    if (category && category !== "all") filter.category = category;
    if (department && department !== "all") filter.department = department;
    if (status && status !== "all") filter.status = status;

    if (fromDate || toDate) {
      filter.expenseDate = {};
      if (fromDate) filter.expenseDate.$gte = fromDate;
      if (toDate) filter.expenseDate.$lte = toDate;
    }

    if (search) {
      filter.$or = [
        { expenseNo: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { paidTo: { $regex: search, $options: "i" } },
        { approvedBy: { $regex: search, $options: "i" } },
      ];
    }

    const expenses = await expensesCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(expenses.map(cleanExpense));
  }

  if (req.method === "POST") {
    const body = await getBody(req);

    if (!body.title) {
      return res.status(400).json({ message: "Expense title is required" });
    }

    if (body.amount === undefined || Number(body.amount) <= 0) {
      return res.status(400).json({ message: "Expense amount must be greater than zero" });
    }

    const newExpense = {
      expenseNo: body.expenseNo || generateCode("EXP"),
      title: body.title,
      category: body.category || "General",
      department: body.department || "General",
      amount: Number(body.amount || 0),
      paymentMethod: body.paymentMethod || "Cash",
      expenseDate: body.expenseDate || todayDate(),
      paidTo: body.paidTo || "",
      approvedBy: body.approvedBy || "",
      status: body.status || "Approved",
      notes: body.notes || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const duplicateExpenseNo = await expensesCollection.findOne({
      expenseNo: newExpense.expenseNo,
    });

    if (duplicateExpenseNo) {
      return res.status(409).json({ message: "Expense number already exists" });
    }

    const result = await expensesCollection.insertOne(newExpense);

    return res.status(201).json({
      message: "Expense added successfully",
      expense: {
        ...cleanExpense(newExpense),
        _id: result.insertedId.toString(),
      },
    });
  }

  if (req.method === "PUT") {
    const body = await getBody(req);

    if (!body.id) {
      return res.status(400).json({ message: "Expense ID is required" });
    }

    if (!ObjectId.isValid(body.id)) {
      return res.status(400).json({ message: "Invalid expense ID" });
    }

    const expenseId = new ObjectId(body.id);
    const existing = await expensesCollection.findOne({ _id: expenseId });

    if (!existing) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const amount =
      body.amount !== undefined ? Number(body.amount) : Number(existing.amount || 0);

    if (amount <= 0) {
      return res.status(400).json({ message: "Expense amount must be greater than zero" });
    }

    const updates = {
      title: body.title ?? existing.title ?? "",
      category: body.category ?? existing.category ?? "General",
      department: body.department ?? existing.department ?? "General",
      amount,
      paymentMethod: body.paymentMethod ?? existing.paymentMethod ?? "Cash",
      expenseDate: body.expenseDate ?? existing.expenseDate ?? todayDate(),
      paidTo: body.paidTo ?? existing.paidTo ?? "",
      approvedBy: body.approvedBy ?? existing.approvedBy ?? "",
      status: body.status ?? existing.status ?? "Approved",
      notes: body.notes ?? existing.notes ?? "",
      updatedAt: new Date(),
    };

    await expensesCollection.updateOne(
      { _id: expenseId },
      { $set: updates }
    );

    return res.status(200).json({ message: "Expense updated successfully" });
  }

  if (req.method === "DELETE") {
    const body = await getBody(req);

    if (!body.id) {
      return res.status(400).json({ message: "Expense ID is required" });
    }

    if (!ObjectId.isValid(body.id)) {
      return res.status(400).json({ message: "Invalid expense ID" });
    }

    const result = await expensesCollection.deleteOne({
      _id: new ObjectId(body.id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    return res.status(200).json({ message: "Expense deleted successfully" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}

/* ───────────────────────────── SUMMARY ───────────────────────────── */

async function handleSummary(req, res, db) {
  const invoicesCollection = db.collection("finance_invoices");
  const paymentsCollection = db.collection("finance_payments");
  const expensesCollection = db.collection("finance_expenses");

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { date = todayDate(), fromDate = "", toDate = "" } = req.query;

  const dateFilter = {};

  if (fromDate || toDate) {
    if (fromDate) dateFilter.$gte = fromDate;
    if (toDate) dateFilter.$lte = toDate;
  } else {
    dateFilter.$eq = date;
  }

  const invoices = await invoicesCollection.find({}).toArray();
  const paymentsToday = await paymentsCollection
    .find({ paymentDate: dateFilter })
    .toArray();
  const expensesToday = await expensesCollection
    .find({ expenseDate: dateFilter })
    .toArray();

  const totalBilled = invoices.reduce(
    (sum, item) => sum + Number(item.totalAmount || 0),
    0
  );

  const totalCollected = paymentsToday.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const totalExpenses = expensesToday.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const outstanding = invoices.reduce(
    (sum, item) => sum + Number(item.balance || 0),
    0
  );

  const netCash = totalCollected - totalExpenses;

  const byPaymentMethod = paymentsToday.reduce((acc, item) => {
    const method = item.paymentMethod || "Unknown";
    acc[method] = (acc[method] || 0) + Number(item.amount || 0);
    return acc;
  }, {});

  return res.status(200).json({
    date,
    fromDate,
    toDate,
    totalBilled,
    totalCollected,
    totalExpenses,
    outstanding,
    netCash,
    invoiceCount: invoices.length,
    paymentCount: paymentsToday.length,
    expenseCount: expensesToday.length,
    byPaymentMethod,
  });
}

/* ───────────────────────────── MAIN ROUTER ───────────────────────────── */

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("hospital");

    const type = String(req.query.type || "").toLowerCase();

    if (type === "services") {
      return await handleServices(req, res, db);
    }

    if (type === "invoices") {
      return await handleInvoices(req, res, db);
    }

    if (type === "payments") {
      return await handlePayments(req, res, db);
    }

    if (type === "expenses") {
      return await handleExpenses(req, res, db);
    }

    if (type === "summary") {
      return await handleSummary(req, res, db);
    }

    return res.status(400).json({
      message:
        "Invalid finance type. Use ?type=services, ?type=invoices, ?type=payments, ?type=expenses, or ?type=summary",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}