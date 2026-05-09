import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
//  Hargeisa Group Hospital · EXTENDED PLATFORM  v3.0
//  All 10 new modules + Calendar, Modals, Filters, RBAC, API-ready structure
// ═══════════════════════════════════════════════════════════════════════════════

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const C = {
  bg:"#080F1A", surface:"rgba(255,255,255,0.035)", border:"rgba(255,255,255,0.08)",
  text:"#E2E8F0", muted:"#64748B", faint:"#334155",
  amber:"#F59E0B", amberD:"#D97706", amberBg:"rgba(245,158,11,0.1)",
  blue:"#60A5FA",  green:"#34D399", red:"#F87171",
  purple:"#A78BFA",teal:"#2DD4BF",  navy:"#0D1B2E",
  mono:"'DM Mono', monospace", serif:"'Playfair Display', serif", sans:"'DM Sans', sans-serif",
};

// ── DATA ──────────────────────────────────────────────────────────────────────
const CURRENT_USER_OPTIONS = {
  admin:       { id:"U-001", name:"Khadar Aqli",       role:"admin",       avatar:"AK", dept:"Management" },
  doctor:      { id:"U-002", name:"Dr. Khadar Ali",     role:"doctor",      avatar:"KA", dept:"Cardiology", doctorId:"D-001" },
  receptionist:{ id:"U-003", name:"Sara Jama",          role:"receptionist",avatar:"SJ", dept:"Admin" },
  nurse:       { id:"U-004", name:"Nurse Fadumo Ali",   role:"nurse",       avatar:"FA", dept:"Cardiology" },
};

const PATIENTS_DATA = [
  { id:"P-0041", name:"Amina Hassan",  dob:"1988-03-14", gender:"Female", phone:"+252 63 420 1100", email:"amina@email.so",  blood:"O+",  dept:"Cardiology",   status:"Active",   visits:7,  addr:"Hargeisa Zone 3", emergency:"Hassan Ali +252 63 420 9900",    allergies:"Penicillin", insurance:"NHIS-0041" },
  { id:"P-0042", name:"Omar Farah",    dob:"1974-11-02", gender:"Male",   phone:"+252 63 420 2244", email:"omar@email.so",   blood:"A+",  dept:"Orthopedics",  status:"Active",   visits:3,  addr:"Hargeisa Zone 1", emergency:"Fadumo Omar +252 63 421 0010",   allergies:"None",       insurance:"NHIS-0042" },
  { id:"P-0043", name:"Faadumo Idle",  dob:"2001-06-30", gender:"Female", phone:"+252 63 420 3381", email:"faadumo@so.com",  blood:"B-",  dept:"Dermatology",  status:"Active",   visits:1,  addr:"Berbera Road",    emergency:"Idle Warsame +252 63 420 7711",  allergies:"Sulfa",      insurance:"None" },
  { id:"P-0044", name:"Abdi Warsame",  dob:"1965-08-19", gender:"Male",   phone:"+252 63 420 5512", email:"abdi@email.so",   blood:"AB+", dept:"Neurology",    status:"Inactive", visits:12, addr:"Hargeisa Zone 5", emergency:"Hodan Abdi +252 63 420 3300",    allergies:"Aspirin",    insurance:"NHIS-0044" },
  { id:"P-0045", name:"Hodan Yusuf",   dob:"1992-01-25", gender:"Female", phone:"+252 63 420 6677", email:"hodan@email.so",  blood:"O-",  dept:"Pediatrics",   status:"Active",   visits:5,  addr:"Hargeisa Zone 2", emergency:"Yusuf Ahmed +252 63 421 5500",   allergies:"None",       insurance:"NHIS-0045" },
  { id:"P-0046", name:"Mohamed Jama",  dob:"1980-05-10", gender:"Male",   phone:"+252 63 420 8899", email:"mj@email.so",     blood:"A-",  dept:"Cardiology",   status:"Active",   visits:9,  addr:"Hargeisa Zone 4", emergency:"Asad Jama +252 63 420 1122",     allergies:"Latex",      insurance:"NHIS-0046" },
];

const DOCTORS_DATA = [
  { id:"D-001", name:"Dr. Khadar Ali",    spec:"Cardiologist",     dept:"Cardiology",   fee:150, avail:"Mon Wed Fri", status:"Active",   patients:42, rating:4.9 },
  { id:"D-002", name:"Dr. Layla Ahmed",   spec:"Orthopedic Surg.", dept:"Orthopedics",  fee:180, avail:"Tue Thu",     status:"Active",   patients:28, rating:4.7 },
  { id:"D-003", name:"Dr. Bashir Omar",   spec:"Neurologist",      dept:"Neurology",    fee:200, avail:"Mon Tue Wed", status:"Active",   patients:35, rating:4.8 },
  { id:"D-004", name:"Dr. Sahra Warsam", spec:"Pediatrician",     dept:"Pediatrics",   fee:120, avail:"Wed Fri",     status:"Active",   patients:51, rating:4.9 },
  { id:"D-005", name:"Dr. Abdullahi H.", spec:"Dermatologist",    dept:"Dermatology",  fee:130, avail:"Mon Thu Sat", status:"Inactive", patients:18, rating:4.5 },
];

const APPOINTMENTS_DATA = [
  { id:"APT-301", patient:"Amina Hassan",  patientId:"P-0041", doctor:"Dr. Khadar Ali",   doctorId:"D-001", date:"2026-04-23", time:"09:00", dept:"Cardiology",   status:"checked-in", reason:"Follow-up ECG" },
  { id:"APT-302", patient:"Omar Farah",    patientId:"P-0042", doctor:"Dr. Layla Ahmed",  doctorId:"D-002", date:"2026-04-23", time:"10:30", dept:"Orthopedics",  status:"scheduled",  reason:"Knee pain" },
  { id:"APT-303", patient:"Faadumo Idle",  patientId:"P-0043", doctor:"Dr. Abdullahi H.", doctorId:"D-005", date:"2026-04-23", time:"11:00", dept:"Dermatology",  status:"scheduled",  reason:"Skin rash" },
  { id:"APT-304", patient:"Hodan Yusuf",   patientId:"P-0045", doctor:"Dr. Sahra Warsam",doctorId:"D-004", date:"2026-04-23", time:"14:00", dept:"Pediatrics",   status:"completed",  reason:"Annual checkup" },
  { id:"APT-305", patient:"Abdi Warsame",  patientId:"P-0044", doctor:"Dr. Bashir Omar",  doctorId:"D-003", date:"2026-04-22", time:"08:30", dept:"Neurology",    status:"no-show",    reason:"Headaches" },
  { id:"APT-306", patient:"Amina Hassan",  patientId:"P-0041", doctor:"Dr. Khadar Ali",   doctorId:"D-001", date:"2026-04-24", time:"09:00", dept:"Cardiology",   status:"scheduled",  reason:"Medication review" },
  { id:"APT-307", patient:"Mohamed Jama",  patientId:"P-0046", doctor:"Dr. Khadar Ali",   doctorId:"D-001", date:"2026-04-25", time:"11:00", dept:"Cardiology",   status:"scheduled",  reason:"Stress test" },
  { id:"APT-308", patient:"Omar Farah",    patientId:"P-0042", doctor:"Dr. Layla Ahmed",  doctorId:"D-002", date:"2026-04-28", time:"09:30", dept:"Orthopedics",  status:"scheduled",  reason:"X-ray review" },
];

const BILLS_DATA = [
  { id:"INV-801", patient:"Amina Hassan",  patientId:"P-0041", apt:"APT-301", total:210, status:"paid",            method:"Cash", date:"2026-04-23" },
  { id:"INV-802", patient:"Omar Farah",    patientId:"P-0042", apt:"APT-302", total:280, status:"unpaid",          method:"—",    date:"2026-04-23" },
  { id:"INV-803", patient:"Hodan Yusuf",   patientId:"P-0045", apt:"APT-304", total:170, status:"paid",            method:"Card", date:"2026-04-23" },
  { id:"INV-804", patient:"Abdi Warsame",  patientId:"P-0044", apt:"APT-305", total:0,   status:"cancelled",       method:"—",    date:"2026-04-22" },
  { id:"INV-805", patient:"Faadumo Idle",  patientId:"P-0043", apt:"APT-303", total:155, status:"unpaid",          method:"—",    date:"2026-04-23" },
  { id:"INV-806", patient:"Mohamed Jama",  patientId:"P-0046", apt:"APT-307", total:350, status:"partially paid",  method:"Card", date:"2026-04-23" },
];

const MEDICINES_DATA = [
  { id:"MED-001", name:"Amoxicillin 500mg",  category:"Antibiotic",   stock:240, min:50,  unit:"Capsule", expiry:"2027-06-30", supplier:"PharmaCo Ltd", cost:0.8,  price:1.5,  status:"In Stock" },
  { id:"MED-002", name:"Metformin 850mg",    category:"Antidiabetic", stock:180, min:40,  unit:"Tablet",  expiry:"2026-12-15", supplier:"MediSource",   cost:0.5,  price:1.2,  status:"In Stock" },
  { id:"MED-003", name:"Lisinopril 10mg",    category:"ACE Inhibitor",stock:28,  min:30,  unit:"Tablet",  expiry:"2027-03-20", supplier:"PharmaCo Ltd", cost:0.6,  price:1.4,  status:"Low Stock" },
  { id:"MED-004", name:"Ibuprofen 400mg",    category:"NSAID",        stock:0,   min:100, unit:"Tablet",  expiry:"2026-09-01", supplier:"GlobalMed",    cost:0.3,  price:0.9,  status:"Out of Stock" },
  { id:"MED-005", name:"Cetirizine 10mg",    category:"Antihistamine",stock:320, min:60,  unit:"Tablet",  expiry:"2027-08-15", supplier:"MediSource",   cost:0.4,  price:1.0,  status:"In Stock" },
  { id:"MED-006", name:"Omeprazole 20mg",    category:"PPI",          stock:95,  min:50,  unit:"Capsule", expiry:"2026-05-10", supplier:"PharmaCo Ltd", cost:0.7,  price:1.6,  status:"Expiring Soon" },
  { id:"MED-007", name:"Paracetamol 500mg",  category:"Analgesic",    stock:500, min:100, unit:"Tablet",  expiry:"2027-11-30", supplier:"GlobalMed",    cost:0.2,  price:0.7,  status:"In Stock" },
  { id:"MED-008", name:"Azithromycin 250mg", category:"Antibiotic",   stock:45,  min:30,  unit:"Tablet",  expiry:"2026-10-20", supplier:"PharmaCo Ltd", cost:1.2,  price:2.5,  status:"In Stock" },
];

const LAB_DATA = [
  { id:"LAB-501", patient:"Amina Hassan",  patientId:"P-0041", test:"Complete Blood Count", doctor:"Dr. Khadar Ali",  date:"2026-04-23", status:"completed",  result:"Normal",   urgent:false, sample:"Blood" },
  { id:"LAB-502", patient:"Abdi Warsame",  patientId:"P-0044", test:"MRI Brain",            doctor:"Dr. Bashir Omar", date:"2026-04-23", status:"in-progress",result:"Pending",  urgent:true,  sample:"Imaging" },
  { id:"LAB-503", patient:"Faadumo Idle",  patientId:"P-0043", test:"Skin Culture",         doctor:"Dr. Abdullahi H.",date:"2026-04-23", status:"pending",    result:"—",        urgent:false, sample:"Swab" },
  { id:"LAB-504", patient:"Hodan Yusuf",   patientId:"P-0045", test:"Urinalysis",           doctor:"Dr. Sahra Warsam",date:"2026-04-22", status:"completed",  result:"Abnormal", urgent:false, sample:"Urine" },
  { id:"LAB-505", patient:"Mohamed Jama",  patientId:"P-0046", test:"Lipid Panel",          doctor:"Dr. Khadar Ali",  date:"2026-04-23", status:"pending",    result:"—",        urgent:false, sample:"Blood" },
  { id:"LAB-506", patient:"Omar Farah",    patientId:"P-0042", test:"X-Ray Right Knee",     doctor:"Dr. Layla Ahmed", date:"2026-04-23", status:"completed",  result:"Fracture", urgent:true,  sample:"Imaging" },
];

const WARDS_DATA = [
  { id:"W-01", name:"General Ward A",   beds:20, occupied:15, dept:"General",    floor:"1F" },
  { id:"W-02", name:"Cardiology ICU",   beds:8,  occupied:7,  dept:"Cardiology", floor:"2F" },
  { id:"W-03", name:"Pediatric Ward",   beds:12, occupied:6,  dept:"Pediatrics", floor:"2F" },
  { id:"W-04", name:"Orthopedic Ward",  beds:10, occupied:4,  dept:"Orthopedics",floor:"3F" },
  { id:"W-05", name:"Neurology Unit",   beds:6,  occupied:6,  dept:"Neurology",  floor:"3F" },
  { id:"W-06", name:"Emergency Bay",    beds:5,  occupied:3,  dept:"Emergency",  floor:"GF" },
];

const INPATIENTS_DATA = [
  { id:"IP-201", patient:"Mohamed Jama",  patientId:"P-0046", ward:"Cardiology ICU",  bed:"B-02", admitted:"2026-04-20", doctor:"Dr. Khadar Ali",   status:"Stable",   days:3 },
  { id:"IP-202", patient:"Abdi Warsame",  patientId:"P-0044", ward:"Neurology Unit",  bed:"B-01", admitted:"2026-04-21", doctor:"Dr. Bashir Omar",  status:"Critical", days:2 },
  { id:"IP-203", patient:"Hodan Yusuf",   patientId:"P-0045", ward:"Pediatric Ward",  bed:"B-05", admitted:"2026-04-22", doctor:"Dr. Sahra Warsam", status:"Improving",days:1 },
  { id:"IP-204", patient:"Amina Hassan",  patientId:"P-0041", ward:"General Ward A",  bed:"B-11", admitted:"2026-04-22", doctor:"Dr. Khadar Ali",   status:"Stable",   days:1 },
];

const STAFF_DATA = [
  { id:"ST-001", name:"Nurse Fadumo Ali",    role:"Senior Nurse",  dept:"Cardiology",  shift:"Morning", phone:"+252 63 430 1100", status:"Active",   attendance:"96%" },
  { id:"ST-002", name:"Nurse Ahmed Warsame", role:"Staff Nurse",   dept:"Pediatrics",  shift:"Evening", phone:"+252 63 430 2200", status:"Active",   attendance:"91%" },
  { id:"ST-003", name:"Nurse Layla Hassan",  role:"Charge Nurse",  dept:"ICU",         shift:"Night",   phone:"+252 63 430 3300", status:"Active",   attendance:"98%" },
  { id:"ST-004", name:"Pharmacist Hodan O.", role:"Pharmacist",    dept:"Pharmacy",    shift:"Morning", phone:"+252 63 430 4400", status:"Active",   attendance:"94%" },
  { id:"ST-005", name:"Lab Tech Bashir M.",  role:"Lab Tech",      dept:"Laboratory",  shift:"Morning", phone:"+252 63 430 5500", status:"On Leave", attendance:"88%" },
  { id:"ST-006", name:"Admin Sara Jama",     role:"Receptionist",  dept:"Admin",       shift:"Morning", phone:"+252 63 430 6600", status:"Active",   attendance:"97%" },
];

const PRESCRIPTIONS_DATA = [
  { id:"RX-001", patient:"Amina Hassan", patientId:"P-0041", doctor:"Dr. Khadar Ali",  date:"2026-04-23",
    medicines:[{name:"Lisinopril 10mg",dose:"1 tab",freq:"Once daily",dur:"30 days"},{name:"Aspirin 75mg",dose:"1 tab",freq:"Once daily",dur:"30 days"}],
    notes:"Take with food. Monitor BP weekly.", status:"dispensed" },
  { id:"RX-002", patient:"Hodan Yusuf",  patientId:"P-0045", doctor:"Dr. Sahra Warsam",date:"2026-04-23",
    medicines:[{name:"Paracetamol 500mg",dose:"1 tab",freq:"3x daily",dur:"5 days"},{name:"Cetirizine 10mg",dose:"1 tab",freq:"Once at night",dur:"7 days"}],
    notes:"Avoid driving while on cetirizine.", status:"pending" },
  { id:"RX-003", patient:"Abdi Warsame", patientId:"P-0044", doctor:"Dr. Bashir Omar",  date:"2026-04-22",
    medicines:[{name:"Ibuprofen 400mg",dose:"1 tab",freq:"3x daily",dur:"7 days"}],
    notes:"Take with food.", status:"dispensed" },
];

const EMERGENCY_DATA = [
  { id:"EM-001", patient:"Unknown Male ~40yr", arrived:"08:15", triage:"Critical",    complaint:"Chest pain, SOB",   status:"Resuscitation", doctor:"Dr. Khadar Ali",  wait:0  },
  { id:"EM-002", patient:"Faadumo Hassan",     arrived:"08:45", triage:"Urgent",      complaint:"High fever 39.8°C", status:"In Assessment", doctor:"Dr. Sahra Warsam",wait:12 },
  { id:"EM-003", patient:"Child, 7yr",         arrived:"09:00", triage:"Urgent",      complaint:"Seizure episode",   status:"Waiting",       doctor:"Unassigned",      wait:28 },
  { id:"EM-004", patient:"Abshir Mohamed",     arrived:"09:20", triage:"Semi-urgent", complaint:"Ankle sprain",      status:"Waiting",       doctor:"Dr. Layla Ahmed", wait:45 },
  { id:"EM-005", patient:"Saynab Ali",         arrived:"09:35", triage:"Non-urgent",  complaint:"Headache 2 days",   status:"Waiting",       doctor:"Unassigned",      wait:65 },
];

const NOTIFICATIONS_DATA = [
  { id:"N-001", type:"urgent",   msg:"Lab ABNORMAL — Hodan Yusuf (Urinalysis)",          time:"2 min ago",  read:false },
  { id:"N-002", type:"alert",    msg:"Low stock — Lisinopril 10mg (28 units)",            time:"15 min ago", read:false },
  { id:"N-003", type:"reminder", msg:"Appointment reminder — APT-306 tomorrow 09:00",    time:"1 hr ago",   read:false },
  { id:"N-004", type:"billing",  msg:"Unpaid invoice — INV-802 Omar Farah ($280)",        time:"2 hrs ago",  read:true  },
  { id:"N-005", type:"alert",    msg:"Ibuprofen 400mg — Out of stock",                   time:"3 hrs ago",  read:true  },
  { id:"N-006", type:"urgent",   msg:"Emergency — Abdi Warsame critical",                time:"4 hrs ago",  read:true  },
];

const MONTHLY_REVENUE = [18400,21000,19800,24500,22300,27100,25400,28900,26700,31200,29800,34100];
const MONTHLY_PATIENTS = [95,108,102,119,113,128,121,134,127,142,138,151];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── STATUS CONFIG ─────────────────────────────────────────────────────────────
const STATUS_MAP = {
  "checked-in":   { bg:"rgba(52,211,153,0.15)",  color:"#34D399", label:"Checked In"   },
  "scheduled":    { bg:"rgba(96,165,250,0.15)",  color:"#60A5FA", label:"Scheduled"    },
  "completed":    { bg:"rgba(167,139,250,0.15)", color:"#A78BFA", label:"Completed"    },
  "cancelled":    { bg:"rgba(248,113,113,0.15)", color:"#F87171", label:"Cancelled"    },
  "no-show":      { bg:"rgba(251,191,36,0.15)",  color:"#FBBF24", label:"No-show"      },
  "paid":         { bg:"rgba(52,211,153,0.15)",  color:"#34D399", label:"Paid"         },
  "unpaid":       { bg:"rgba(248,113,113,0.15)", color:"#F87171", label:"Unpaid"       },
  "partially paid":{ bg:"rgba(251,191,36,0.15)",color:"#FBBF24", label:"Partial"      },
  "Active":       { bg:"rgba(52,211,153,0.15)",  color:"#34D399", label:"Active"       },
  "Inactive":     { bg:"rgba(248,113,113,0.15)", color:"#F87171", label:"Inactive"     },
  "On Leave":     { bg:"rgba(251,191,36,0.15)",  color:"#FBBF24", label:"On Leave"     },
  "In Stock":     { bg:"rgba(52,211,153,0.15)",  color:"#34D399", label:"In Stock"     },
  "Low Stock":    { bg:"rgba(251, 50, 36, 0.15)",  color:"#FBBF24", label:"Low Stock"    },
  "Out of Stock": { bg:"rgba(248,113,113,0.15)", color:"#F87171", label:"Out of Stock" },
  "Expiring Soon":{ bg:"rgba(251,100,36,0.15)",  color:"#FB923C", label:"Expiring"     },
  "pending":      { bg:"rgba(96,165,250,0.15)",  color:"#60A5FA", label:"Pending"      },
  "in-progress":  { bg:"rgba(251,191,36,0.15)",  color:"#FBBF24", label:"In Progress"  },
  "dispensed":    { bg:"rgba(52,211,153,0.15)",  color:"#34D399", label:"Dispensed"    },
  "Critical":     { bg:"rgba(248,113,113,0.25)", color:"#F87171", label:"Critical"     },
  "Urgent":       { bg:"rgba(251,100,36,0.2)",   color:"#FB923C", label:"Urgent"       },
  "Semi-urgent":  { bg:"rgba(251,191,36,0.15)",  color:"#FBBF24", label:"Semi-Urgent"  },
  "Non-urgent":   { bg:"rgba(52,211,153,0.15)",  color:"#34D399", label:"Non-Urgent"   },
  "Stable":       { bg:"rgba(52,211,153,0.15)",  color:"#34D399", label:"Stable"       },
  "Improving":    { bg:"rgba(96,165,250,0.15)",  color:"#60A5FA", label:"Improving"    },
  "Normal":       { bg:"rgba(52,211,153,0.15)",  color:"#34D399", label:"Normal"       },
  "Abnormal":     { bg:"rgba(248,113,113,0.15)", color:"#F87171", label:"Abnormal"     },
  "Fracture":     { bg:"rgba(248,113,113,0.15)", color:"#F87171", label:"Fracture"     },
  "Pending":      { bg:"rgba(96,165,250,0.15)",  color:"#60A5FA", label:"Pending"      },
  "Pending Approval": { bg:"rgba(251,191,36,0.15)", color:"#FBBF24", label:"Pending Approval" },
  "Rejected":     { bg:"rgba(248,113,113,0.15)", color:"#F87171", label:"Rejected"     },
};

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
function Badge({ status }) {
  const s = STATUS_MAP[status] || { bg:"rgba(100, 129, 139, 0.15)", color:"#94A3B8", label: status };
  return (
    <span style={{ background:s.bg, color:s.color, padding:"2px 10px", borderRadius:99, fontSize:11, fontFamily:C.mono, fontWeight:600, letterSpacing:".04em", whiteSpace:"nowrap" }}>
      {s.label}
    </span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, ...style }}>
      {children}
    </div>
  );
}
function StatCard({ label, value, icon, accent = C.blue }) {
  return (
    <Card
      style={{
        padding: 22,
        minHeight: 95,
        borderBottom: `2px solid ${accent}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: C.mono,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: ".12em",
              color: C.muted,
              marginBottom: 14,
            }}
          >
            {label}
          </div>

          <div
            style={{
              fontFamily: C.serif,
              fontSize: 32,
              fontWeight: 800,
              color: accent,
              lineHeight: 1,
            }}
          >
            {value}
          </div>
        </div>

        <div
          style={{
            fontSize: 24,
            opacity: 0.9,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}
function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20 }}>
      <div>
        <h2 style={{ fontFamily:C.serif, fontSize:22, color:C.text, fontWeight:700, margin:0 }}>{title}</h2>
        {subtitle && <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, marginTop:4 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder = "Search...", width = 220 }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 16px", color:C.text, fontFamily:C.mono, fontSize:12, outline:"none", width }} />
  );
}

function AmberBtn({ onClick, children, small = false }) {
  return (
    <button onClick={onClick} style={{ background:C.amber, border:"none", borderRadius:10, padding: small ? "6px 14px":"9px 20px", color:"#0F172A", fontFamily:C.mono, fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:".04em", whiteSpace:"nowrap" }}>
      {children}
    </button>
  );
}

function GhostBtn({ onClick, children, color = C.muted }) {
  return (
    <button onClick={onClick} style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 14px", color, fontFamily:C.mono, fontSize:11, fontWeight:600, cursor:"pointer" }}>
      {children}
    </button>
  );
}

function Select({ value, onChange, options, style = {} }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 12px", color:C.text, fontFamily:C.mono, fontSize:12, outline:"none", cursor:"pointer", ...style }}>
      {options.map(o => <option key={o.value} value={o.value} style={{ background:"#0D1B2E" }}>{o.label}</option>)}
    </select>
  );
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, width = 560 }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#0D1B2E", border:`1px solid ${C.border}`, borderRadius:20, width:"100%", maxWidth:width, maxHeight:"90vh", overflow:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"22px 28px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:C.serif, fontSize:18, color:C.text, fontWeight:700 }}>{title}</div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:8, color:C.muted, cursor:"pointer", fontSize:18, padding:"4px 10px" }}>×</button>
        </div>
        <div style={{ padding:"24px 28px" }}>{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontFamily:C.mono, fontSize:11, color:C.muted, letterSpacing:".06em", textTransform:"uppercase", marginBottom:6 }}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder = "" }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", color:C.text, fontFamily:C.mono, fontSize:12, outline:"none", boxSizing:"border-box" }} />
  );
}

// ── TABLE ─────────────────────────────────────────────────────────────────────
function DataTable({ columns, rows, renderRow, pageSize = 8 }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / pageSize);
  const slice = rows.slice(page * pageSize, (page + 1) * pageSize);

  useEffect(() => { setPage(0); }, [rows.length]);

  return (
    <div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"rgba(0,0,0,0.2)" }}>
              {columns.map(c => (
                <th key={c} style={{ padding:"11px 20px", textAlign:"left", fontSize:10, color:C.faint, fontFamily:C.mono, letterSpacing:".08em", textTransform:"uppercase", fontWeight:600, whiteSpace:"nowrap" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => renderRow(row, i))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ padding:48, textAlign:"center", color:C.faint, fontFamily:C.mono, fontSize:13 }}>No records found</div>
        )}
      </div>
      {totalPages > 1 && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted }}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)} of {rows.length}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <GhostBtn onClick={() => setPage(p => Math.max(0, p - 1))} children="← Prev" />
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
              <button key={i} onClick={() => setPage(i)}
                style={{ background: page === i ? C.amber : "rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 11px", color: page === i ? "#0F172A" : C.muted, fontFamily:C.mono, fontSize:11, cursor:"pointer", fontWeight: page === i ? 700 : 400 }}>
                {i + 1}
              </button>
            ))}
            <GhostBtn onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} children="Next →" />
          </div>
        </div>
      )}
    </div>
  );
}

function td(i) {
  return { padding:"12px 20px", borderTop:`1px solid rgba(255,255,255,0.04)`, background: i%2===0?"transparent":"rgba(255,255,255,0.012)" };
}

// ── EXPORT HELPER (CSV) ───────────────────────────────────────────────────────
function exportCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(","), ...data.map(r => keys.map(k => `"${String(r[k]).replace(/"/g,'""')}"`).join(","))];
  const blob = new Blob([rows.join("\n")], { type:"text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename + ".csv"; a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard({ role }) {
  const bars = [18,24,19,31,27,22,30,34,28,31,26,31];
  const labels = ["13","14","15","16","17","18","19","20","21","22","23","24"];
  const stats = [
    { label:"Total Patients",   value:"1,284", delta:"+14 this month", icon:"👥", accent:C.amber  },
    { label:"Active Doctors",   value:"28",    delta:"4 on leave",     icon:"🩺", accent:C.green  },
    { label:"Today's Appts",    value:"31",    delta:"6 remaining",    icon:"📅", accent:C.blue   },
    { label:"Pending Invoices", value:"$4,820",delta:"12 unpaid",      icon:"💳", accent:C.red    },
  ];
  const todayApts = APPOINTMENTS_DATA.filter(a => a.date === "2026-04-23");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {/* Emergency alert bar */}
      <div style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:12, padding:"12px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ color:C.red, fontSize:18 }}>🚨</span>
        <span style={{ fontFamily:C.mono, fontSize:12, color:C.red }}>EMERGENCY</span>
        <span style={{ fontFamily:C.mono, fontSize:12, color:"#CBD5E1" }}>2 critical patients in ER · Abdi Warsame (Neurology ICU) status: Critical</span>
        <div style={{ marginLeft:"auto", fontFamily:C.mono, fontSize:11, color:C.red, cursor:"pointer" }}>VIEW ER →</div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ padding:"22px 22px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:14, right:16, fontSize:26, opacity:.4 }}>{s.icon}</div>
            <div style={{ fontFamily:C.mono, fontSize:10, color:C.muted, letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>{s.label}</div>
            <div style={{ fontSize:30, fontFamily:C.serif, fontWeight:700, color:C.text, lineHeight:1, marginBottom:6 }}>{s.value}</div>
            <div style={{ fontSize:11, color:s.accent, fontFamily:C.mono }}>{s.delta}</div>
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${s.accent}55,transparent)` }} />
          </Card>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1fr", gap:16 }}>
        {/* Chart */}
        <Card style={{ padding:"24px 28px" }}>
          <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, letterSpacing:".06em", textTransform:"uppercase", marginBottom:20 }}>Appointment Volume · April</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:7, height:110 }}>
            {bars.map((h,i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                <div style={{ width:"100%", borderRadius:4, background: i===bars.length-1 ? C.amber : "rgba(96,165,250,0.3)", height:`${(h/40)*100}%`, transition:"height .3s", minHeight:4 }} />
                <div style={{ fontSize:9, color:"#475569", fontFamily:C.mono }}>{labels[i]}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Today */}
        <Card style={{ padding:"22px 22px" }}>
          <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, letterSpacing:".06em", textTransform:"uppercase", marginBottom:14 }}>Today · Apr 23</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {todayApts.map(a => (
              <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 12px", background:"rgba(255,255,255,0.04)", borderRadius:10 }}>
                <div>
                  <div style={{ fontSize:13, color:C.text, fontWeight:500 }}>{a.patient}</div>
                  <div style={{ fontSize:10, color:C.muted, fontFamily:C.mono }}>{a.time} · {a.dept}</div>
                </div>
                <Badge status={a.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Ward + Lab quick summary */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card style={{ padding:"22px 24px" }}>
          <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, letterSpacing:".06em", textTransform:"uppercase", marginBottom:16 }}>Ward Occupancy</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {WARDS_DATA.map(w => {
              const pct = Math.round((w.occupied / w.beds) * 100);
              const col = pct >= 90 ? C.red : pct >= 70 ? C.amber : C.green;
              return (
                <div key={w.id}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontFamily:C.mono, fontSize:11, color:C.text }}>{w.name}</span>
                    <span style={{ fontFamily:C.mono, fontSize:11, color:col }}>{w.occupied}/{w.beds}</span>
                  </div>
                  <div style={{ height:4, background:"rgba(255,255,255,0.07)", borderRadius:4 }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:col, borderRadius:4, transition:"width .4s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card style={{ padding:"22px 24px" }}>
          <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, letterSpacing:".06em", textTransform:"uppercase", marginBottom:16 }}>Pending Lab Tests</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {LAB_DATA.filter(l => l.status !== "completed").map(l => (
              <div key={l.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 12px", background:"rgba(255,255,255,0.04)", borderRadius:10 }}>
                <div>
                  <div style={{ fontSize:12, color:C.text }}>{l.patient}</div>
                  <div style={{ fontSize:10, color:C.muted, fontFamily:C.mono }}>{l.test}</div>
                </div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  {l.urgent && <span style={{ fontSize:9, color:C.red, fontFamily:C.mono, background:"rgba(248,113,113,0.1)", padding:"1px 6px", borderRadius:4 }}>URGENT</span>}
                  <Badge status={l.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PATIENTS  (with detail view)
// ═══════════════════════════════════════════════════════════════════════════════
function PatientsPage({ onViewPatient }) {
  const emptyForm = {
    id: "",
    name: "",
    age: "",
    gender: "",
    phone: "",
    address: "",
    department: "",
    doctor: "",
    diagnosis: "",
    status: "Active",
    notes: "",
  };

  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const normalizePatient = (patient, index = 0) => {
    const id = patient._id || patient.id || `PT-${String(index + 1).padStart(3, "0")}`;
    return {
      ...patient,
      id,
      patientCode: patient.patientCode || `PT-${String(index + 1).padStart(3, "0")}`,
      name: patient.name || "Unnamed Patient",
      age: patient.age || "",
      gender: patient.gender || "",
      phone: patient.phone || "",
      address: patient.address || patient.addr || "",
      addr: patient.address || patient.addr || "",
      department: patient.department || patient.dept || "General",
      dept: patient.department || patient.dept || "General",
      doctor: patient.doctor || "",
      diagnosis: patient.diagnosis || "",
      status: patient.status || "Active",
      notes: patient.notes || "",
      dob: patient.dob || (patient.age ? `${patient.age} yrs` : "N/A"),
      blood: patient.blood || "N/A",
      visits: patient.visits || 0,
      insurance: patient.insurance || "N/A",
      createdAt: patient.createdAt || "",
    };
  };

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/patients");
      const text = await response.text();
      const data = text ? JSON.parse(text) : [];
      if (!response.ok) throw new Error(data.message || "Failed to load patients");
      setPatients(Array.isArray(data) ? data.map(normalizePatient) : []);
    } catch (err) {
      setError(err.message || "Unable to load patients");
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const updateForm = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setFormOpen(false);
  };

  const addPatient = () => {
    setMessage("");
    setError("");
    setForm(emptyForm);
    setFormOpen(true);
  };

  const editPatient = (patient) => {
    setMessage("");
    setError("");
    setForm({
      id: patient.id,
      name: patient.name || "",
      age: patient.age || "",
      gender: patient.gender || "",
      phone: patient.phone || "",
      address: patient.address || "",
      department: patient.department || "",
      doctor: patient.doctor || "",
      diagnosis: patient.diagnosis || "",
      status: patient.status || "Active",
      notes: patient.notes || "",
    });
    setFormOpen(true);
  };

  const savePatient = async () => {
    if (!form.name.trim()) {
      setError("Patient name is required");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const isEditing = Boolean(form.id);
      const payload = isEditing ? { ...form, id: form.id } : { ...form };
      const response = await fetch("/api/patients", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok) throw new Error(data.message || "Patient save failed");
      setMessage(isEditing ? "Patient updated successfully" : "Patient added successfully");
      resetForm();
      await loadPatients();
    } catch (err) {
      setError(err.message || "Unable to save patient");
    } finally {
      setSaving(false);
    }
  };

  const deletePatient = async (patient) => {
    if (!window.confirm(`Delete patient record for ${patient.name}?`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/patients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: patient.id }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok) throw new Error(data.message || "Patient delete failed");
      setMessage("Patient deleted successfully");
      await loadPatients();
    } catch (err) {
      setError(err.message || "Unable to delete patient");
    } finally {
      setSaving(false);
    }
  };

  const filtered = patients.filter((p) => {
    const byStatus = statusFilter === "all" || p.status === statusFilter;
    const q = search.toLowerCase();
    const bySearch = [p.name, p.phone, p.department, p.doctor, p.diagnosis, p.status]
      .some((v) => String(v || "").toLowerCase().includes(q));
    return byStatus && bySearch;
  });

  const activeCount = patients.filter((p) => p.status === "Active").length;
  const criticalCount = patients.filter((p) => p.status === "Critical").length;
  const dischargedCount = patients.filter((p) => p.status === "Discharged").length;

  const inputStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "10px 12px",
    color: C.text,
    fontFamily: C.mono,
    fontSize: 12,
    outline: "none",
  };

  const labelStyle = {
    fontFamily: C.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: ".08em",
    textTransform: "uppercase",
    marginBottom: 6,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader
        title="Patient Registry"
        subtitle={`${filtered.length} real patient records from MongoDB`}
        action={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <GhostBtn onClick={loadPatients}>Refresh Patients</GhostBtn>
            <AmberBtn onClick={addPatient}>+ New Patient</AmberBtn>
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Total Patients" value={patients.length} icon="👥" accent={C.blue} />
        <StatCard label="Active" value={activeCount} icon="✅" accent={C.green} />
        <StatCard label="Critical" value={criticalCount} icon="🚨" accent={C.red} />
        <StatCard label="Discharged" value={dischargedCount} icon="🏁" accent={C.amber} />
      </div>

      {(message || error) && (
        <div style={{
          border: `1px solid ${error ? "rgba(248,113,113,.35)" : "rgba(52,211,153,.35)"}`,
          background: error ? "rgba(248,113,113,.12)" : "rgba(52,211,153,.12)",
          color: error ? C.red : C.green,
          padding: "12px 14px",
          borderRadius: 12,
          fontFamily: C.mono,
          fontSize: 12,
        }}>
          {error ? "❌" : "✅"} {error || message}
        </div>
      )}

      {formOpen && (
        <Card style={{ padding: 20 }}>
          <div style={{ fontFamily: C.serif, fontSize: 20, color: C.text, fontWeight: 700, marginBottom: 16 }}>
            {form.id ? "Edit Patient" : "Register New Patient"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <div><div style={labelStyle}>Full Name</div><input style={inputStyle} value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Ahmed Ali" /></div>
            <div><div style={labelStyle}>Age</div><input style={inputStyle} value={form.age} onChange={(e) => updateForm("age", e.target.value)} placeholder="30" /></div>
            <div><div style={labelStyle}>Gender</div><select style={inputStyle} value={form.gender} onChange={(e) => updateForm("gender", e.target.value)}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
            <div><div style={labelStyle}>Phone</div><input style={inputStyle} value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} placeholder="0634000000" /></div>
            <div><div style={labelStyle}>Department</div><input style={inputStyle} value={form.department} onChange={(e) => updateForm("department", e.target.value)} placeholder="Emergency" /></div>
            <div><div style={labelStyle}>Assigned Doctor</div><input style={inputStyle} value={form.doctor} onChange={(e) => updateForm("doctor", e.target.value)} placeholder="Dr. Amina" /></div>
            <div><div style={labelStyle}>Status</div><select style={inputStyle} value={form.status} onChange={(e) => updateForm("status", e.target.value)}><option value="Active">Active</option><option value="Critical">Critical</option><option value="Discharged">Discharged</option><option value="Inactive">Inactive</option></select></div>
            <div><div style={labelStyle}>Address</div><input style={inputStyle} value={form.address} onChange={(e) => updateForm("address", e.target.value)} placeholder="Hargeisa" /></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
            <div><div style={labelStyle}>Diagnosis</div><input style={inputStyle} value={form.diagnosis} onChange={(e) => updateForm("diagnosis", e.target.value)} placeholder="Initial diagnosis" /></div>
            <div><div style={labelStyle}>Notes</div><input style={inputStyle} value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} placeholder="Clinical notes" /></div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <AmberBtn onClick={savePatient}>{saving ? "Saving..." : form.id ? "Update Patient" : "Register Patient"}</AmberBtn>
            <GhostBtn onClick={resetForm}>Cancel</GhostBtn>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search real patients..." />
        <select style={{ ...inputStyle, width: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Critical">Critical</option>
          <option value="Discharged">Discharged</option>
          <option value="Inactive">Inactive</option>
        </select>
        <GhostBtn onClick={() => exportCSV(filtered, "patients")}>⬇ Export CSV</GhostBtn>
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: 28, color: C.muted, fontFamily: C.mono }}>Loading real patient records...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 28, color: C.muted, fontFamily: C.mono }}>No patients found. Click + New Patient to add one.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.2)" }}>
                  {["Patient ID", "Name", "Age", "Gender", "Department", "Phone", "Diagnosis", "Status", "Action"].map((h) => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10, color: C.faint, fontFamily: C.mono, letterSpacing: ".08em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ ...td(i), color: C.blue, fontFamily: C.mono, fontSize: 12 }}>{p.patientCode}</td>
                    <td style={{ ...td(i), color: C.text, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ ...td(i), color: C.muted, fontFamily: C.mono }}>{p.age || "N/A"}</td>
                    <td style={{ ...td(i), color: C.muted }}>{p.gender || "N/A"}</td>
                    <td style={{ ...td(i), color: C.muted }}>{p.department || "General"}</td>
                    <td style={{ ...td(i), color: C.blue, fontFamily: C.mono }}>{p.phone || "N/A"}</td>
                    <td style={{ ...td(i), color: C.muted }}>{p.diagnosis || "N/A"}</td>
                    <td style={td(i)}><Badge status={p.status} /></td>
                    <td style={td(i)}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <GhostBtn onClick={() => onViewPatient && onViewPatient(p)} color={C.amber}>View</GhostBtn>
                        <GhostBtn onClick={() => editPatient(p)} color={C.blue}>Edit</GhostBtn>
                        <GhostBtn onClick={() => deletePatient(p)} color={C.red}>Delete</GhostBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div style={{ fontFamily: C.mono, fontSize: 11, color: C.muted }}>
        This page now reads and writes real patient records from MongoDB. Demo patient data is no longer displayed here.
      </div>
    </div>
  );
}

// ── PATIENT PROFILE ───────────────────────────────────────────────────────────
function PatientProfile({ patient, onBack }) {
  const [tab, setTab] = useState("overview");
  const tabs = ["overview","visits","prescriptions","labs","billing"];
  const patientApts = APPOINTMENTS_DATA.filter(a => a.patientId === patient.id);
  const patientBills = BILLS_DATA.filter(b => b.patientId === patient.id);
  const patientRx = PRESCRIPTIONS_DATA.filter(r => r.patientId === patient.id);
  const patientLabs = LAB_DATA.filter(l => l.patientId === patient.id);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", gap:14, alignItems:"center" }}>
        <GhostBtn onClick={onBack}>← Back</GhostBtn>
        <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted }}>Patient Record</div>
      </div>

      {/* Header card */}
      <Card style={{ padding:"28px 32px" }}>
        <div style={{ display:"flex", gap:24, alignItems:"flex-start" }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:`linear-gradient(135deg,${C.amberD},#92400E)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:700, color:"#FFF", fontFamily:C.serif, flexShrink:0 }}>
            {patient.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:C.serif, fontSize:24, color:C.text, fontWeight:700, marginBottom:4 }}>{patient.name}</div>
            <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
              {[["ID", patient.id], ["DOB", patient.dob], ["Gender", patient.gender], ["Blood", patient.blood], ["Insurance", patient.insurance]].map(([l,v]) => (
                <div key={l}>
                  <div style={{ fontFamily:C.mono, fontSize:9, color:C.muted, letterSpacing:".08em", textTransform:"uppercase" }}>{l}</div>
                  <div style={{ fontFamily:C.mono, fontSize:12, color: l==="Blood" ? C.amber : C.text, fontWeight: l==="Blood" ? 700 : 400 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Badge status={patient.status} />
            <AmberBtn small>Book Appointment</AmberBtn>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginTop:24, paddingTop:20, borderTop:`1px solid ${C.border}` }}>
          {[["Phone", patient.phone],["Email", patient.email],["Address", patient.addr],["Allergies", patient.allergies],["Emergency Contact", patient.emergency],["Department", patient.dept]].map(([l,v]) => (
            <div key={l}>
              <div style={{ fontFamily:C.mono, fontSize:9, color:C.muted, letterSpacing:".08em", textTransform:"uppercase", marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:13, color: l==="Allergies" && v!=="None" ? C.red : C.text }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab===t ? C.amberBg : "transparent", border: tab===t ? `1px solid rgba(245,158,11,0.3)` : `1px solid transparent`, borderRadius:10, padding:"8px 18px", color: tab===t ? C.amber : C.muted, fontFamily:C.mono, fontSize:11, cursor:"pointer", textTransform:"capitalize", fontWeight: tab===t ? 700 : 400 }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <Card style={{ padding:20 }}>
            <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:14 }}>Recent Appointments</div>
            {patientApts.slice(0,3).map(a => (
              <div key={a.id} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
                <div><div style={{ fontSize:12, color:C.text }}>{a.reason}</div><div style={{ fontSize:10, fontFamily:C.mono, color:C.muted }}>{a.date} · {a.doctor}</div></div>
                <Badge status={a.status} />
              </div>
            ))}
          </Card>
          <Card style={{ padding:20 }}>
            <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:14 }}>Billing Summary</div>
            {patientBills.map(b => (
              <div key={b.id} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
                <div><div style={{ fontSize:12, color:C.text }}>{b.id}</div><div style={{ fontSize:10, fontFamily:C.mono, color:C.muted }}>{b.date}</div></div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontFamily:C.mono, fontSize:12, color:C.text }}>${b.total}</span>
                  <Badge status={b.status} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === "visits" && (
        <Card>
          <DataTable columns={["Appt ID","Date","Time","Doctor","Department","Reason","Status"]}
            rows={patientApts}
            renderRow={(a,i) => (
              <tr key={a.id}>
                <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.blue}}>{a.id}</td>
                <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.muted}}>{a.date}</td>
                <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.amber}}>{a.time}</td>
                <td style={{...td(i), fontSize:13, color:C.text}}>{a.doctor}</td>
                <td style={{...td(i), fontSize:12, color:C.muted}}>{a.dept}</td>
                <td style={{...td(i), fontSize:12, color:C.text}}>{a.reason}</td>
                <td style={td(i)}><Badge status={a.status} /></td>
              </tr>
            )} />
        </Card>
      )}

      {tab === "prescriptions" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {patientRx.map(rx => (
            <Card key={rx.id} style={{ padding:"20px 24px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                <div>
                  <div style={{ fontFamily:C.mono, fontSize:12, color:C.blue }}>{rx.id}</div>
                  <div style={{ fontSize:13, color:C.muted }}>{rx.doctor} · {rx.date}</div>
                </div>
                <Badge status={rx.status} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {rx.medicines.map((m, mi) => (
                  <div key={mi} style={{ display:"flex", gap:20, padding:"8px 12px", background:"rgba(255,255,255,0.04)", borderRadius:8 }}>
                    <div style={{ fontFamily:C.mono, fontSize:12, color:C.text, flex:2 }}>{m.name}</div>
                    <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, flex:1 }}>{m.dose}</div>
                    <div style={{ fontFamily:C.mono, fontSize:11, color:C.amber, flex:1 }}>{m.freq}</div>
                    <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted }}>{m.dur}</div>
                  </div>
                ))}
              </div>
              {rx.notes && <div style={{ marginTop:10, fontSize:12, color:C.muted, fontStyle:"italic" }}>📝 {rx.notes}</div>}
            </Card>
          ))}
        </div>
      )}

      {tab === "labs" && (
        <Card>
          <DataTable columns={["Lab ID","Test","Date","Status","Result","Sample"]}
            rows={patientLabs}
            renderRow={(l,i) => (
              <tr key={l.id}>
                <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.blue}}>{l.id}</td>
                <td style={{...td(i), fontSize:13, color:C.text}}>{l.test}</td>
                <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.muted}}>{l.date}</td>
                <td style={td(i)}><Badge status={l.status} /></td>
                <td style={td(i)}><Badge status={l.result} /></td>
                <td style={{...td(i), fontSize:12, color:C.muted}}>{l.sample}</td>
              </tr>
            )} />
        </Card>
      )}

      {tab === "billing" && (
        <Card>
          <DataTable columns={["Invoice","Appointment","Total","Method","Status","Date"]}
            rows={patientBills}
            renderRow={(b,i) => (
              <tr key={b.id}>
                <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.blue}}>{b.id}</td>
                <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.muted}}>{b.apt}</td>
                <td style={{...td(i), fontFamily:C.mono, fontSize:13, color:C.text, fontWeight:700}}>{b.total ? `$${b.total}` : "—"}</td>
                <td style={{...td(i), fontSize:12, color:C.muted}}>{b.method}</td>
                <td style={td(i)}><Badge status={b.status} /></td>
                <td style={{...td(i), fontFamily:C.mono, fontSize:11, color:C.muted}}>{b.date}</td>
              </tr>
            )} />
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  APPOINTMENTS + CALENDAR
// ═══════════════════════════════════════════════════════════════════════════════
function AppointmentsPage() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);

  const filtered = APPOINTMENTS_DATA.filter(a =>
    (statusFilter === "all" || a.status === statusFilter) &&
    Object.values(a).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  );

  // Build a simple April 2026 calendar
  const calDays = Array.from({ length: 30 }, (_, i) => {
    const d = `2026-04-${String(i + 1).padStart(2, "0")}`;
    const dayApts = APPOINTMENTS_DATA.filter(a => a.date === d);
    return { day: i + 1, date: d, apts: dayApts };
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title="Appointment Schedule" subtitle={`${filtered.length} appointments`}
        action={<AmberBtn onClick={() => setShowModal(true)}>+ Book Appointment</AmberBtn>} />

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"space-between" }}>
        <div style={{ display:"flex", gap:10 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search appointments..." />
          <Select value={statusFilter} onChange={setStatusFilter} options={[
            {value:"all",label:"All"},{value:"scheduled",label:"Scheduled"},{value:"checked-in",label:"Checked In"},
            {value:"completed",label:"Completed"},{value:"no-show",label:"No-show"},{value:"cancelled",label:"Cancelled"}
          ]} />
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {["list","calendar"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ background: view===v ? C.amberBg : "transparent", border: view===v ? `1px solid rgba(245,158,11,0.3)` : `1px solid ${C.border}`, borderRadius:8, padding:"7px 16px", color: view===v ? C.amber : C.muted, fontFamily:C.mono, fontSize:11, cursor:"pointer", textTransform:"capitalize" }}>
              {v === "list" ? "☰ List" : "📅 Calendar"}
            </button>
          ))}
          <GhostBtn onClick={() => exportCSV(filtered, "appointments")}>⬇ Export</GhostBtn>
        </div>
      </div>

      {view === "list" ? (
        <Card>
          <DataTable
            columns={["ID","Patient","Doctor","Date","Time","Department","Reason","Status"]}
            rows={filtered}
            renderRow={(a,i) => (
              <tr key={a.id}>
                <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.blue}}>{a.id}</td>
                <td style={{...td(i), color:C.text, fontSize:13, fontWeight:500}}>{a.patient}</td>
                <td style={{...td(i), fontSize:12, color:C.muted}}>{a.doctor}</td>
                <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.muted}}>{a.date}</td>
                <td style={{...td(i), fontFamily:C.mono, fontSize:13, color:C.amber, fontWeight:700}}>{a.time}</td>
                <td style={{...td(i), fontSize:12, color:C.muted}}>{a.dept}</td>
                <td style={{...td(i), fontSize:12, color:C.muted, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{a.reason}</td>
                <td style={td(i)}><Badge status={a.status} /></td>
              </tr>
            )} />
        </Card>
      ) : (
        <Card style={{ padding:24 }}>
          <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:16 }}>April 2026</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8 }}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div key={d} style={{ fontFamily:C.mono, fontSize:10, color:C.faint, textAlign:"center", paddingBottom:8 }}>{d}</div>
            ))}
            {/* April 2026 starts on Wednesday (offset 3) */}
            {Array.from({length:3}).map((_,i) => <div key={`e${i}`} />)}
            {calDays.map(({ day, date, apts }) => {
              const isToday = day === 23;
              return (
                <div key={day} style={{ background: isToday ? C.amberBg : "rgba(255,255,255,0.02)", border: isToday ? `1px solid rgba(245,158,11,0.4)` : `1px solid ${C.border}`, borderRadius:10, padding:"8px 10px", minHeight:70 }}>
                  <div style={{ fontFamily:C.mono, fontSize:11, color: isToday ? C.amber : C.muted, fontWeight: isToday ? 700 : 400, marginBottom:4 }}>{day}</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                    {apts.slice(0,3).map(a => {
                      const s = STATUS_MAP[a.status];
                      return <div key={a.id} style={{ fontSize:9, background: s?.bg, color: s?.color, borderRadius:3, padding:"1px 4px", fontFamily:C.mono, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.time} {a.patient.split(" ")[0]}</div>;
                    })}
                    {apts.length > 3 && <div style={{ fontSize:9, color:C.muted, fontFamily:C.mono }}>+{apts.length-3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Book Appointment">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <FormField label="Patient">
            <Select value="" onChange={() => {}} options={[{value:"",label:"Select patient"},...PATIENTS_DATA.map(p => ({value:p.id,label:p.name}))]} style={{width:"100%"}} />
          </FormField>
          <FormField label="Doctor">
            <Select value="" onChange={() => {}} options={[{value:"",label:"Select doctor"},...DOCTORS_DATA.map(d => ({value:d.id,label:d.name}))]} style={{width:"100%"}} />
          </FormField>
          <FormField label="Date"><TextInput value="" onChange={() => {}} placeholder="2026-04-25" /></FormField>
          <FormField label="Time"><TextInput value="" onChange={() => {}} placeholder="10:00" /></FormField>
          <FormField label="Reason" ><TextInput value="" onChange={() => {}} placeholder="Reason for visit" /></FormField>
          <FormField label="Department">
            <Select value="" onChange={() => {}} options={[{value:"",label:"Select dept"},...["Cardiology","Neurology","Pediatrics","Orthopedics","Dermatology"].map(d=>({value:d,label:d}))]} style={{width:"100%"}} />
          </FormField>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <AmberBtn onClick={() => setShowModal(false)}>Book Appointment</AmberBtn>
          <GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHARMACY
// ═══════════════════════════════════════════════════════════════════════════════
function PharmacyPage() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);

  const categories = ["all", ...new Set(MEDICINES_DATA.map(m => m.category))];
  const filtered = MEDICINES_DATA.filter(m =>
    (catFilter === "all" || m.category === catFilter) &&
    Object.values(m).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  );

  const alerts = MEDICINES_DATA.filter(m => m.status !== "In Stock");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title="Pharmacy & Inventory" subtitle={`${MEDICINES_DATA.length} medicines`}
        action={<div style={{ display:"flex", gap:10 }}><GhostBtn onClick={() => exportCSV(filtered,"medicines")}>⬇ Export</GhostBtn><AmberBtn onClick={() => setShowModal(true)}>+ Add Medicine</AmberBtn></div>} />

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {alerts.map(m => (
            <div key={m.id} style={{ background:"rgba(248,113,113,0.07)", border:`1px solid rgba(248,113,113,0.2)`, borderRadius:10, padding:"10px 18px", display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:14 }}>{m.status === "Out of Stock" ? "🚫" : m.status === "Low Stock" ? "⚠️" : "⏰"}</span>
              <span style={{ fontFamily:C.mono, fontSize:12, color:C.red }}>{m.status.toUpperCase()}</span>
              <span style={{ fontSize:13, color:C.text }}>{m.name}</span>
              <span style={{ fontSize:12, color:C.muted }}>Stock: {m.stock} units · Min: {m.min}</span>
              {m.status === "Expiring Soon" && <span style={{ fontSize:12, color:"#FB923C" }}>Expires: {m.expiry}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { label:"Total Medicines",  val:MEDICINES_DATA.length,                      color:C.blue  },
          { label:"In Stock",         val:MEDICINES_DATA.filter(m=>m.status==="In Stock").length, color:C.green },
          { label:"Low / Out",        val:MEDICINES_DATA.filter(m=>m.status!=="In Stock"&&m.status!=="Expiring Soon").length, color:C.red },
          { label:"Expiring Soon",    val:MEDICINES_DATA.filter(m=>m.status==="Expiring Soon").length, color:"#FB923C" },
        ].map(s => (
          <Card key={s.label} style={{ padding:"16px 20px" }}>
            <div style={{ fontFamily:C.mono, fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontFamily:C.serif, fontSize:26, color:s.color, fontWeight:700 }}>{s.val}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search medicines..." />
        <Select value={catFilter} onChange={setCatFilter} options={categories.map(c => ({ value:c, label: c === "all" ? "All Categories" : c }))} />
      </div>

      <Card>
        <DataTable
          columns={["Med ID","Name","Category","Stock","Min","Unit","Expiry","Supplier","Price","Status"]}
          rows={filtered}
          renderRow={(m,i) => (
            <tr key={m.id}>
              <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.blue}}>{m.id}</td>
              <td style={{...td(i), color:C.text, fontSize:13, fontWeight:500}}>{m.name}</td>
              <td style={{...td(i), fontSize:12, color:C.muted}}>{m.category}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:13, color: m.stock === 0 ? C.red : m.stock < m.min ? C.amber : C.green, fontWeight:700}}>{m.stock}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.muted}}>{m.min}</td>
              <td style={{...td(i), fontSize:12, color:C.muted}}>{m.unit}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:11, color: m.status==="Expiring Soon" ? "#FB923C" : C.muted}}>{m.expiry}</td>
              <td style={{...td(i), fontSize:12, color:C.muted}}>{m.supplier}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:13, color:C.green, fontWeight:700}}>${m.price}</td>
              <td style={td(i)}><Badge status={m.status} /></td>
            </tr>
          )} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Medicine to Inventory">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {[["Medicine Name",""],["Category",""],["Stock Quantity",""],["Minimum Stock",""],["Unit","e.g. Tablet"],["Expiry Date","2027-01-01"],["Supplier",""],["Cost Price",""],["Selling Price",""]].map(([l,ph]) => (
            <FormField key={l} label={l}><TextInput value="" onChange={() => {}} placeholder={ph} /></FormField>
          ))}
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <AmberBtn onClick={() => setShowModal(false)}>Add Medicine</AmberBtn>
          <GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LABORATORY
// ═══════════════════════════════════════════════════════════════════════════════
function LaboratoryPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [reportModal, setReportModal] = useState(null);

  const filtered = LAB_DATA.filter(l =>
    (statusFilter === "all" || l.status === statusFilter) &&
    Object.values(l).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title="Laboratory" subtitle={`${filtered.length} test requests`}
        action={<div style={{ display:"flex", gap:10 }}><GhostBtn onClick={() => exportCSV(filtered,"lab-tests")}>⬇ Export</GhostBtn><AmberBtn onClick={() => setShowModal(true)}>+ Request Test</AmberBtn></div>} />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          {label:"Total Tests",  val:LAB_DATA.length,                                   color:C.blue },
          {label:"Pending",      val:LAB_DATA.filter(l=>l.status==="pending").length,    color:C.amber},
          {label:"In Progress",  val:LAB_DATA.filter(l=>l.status==="in-progress").length,color:"#FBBF24"},
          {label:"Completed",    val:LAB_DATA.filter(l=>l.status==="completed").length,  color:C.green},
        ].map(s => (
          <Card key={s.label} style={{ padding:"16px 20px" }}>
            <div style={{ fontFamily:C.mono, fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontFamily:C.serif, fontSize:26, color:s.color, fontWeight:700 }}>{s.val}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search tests..." />
        <Select value={statusFilter} onChange={setStatusFilter} options={[{value:"all",label:"All Status"},{value:"pending",label:"Pending"},{value:"in-progress",label:"In Progress"},{value:"completed",label:"Completed"}]} />
      </div>

      <Card>
        <DataTable
          columns={["Lab ID","Patient","Test","Doctor","Sample","Date","Urgent","Status","Result","Action"]}
          rows={filtered}
          renderRow={(l,i) => (
            <tr key={l.id}>
              <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.blue}}>{l.id}</td>
              <td style={{...td(i), color:C.text, fontSize:13, fontWeight:500}}>{l.patient}</td>
              <td style={{...td(i), fontSize:12, color:C.text}}>{l.test}</td>
              <td style={{...td(i), fontSize:12, color:C.muted}}>{l.doctor}</td>
              <td style={{...td(i), fontSize:12, color:C.muted}}>{l.sample}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.muted}}>{l.date}</td>
              <td style={{...td(i), textAlign:"center"}}>
                {l.urgent && <span style={{ fontSize:10, color:C.red, fontFamily:C.mono, background:"rgba(248,113,113,0.1)", padding:"2px 8px", borderRadius:4, fontWeight:700 }}>URGENT</span>}
              </td>
              <td style={td(i)}><Badge status={l.status} /></td>
              <td style={td(i)}><Badge status={l.result} /></td>
              <td style={td(i)}>{l.status === "completed" && <GhostBtn onClick={() => setReportModal(l)} color={C.teal}>Report</GhostBtn>}</td>
            </tr>
          )} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Request Lab Test">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <FormField label="Patient"><Select value="" onChange={() => {}} options={[{value:"",label:"Select patient"},...PATIENTS_DATA.map(p => ({value:p.id,label:p.name}))]} style={{width:"100%"}} /></FormField>
          <FormField label="Requested By"><Select value="" onChange={() => {}} options={[{value:"",label:"Select doctor"},...DOCTORS_DATA.map(d => ({value:d.id,label:d.name}))]} style={{width:"100%"}} /></FormField>
          <FormField label="Test Name"><TextInput value="" onChange={() => {}} placeholder="e.g. Complete Blood Count" /></FormField>
          <FormField label="Sample Type"><TextInput value="" onChange={() => {}} placeholder="e.g. Blood, Urine" /></FormField>
          <FormField label="Priority">
            <Select value="" onChange={() => {}} options={[{value:"normal",label:"Normal"},{value:"urgent",label:"Urgent"}]} style={{width:"100%"}} />
          </FormField>
          <FormField label="Notes"><TextInput value="" onChange={() => {}} placeholder="Additional notes" /></FormField>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <AmberBtn onClick={() => setShowModal(false)}>Submit Request</AmberBtn>
          <GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn>
        </div>
      </Modal>

      {/* Lab Report Modal */}
      <Modal open={!!reportModal} onClose={() => setReportModal(null)} title="Lab Report" width={500}>
        {reportModal && (
          <div>
            <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px", marginBottom:16 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[["Lab ID",reportModal.id],["Patient",reportModal.patient],["Test",reportModal.test],["Date",reportModal.date],["Sample",reportModal.sample],["Requested by",reportModal.doctor]].map(([l,v]) => (
                  <div key={l}><div style={{ fontFamily:C.mono, fontSize:9, color:C.muted, textTransform:"uppercase", letterSpacing:".06em" }}>{l}</div><div style={{ fontSize:13, color:C.text, marginTop:2 }}>{v}</div></div>
                ))}
              </div>
            </div>
            <div style={{ padding:"16px 20px", background:STATUS_MAP[reportModal.result]?.bg, borderRadius:12, border:`1px solid ${STATUS_MAP[reportModal.result]?.color}33` }}>
              <div style={{ fontFamily:C.mono, fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>Result</div>
              <div style={{ fontSize:22, fontFamily:C.serif, color:STATUS_MAP[reportModal.result]?.color, fontWeight:700 }}>{reportModal.result}</div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <AmberBtn onClick={() => setReportModal(null)}>Print Report</AmberBtn>
              <GhostBtn onClick={() => setReportModal(null)}>Close</GhostBtn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INPATIENT / WARDS
// ═══════════════════════════════════════════════════════════════════════════════
function InpatientsPage() {
  const [showModal, setShowModal] = useState(false);
  const totalBeds = WARDS_DATA.reduce((s,w) => s + w.beds, 0);
  const totalOccupied = WARDS_DATA.reduce((s,w) => s + w.occupied, 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title="Inpatient & Ward Management" subtitle={`${totalOccupied}/${totalBeds} beds occupied`}
        action={<AmberBtn onClick={() => setShowModal(true)}>+ Admit Patient</AmberBtn>} />

      {/* Ward grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        {WARDS_DATA.map(w => {
          const pct = Math.round((w.occupied / w.beds) * 100);
          const col = pct >= 100 ? C.red : pct >= 80 ? C.amber : C.green;
          const free = w.beds - w.occupied;
          return (
            <Card key={w.id} style={{ padding:"20px 22px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, bottom:0, width:3, background:col }} />
              <div style={{ fontFamily:C.serif, fontSize:15, color:C.text, fontWeight:700, marginBottom:4, paddingLeft:10 }}>{w.name}</div>
              <div style={{ fontFamily:C.mono, fontSize:10, color:C.muted, paddingLeft:10, marginBottom:14 }}>{w.floor} · {w.dept}</div>
              <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:4, margin:"0 10px", marginBottom:10 }}>
                <div style={{ height:"100%", width:`${pct}%`, background:col, borderRadius:4, transition:"width .4s" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", paddingLeft:10, paddingRight:10 }}>
                <span style={{ fontFamily:C.mono, fontSize:11, color:col }}>{w.occupied} occupied</span>
                <span style={{ fontFamily:C.mono, fontSize:11, color:C.muted }}>{free} free</span>
                <span style={{ fontFamily:C.mono, fontSize:11, color:C.muted }}>{pct}%</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Inpatients table */}
      <Card>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".06em" }}>Current Inpatients</div>
        </div>
        <DataTable
          columns={["Admit ID","Patient","Ward","Bed","Admitted","Days","Doctor","Status","Action"]}
          rows={INPATIENTS_DATA}
          renderRow={(ip,i) => (
            <tr key={ip.id}>
              <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.blue}}>{ip.id}</td>
              <td style={{...td(i), color:C.text, fontSize:13, fontWeight:500}}>{ip.patient}</td>
              <td style={{...td(i), fontSize:12, color:C.muted}}>{ip.ward}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.amber, fontWeight:700}}>{ip.bed}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.muted}}>{ip.admitted}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:13, color:C.text, textAlign:"center"}}>{ip.days}d</td>
              <td style={{...td(i), fontSize:12, color:C.muted}}>{ip.doctor}</td>
              <td style={td(i)}><Badge status={ip.status} /></td>
              <td style={td(i)}><GhostBtn color={C.red}>Discharge</GhostBtn></td>
            </tr>
          )} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Admit Patient to Ward">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <FormField label="Patient"><Select value="" onChange={() => {}} options={[{value:"",label:"Select patient"},...PATIENTS_DATA.map(p => ({value:p.id,label:p.name}))]} style={{width:"100%"}} /></FormField>
          <FormField label="Ward"><Select value="" onChange={() => {}} options={[{value:"",label:"Select ward"},...WARDS_DATA.map(w => ({value:w.id,label:w.name}))]} style={{width:"100%"}} /></FormField>
          <FormField label="Bed Number"><TextInput value="" onChange={() => {}} placeholder="e.g. B-03" /></FormField>
          <FormField label="Attending Doctor"><Select value="" onChange={() => {}} options={[{value:"",label:"Select doctor"},...DOCTORS_DATA.map(d => ({value:d.id,label:d.name}))]} style={{width:"100%"}} /></FormField>
          <FormField label="Admission Date"><TextInput value="" onChange={() => {}} placeholder="2026-04-23" /></FormField>
          <FormField label="Diagnosis"><TextInput value="" onChange={() => {}} placeholder="Primary diagnosis" /></FormField>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <AmberBtn onClick={() => setShowModal(false)}>Admit Patient</AmberBtn>
          <GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STAFF / USERS - REAL DATA FROM MONGODB
// ═══════════════════════════════════════════════════════════════════════════════
function StaffPage() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/users");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load users");
      }

      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load staff users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const formatRole = (role = "staff") => {
    const clean = String(role || "staff").toLowerCase();
    const map = {
      admin: "Admin",
      doctor: "Doctor",
      nurse: "Nurse",
      receptionist: "Receptionist",
      staff: "Staff",
      pending: "Pending",
      rejected: "Rejected",
    };
    return map[clean] || clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" });
  };

  const staffRows = users.map((u, index) => ({
    id: u._id || u.id || `U-${index + 1}`,
    name: u.fullName || u.name || "Unnamed User",
    role: u.role || "staff",
    roleLabel: formatRole(u.role),
    phone: u.phone || "—",
    email: u.email || "—",
    status: u.status || "Pending Approval",
    createdAt: u.createdAt,
  }));

  const filtered = staffRows.filter((s) => {
    const haystack = `${s.name} ${s.email} ${s.phone} ${s.roleLabel} ${s.status}`.toLowerCase();
    const matchesSearch = haystack.includes(q.toLowerCase());
    const matchesRole = roleFilter === "all" || String(s.role).toLowerCase() === roleFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeCount = staffRows.filter((s) => s.status === "Active").length;
  const pendingCount = staffRows.filter((s) => s.status === "Pending Approval").length;
  const rejectedCount = staffRows.filter((s) => s.status === "Rejected").length;

  return (
    <div>
      <SectionHeader
        title="Staff & Users"
        subtitle={`${staffRows.length} real registered users from MongoDB`}
        action={<AmberBtn onClick={loadUsers}>{loading ? "Loading..." : "Refresh Users"}</AmberBtn>}
      />

      {error && (
        <div style={{
          background:"rgba(248,113,113,0.12)",
          border:"1px solid rgba(248,113,113,0.35)",
          color:C.red,
          padding:"12px 14px",
          borderRadius:12,
          fontFamily:C.mono,
          fontSize:12,
          marginBottom:16,
        }}>
          ❌ {error}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {[
          { label:"Total Users", val:staffRows.length, color:C.blue, icon:"👥" },
          { label:"Active", val:activeCount, color:C.green, icon:"✅" },
          { label:"Pending Approval", val:pendingCount, color:C.amber, icon:"⏳" },
          { label:"Rejected", val:rejectedCount, color:C.red, icon:"⛔" },
        ].map((s) => (
          <Card key={s.label} style={{ padding:22, borderBottom:`2px solid ${s.color}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".08em" }}>{s.label}</div>
                <div style={{ fontFamily:C.serif, fontSize:30, color:s.color, marginTop:8 }}>{s.val}</div>
              </div>
              <div style={{ fontSize:24, opacity:.75 }}>{s.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search real staff..." />
        <Select
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value:"all", label:"All Roles" },
            { value:"admin", label:"Admin" },
            { value:"doctor", label:"Doctor" },
            { value:"nurse", label:"Nurse" },
            { value:"receptionist", label:"Receptionist" },
            { value:"staff", label:"Staff" },
          ]}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value:"all", label:"All Statuses" },
            { value:"Active", label:"Active" },
            { value:"Pending Approval", label:"Pending Approval" },
            { value:"Rejected", label:"Rejected" },
          ]}
        />
        <GhostBtn onClick={() => exportCSV(filtered, "real-staff-users")}>⬇ Export</GhostBtn>
      </div>

      <Card>
        <DataTable
          columns={["User ID", "Name", "Role", "Email", "Phone", "Registered", "Status"]}
          rows={filtered}
          renderRow={(s, i) => (
            <tr key={s.id}>
              <td style={{...td(i), fontFamily:C.mono, fontSize:11, color:C.blue, maxWidth:170, overflow:"hidden", textOverflow:"ellipsis"}}>{s.id}</td>
              <td style={{...td(i), color:C.text, fontSize:13, fontWeight:600}}>{s.name}</td>
              <td style={{...td(i), fontSize:12, color:C.text}}>{s.roleLabel}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:11, color:C.blue}}>{s.email}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:11, color:C.muted}}>{s.phone}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:11, color:C.muted}}>{formatDate(s.createdAt)}</td>
              <td style={td(i)}><Badge status={s.status} /></td>
            </tr>
          )}
        />
      </Card>

      <div style={{ marginTop:14, color:C.muted, fontFamily:C.mono, fontSize:11 }}>
        This page now reads from MongoDB users. Demo staff data is no longer displayed here.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EMERGENCY TRIAGE
// ═══════════════════════════════════════════════════════════════════════════════
function EmergencyPage() {
  const TRIAGE_COLORS = { "Critical":"#F87171", "Urgent":"#FB923C", "Semi-urgent":"#FBBF24", "Non-urgent":"#34D399" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title="Emergency Triage Queue" subtitle={`${EMERGENCY_DATA.length} patients · Live`}
        action={<div style={{ display:"flex", gap:8 }}>
          <div style={{ display:"flex", gap:6, alignItems:"center", padding:"6px 14px", background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:8 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:C.red, animation:"none" }} />
            <span style={{ fontFamily:C.mono, fontSize:11, color:C.red }}>LIVE</span>
          </div>
          <AmberBtn>+ Register Patient</AmberBtn>
        </div>} />

      {/* Triage legend */}
      <div style={{ display:"flex", gap:10 }}>
        {Object.entries(TRIAGE_COLORS).map(([level, color]) => (
          <div key={level} style={{ display:"flex", gap:6, alignItems:"center", padding:"5px 12px", background:`${color}15`, border:`1px solid ${color}44`, borderRadius:8 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:color }} />
            <span style={{ fontFamily:C.mono, fontSize:11, color }}>{level}</span>
          </div>
        ))}
      </div>

      {/* Queue cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {EMERGENCY_DATA.map((em, idx) => {
          const tc = TRIAGE_COLORS[em.triage] || C.muted;
          return (
            <div key={em.id} style={{ background:C.surface, border:`1px solid ${tc}33`, borderLeft:`4px solid ${tc}`, borderRadius:16, padding:"18px 24px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                  <div style={{ fontFamily:C.serif, fontSize:28, color:tc, fontWeight:700, minWidth:36 }}>#{idx + 1}</div>
                  <div>
                    <div style={{ fontSize:15, color:C.text, fontWeight:600 }}>{em.patient}</div>
                    <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, marginTop:2 }}>
                      Arrived {em.arrived} · Waiting {em.wait > 0 ? `${em.wait} min` : "NOW"}
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <Badge status={em.triage} />
                  <span style={{ fontFamily:C.mono, fontSize:11, color:C.muted, background:"rgba(255,255,255,0.05)", padding:"3px 10px", borderRadius:6 }}>{em.status}</span>
                </div>
              </div>
              <div style={{ display:"flex", gap:24, marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}` }}>
                <div><div style={{ fontFamily:C.mono, fontSize:9, color:C.muted, textTransform:"uppercase", marginBottom:3 }}>Complaint</div><div style={{ fontSize:12, color:C.text }}>{em.complaint}</div></div>
                <div><div style={{ fontFamily:C.mono, fontSize:9, color:C.muted, textTransform:"uppercase", marginBottom:3 }}>Doctor</div><div style={{ fontSize:12, color: em.doctor==="Unassigned" ? C.amber : C.text }}>{em.doctor}</div></div>
                <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                  <GhostBtn color={C.green}>Assign Doctor</GhostBtn>
                  <GhostBtn color={C.blue}>Move to Ward</GhostBtn>
                  {em.triage === "Critical" && <GhostBtn color={C.red}>RESUS !</GhostBtn>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PRESCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════════
function PrescriptionsPage() {
  const [showModal, setShowModal] = useState(false);
  const [printModal, setPrintModal] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = PRESCRIPTIONS_DATA.filter(r =>
    Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title="Prescriptions" subtitle={`${filtered.length} prescriptions`}
        action={<AmberBtn onClick={() => setShowModal(true)}>+ New Prescription</AmberBtn>} />

      <SearchBar value={search} onChange={setSearch} placeholder="Search prescriptions..." />

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {filtered.map(rx => (
          <Card key={rx.id} style={{ padding:"22px 26px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <div style={{ fontFamily:C.mono, fontSize:12, color:C.blue, marginBottom:4 }}>{rx.id}</div>
                <div style={{ fontFamily:C.serif, fontSize:16, color:C.text, fontWeight:700 }}>{rx.patient}</div>
                <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted }}>{rx.doctor} · {rx.date}</div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Badge status={rx.status} />
                <GhostBtn onClick={() => setPrintModal(rx)} color={C.amber}>🖨 Print</GhostBtn>
              </div>
            </div>

            <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr", padding:"8px 16px", background:"rgba(0,0,0,0.2)" }}>
                {["Medicine","Dosage","Frequency","Duration"].map(h => (
                  <div key={h} style={{ fontFamily:C.mono, fontSize:9, color:C.faint, textTransform:"uppercase", letterSpacing:".06em" }}>{h}</div>
                ))}
              </div>
              {rx.medicines.map((m,i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr", padding:"10px 16px", borderTop: i>0 ? `1px solid ${C.border}`:0 }}>
                  <div style={{ fontSize:13, color:C.text, fontWeight:500 }}>{m.name}</div>
                  <div style={{ fontFamily:C.mono, fontSize:12, color:C.muted }}>{m.dose}</div>
                  <div style={{ fontFamily:C.mono, fontSize:12, color:C.amber }}>{m.freq}</div>
                  <div style={{ fontFamily:C.mono, fontSize:12, color:C.muted }}>{m.dur}</div>
                </div>
              ))}
            </div>
            {rx.notes && <div style={{ marginTop:12, fontSize:12, color:C.muted, fontStyle:"italic", paddingLeft:4 }}>📝 {rx.notes}</div>}
          </Card>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Prescription" width={640}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
          <FormField label="Patient"><Select value="" onChange={() => {}} options={[{value:"",label:"Select patient"},...PATIENTS_DATA.map(p => ({value:p.id,label:p.name}))]} style={{width:"100%"}} /></FormField>
          <FormField label="Doctor"><Select value="" onChange={() => {}} options={[{value:"",label:"Select doctor"},...DOCTORS_DATA.map(d => ({value:d.id,label:d.name}))]} style={{width:"100%"}} /></FormField>
        </div>
        <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>Medicines</div>
        {[0,1,2].map(i => (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr", gap:8, marginBottom:8 }}>
            <TextInput value="" onChange={() => {}} placeholder="Medicine name" />
            <TextInput value="" onChange={() => {}} placeholder="Dose" />
            <TextInput value="" onChange={() => {}} placeholder="Frequency" />
            <TextInput value="" onChange={() => {}} placeholder="Duration" />
          </div>
        ))}
        <FormField label="Notes"><TextInput value="" onChange={() => {}} placeholder="Special instructions..." /></FormField>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <AmberBtn onClick={() => setShowModal(false)}>Issue Prescription</AmberBtn>
          <GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn>
        </div>
      </Modal>

      {/* Print Modal */}
      <Modal open={!!printModal} onClose={() => setPrintModal(null)} title="Prescription Print View" width={480}>
        {printModal && (
          <div style={{ fontFamily:C.mono }}>
            <div style={{ textAlign:"center", marginBottom:20, paddingBottom:16, borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontFamily:C.serif, fontSize:20, color:C.amber, fontWeight:700 }}>Hargeisa Group Hospital</div>
              <div style={{ fontSize:11, color:C.muted }}>Hargeisa · Somaliland</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              {[["Patient",printModal.patient],["Doctor",printModal.doctor],["Date",printModal.date],["Rx ID",printModal.id]].map(([l,v]) => (
                <div key={l}><div style={{ fontSize:9, color:C.muted, textTransform:"uppercase", letterSpacing:".06em" }}>{l}</div><div style={{ fontSize:13, color:C.text, marginTop:2 }}>{v}</div></div>
              ))}
            </div>
            <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, overflow:"hidden", marginBottom:12 }}>
              {printModal.medicines.map((m,i) => (
                <div key={i} style={{ padding:"10px 14px", borderBottom: i < printModal.medicines.length-1 ? `1px solid ${C.border}` : 0 }}>
                  <div style={{ fontSize:13, color:C.text, fontWeight:600 }}>{m.name}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{m.dose} · {m.freq} · {m.dur}</div>
                </div>
              ))}
            </div>
            {printModal.notes && <div style={{ fontSize:12, color:C.muted, fontStyle:"italic", marginBottom:16 }}>⚠ {printModal.notes}</div>}
            <AmberBtn onClick={() => setPrintModal(null)}>🖨 Print</AmberBtn>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BILLING
// ═══════════════════════════════════════════════════════════════════════════════
function BillingPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);

  const total = BILLS_DATA.reduce((s,b) => s + b.total, 0);
  const paid  = BILLS_DATA.filter(b => b.status === "paid").reduce((s,b) => s + b.total, 0);

  const filtered = BILLS_DATA.filter(b =>
    (statusFilter === "all" || b.status === statusFilter) &&
    Object.values(b).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title="Billing & Invoices" subtitle={`${filtered.length} invoices`}
        action={<div style={{ display:"flex", gap:10 }}><GhostBtn onClick={() => exportCSV(filtered,"invoices")}>⬇ Export</GhostBtn><AmberBtn onClick={() => setShowModal(true)}>+ New Invoice</AmberBtn></div>} />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          {label:"Total Billed",  val:`$${total}`,       color:C.blue },
          {label:"Collected",     val:`$${paid}`,        color:C.green},
          {label:"Outstanding",   val:`$${total-paid}`,  color:C.red  },
          {label:"Invoices",      val:BILLS_DATA.length, color:C.amber},
        ].map(s => (
          <Card key={s.label} style={{ padding:"16px 20px" }}>
            <div style={{ fontFamily:C.mono, fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontFamily:C.serif, fontSize:26, color:s.color, fontWeight:700 }}>{s.val}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search invoices..." />
        <Select value={statusFilter} onChange={setStatusFilter} options={[{value:"all",label:"All Status"},{value:"paid",label:"Paid"},{value:"unpaid",label:"Unpaid"},{value:"partially paid",label:"Partial"},{value:"cancelled",label:"Cancelled"}]} />
      </div>

      <Card>
        <DataTable
          columns={["Invoice","Patient","Appointment","Total","Method","Status","Date","Action"]}
          rows={filtered}
          renderRow={(b,i) => (
            <tr key={b.id}>
              <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.blue}}>{b.id}</td>
              <td style={{...td(i), color:C.text, fontSize:13, fontWeight:500}}>{b.patient}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.muted}}>{b.apt}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:13, color:C.text, fontWeight:700}}>{b.total ? `$${b.total}` : "—"}</td>
              <td style={{...td(i), fontSize:12, color:C.muted}}>{b.method}</td>
              <td style={td(i)}><Badge status={b.status} /></td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:11, color:C.muted}}>{b.date}</td>
              <td style={td(i)}>{b.status === "unpaid" && <GhostBtn color={C.green}>Mark Paid</GhostBtn>}</td>
            </tr>
          )} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Invoice">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <FormField label="Patient"><Select value="" onChange={() => {}} options={[{value:"",label:"Select patient"},...PATIENTS_DATA.map(p => ({value:p.id,label:p.name}))]} style={{width:"100%"}} /></FormField>
          <FormField label="Appointment"><Select value="" onChange={() => {}} options={[{value:"",label:"Select appointment"},...APPOINTMENTS_DATA.map(a => ({value:a.id,label:`${a.id} · ${a.patient}`}))]} style={{width:"100%"}} /></FormField>
          <FormField label="Consultation Fee"><TextInput value="" onChange={() => {}} placeholder="0.00" /></FormField>
          <FormField label="Additional Services"><TextInput value="" onChange={() => {}} placeholder="Lab, X-Ray etc." /></FormField>
          <FormField label="Discount ($)"><TextInput value="" onChange={() => {}} placeholder="0.00" /></FormField>
          <FormField label="Payment Method"><Select value="" onChange={() => {}} options={[{value:"",label:"Select"},{value:"Cash",label:"Cash"},{value:"Card",label:"Card"},{value:"Insurance",label:"Insurance"}]} style={{width:"100%"}} /></FormField>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <AmberBtn onClick={() => setShowModal(false)}>Generate Invoice</AmberBtn>
          <GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DOCTORS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function DoctorsPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const filtered = DOCTORS_DATA.filter(d =>
    Object.values(d).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title="Medical Staff" subtitle={`${filtered.length} doctors`}
        action={<div style={{ display:"flex", gap:10 }}><GhostBtn onClick={() => exportCSV(filtered,"doctors")}>⬇ Export</GhostBtn><AmberBtn onClick={() => setShowModal(true)}>+ New Doctor</AmberBtn></div>} />
      <SearchBar value={search} onChange={setSearch} placeholder="Search doctors..." />
      <Card>
        <DataTable
          columns={["Doctor ID","Name","Specialization","Department","Fee","Availability","Patients","Rating","Status"]}
          rows={filtered}
          renderRow={(d,i) => (
            <tr key={d.id}>
              <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.blue}}>{d.id}</td>
              <td style={{...td(i), color:C.text, fontSize:13, fontWeight:500}}>{d.name}</td>
              <td style={{...td(i), fontSize:12, color:C.muted}}>{d.spec}</td>
              <td style={{...td(i), fontSize:12, color:C.muted}}>{d.dept}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:13, color:C.green, fontWeight:700}}>${d.fee}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:11, color:C.muted}}>{d.avail}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:13, color:C.text, textAlign:"center"}}>{d.patients}</td>
              <td style={{...td(i), fontFamily:C.mono, fontSize:13, color:C.amber}}>★ {d.rating}</td>
              <td style={td(i)}><Badge status={d.status} /></td>
            </tr>
          )} />
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Doctor">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {[["Full Name",""],["Specialization","e.g. Cardiologist"],["Email",""],["Phone",""],["Consultation Fee",""],["Available Days","e.g. Mon Wed Fri"]].map(([l,ph]) => (
            <FormField key={l} label={l}><TextInput value="" onChange={() => {}} placeholder={ph} /></FormField>
          ))}
          <FormField label="Department"><Select value="" onChange={() => {}} options={[{value:"",label:"Select dept"},...["Cardiology","Neurology","Pediatrics","Orthopedics","Dermatology"].map(d=>({value:d,label:d}))]} style={{width:"100%"}} /></FormField>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <AmberBtn onClick={() => setShowModal(false)}>Add Doctor</AmberBtn>
          <GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  REPORTS & ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════
function ReportsPage() {
  const maxRev = Math.max(...MONTHLY_REVENUE);
  const maxPat = Math.max(...MONTHLY_PATIENTS);
  const deptMax = Math.max(...[12400,9800,8200,6100,3600]);
  const deptData = [
    {dept:"Cardiology",rev:12400},{dept:"Neurology",rev:9800},{dept:"Orthopedics",rev:8200},
    {dept:"Pediatrics",rev:6100},{dept:"Dermatology",rev:3600}
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title="Reports & Analytics" subtitle="Year-to-date · 2026"
        action={<div style={{ display:"flex", gap:8 }}><GhostBtn>⬇ Export PDF</GhostBtn><GhostBtn>⬇ Export Excel</GhostBtn></div>} />

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
        {[
          {label:"YTD Revenue",     val:"$340K",  delta:"+18%",  color:C.green },
          {label:"Total Patients",  val:"1,284",  delta:"+14%",  color:C.blue  },
          {label:"Appointments",    val:"3,847",  delta:"+22%",  color:C.amber },
          {label:"Avg Bill",        val:"$218",   delta:"+5%",   color:C.purple},
          {label:"Avg Wait Time",   val:"14 min", delta:"-8%",   color:C.teal  },
        ].map(s => (
          <Card key={s.label} style={{ padding:"16px 18px" }}>
            <div style={{ fontFamily:C.mono, fontSize:9, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontFamily:C.serif, fontSize:22, color:s.color, fontWeight:700, marginBottom:2 }}>{s.val}</div>
            <div style={{ fontFamily:C.mono, fontSize:10, color: s.delta.startsWith("-") && s.label!=="Avg Wait Time" ? C.red : C.green }}>{s.delta} YoY</div>
          </Card>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:16 }}>
        {/* Revenue chart */}
        <Card style={{ padding:"22px 26px" }}>
          <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:20 }}>Monthly Revenue · 2026 ($)</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:130 }}>
            {MONTHLY_REVENUE.map((v, i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                <div style={{ fontSize:8, color:C.muted, fontFamily:C.mono, opacity: i === 3 ? 1 : 0 }}>${Math.round(v/1000)}K</div>
                <div style={{ width:"100%", borderRadius:4, background: i===3 ? C.amber : "rgba(96,165,250,0.35)", height:`${(v/maxRev)*100}%`, minHeight:4 }} />
                <div style={{ fontSize:9, color:C.faint, fontFamily:C.mono }}>{MONTHS[i]}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Dept revenue */}
        <Card style={{ padding:"22px 24px" }}>
          <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:20 }}>Revenue by Department</div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {deptData.map((d, i) => {
              const colors = [C.amber, C.blue, C.green, C.purple, C.teal];
              return (
                <div key={d.dept}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontFamily:C.mono, fontSize:11, color:C.text }}>{d.dept}</span>
                    <span style={{ fontFamily:C.mono, fontSize:11, color:colors[i] }}>${(d.rev/1000).toFixed(1)}K</span>
                  </div>
                  <div style={{ height:5, background:"rgba(255,255,255,0.07)", borderRadius:4 }}>
                    <div style={{ height:"100%", width:`${(d.rev/deptMax)*100}%`, background:colors[i], borderRadius:4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Patient growth */}
        <Card style={{ padding:"22px 26px" }}>
          <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:20 }}>Patient Growth · 2026</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:100 }}>
            {MONTHLY_PATIENTS.map((v, i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ width:"100%", borderRadius:3, background: `rgba(52,211,153,${0.3 + (v/maxPat)*0.7})`, height:`${(v/maxPat)*100}%`, minHeight:4 }} />
                <div style={{ fontSize:9, color:C.faint, fontFamily:C.mono }}>{MONTHS[i]}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Doctor performance */}
        <Card style={{ padding:"22px 24px" }}>
          <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:16 }}>Doctor Performance</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {DOCTORS_DATA.filter(d=>d.status==="Active").map(d => (
              <div key={d.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 12px", background:"rgba(255,255,255,0.04)", borderRadius:10 }}>
                <div>
                  <div style={{ fontSize:12, color:C.text, fontWeight:500 }}>{d.name}</div>
                  <div style={{ fontSize:10, fontFamily:C.mono, color:C.muted }}>{d.spec}</div>
                </div>
                <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:C.mono, fontSize:12, color:C.text }}>{d.patients} patients</div>
                    <div style={{ fontFamily:C.mono, fontSize:10, color:C.amber }}>★ {d.rating}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════
function NotificationsPage({ notifications, setNotifications }) {
  const TYPE_ICONS = { urgent:"🚨", alert:"⚠️", reminder:"🔔", billing:"💳" };
  const TYPE_COLORS = { urgent:C.red, alert:"#FB923C", reminder:C.blue, billing:C.green };
  const unread = notifications.filter(n => !n.read).length;

  const markAll = () => setNotifications(ns => ns.map(n => ({...n, read:true})));
  const markOne = id => setNotifications(ns => ns.map(n => n.id === id ? {...n, read:true} : n));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title="Notification Center" subtitle={`${unread} unread`}
        action={<GhostBtn onClick={markAll}>Mark all read</GhostBtn>} />

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {notifications.map(n => {
          const col = TYPE_COLORS[n.type] || C.muted;
          return (
            <div key={n.id} onClick={() => markOne(n.id)} style={{ background: n.read ? C.surface : `rgba(${n.type==="urgent"?"248,113,113":n.type==="alert"?"251,146,60":n.type==="reminder"?"96,165,250":"52,211,153"},0.07)`, border:`1px solid ${n.read ? C.border : col+"44"}`, borderLeft:`4px solid ${n.read ? C.border : col}`, borderRadius:14, padding:"16px 20px", cursor:"pointer", transition:"all .15s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                  <span style={{ fontSize:18 }}>{TYPE_ICONS[n.type]}</span>
                  <div>
                    <div style={{ fontSize:13, color: n.read ? C.muted : C.text, fontWeight: n.read ? 400 : 600 }}>{n.msg}</div>
                    <div style={{ fontFamily:C.mono, fontSize:10, color:C.muted, marginTop:3 }}>{n.time}</div>
                  </div>
                </div>
                {!n.read && <div style={{ width:8, height:8, borderRadius:"50%", background:col, flexShrink:0, marginTop:4 }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsPage() {
  const [tab, setTab] = useState("hospital");
  const tabs = ["hospital","departments","roles","services","notifications"];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader title="Settings & Configuration" subtitle="System administration" />

      <div style={{ display:"flex", gap:4 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab===t ? C.amberBg : "transparent", border: tab===t ? `1px solid rgba(245,158,11,0.3)` : `1px solid transparent`, borderRadius:10, padding:"8px 18px", color: tab===t ? C.amber : C.muted, fontFamily:C.mono, fontSize:11, cursor:"pointer", textTransform:"capitalize", fontWeight: tab===t ? 700 : 400 }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "hospital" && (
        <Card style={{ padding:"28px 32px" }}>
          <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:20 }}>Hospital Profile</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {[["Hospital Name","Hargeisa Group Hospital"],["Registration No.","HSL-2021-0441"],["Phone","+252 63 440 0000"],["Email","info@hargeisagrouphospital.so"],["Address","Airport Road, Hargeisa"],["City / Region","Hargeisa, Somaliland"],["Country","Somalia / Somaliland"],["Website","hargeisahospital.so"]].map(([l,v]) => (
              <FormField key={l} label={l}><TextInput value={v} onChange={() => {}} /></FormField>
            ))}
          </div>
          <div style={{ marginTop:8 }}><AmberBtn>Save Changes</AmberBtn></div>
        </Card>
      )}

      {tab === "departments" && (
        <Card>
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".06em" }}>Departments</div>
            <AmberBtn small>+ Add Department</AmberBtn>
          </div>
          <DataTable
            columns={["Dept ID","Name","Head","Staff","Beds","Action"]}
            rows={[
              {id:"DEP-01",name:"Cardiology",head:"Dr. Khadar Ali",staff:8,beds:8},
              {id:"DEP-02",name:"Neurology",head:"Dr. Bashir Omar",staff:6,beds:6},
              {id:"DEP-03",name:"Orthopedics",head:"Dr. Layla Ahmed",staff:5,beds:10},
              {id:"DEP-04",name:"Pediatrics",head:"Dr. Sahra Warsam",staff:7,beds:12},
              {id:"DEP-05",name:"Dermatology",head:"Dr. Abdullahi H.",staff:3,beds:0},
              {id:"DEP-06",name:"Laboratory",head:"Lab Dir. Bashir",staff:4,beds:0},
              {id:"DEP-07",name:"Pharmacy",head:"Chief Pharm. Hodan",staff:3,beds:0},
            ]}
            renderRow={(d,i) => (
              <tr key={d.id}>
                <td style={{...td(i), fontFamily:C.mono, fontSize:12, color:C.blue}}>{d.id}</td>
                <td style={{...td(i), color:C.text, fontSize:13, fontWeight:500}}>{d.name}</td>
                <td style={{...td(i), fontSize:12, color:C.muted}}>{d.head}</td>
                <td style={{...td(i), fontFamily:C.mono, fontSize:13, color:C.text, textAlign:"center"}}>{d.staff}</td>
                <td style={{...td(i), fontFamily:C.mono, fontSize:13, color:C.text, textAlign:"center"}}>{d.beds}</td>
                <td style={td(i)}><GhostBtn color={C.amber}>Edit</GhostBtn></td>
              </tr>
            )} />
        </Card>
      )}

      {tab === "roles" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {[
            {role:"Admin",perms:["Full system access","User management","Reports","Settings","All modules"]},
            {role:"Doctor",perms:["View own appointments","Medical records","Prescriptions","Lab requests","Patient history"]},
            {role:"Receptionist",perms:["Patient registration","Appointment booking","Billing","View schedules"]},
            {role:"Nurse",perms:["Patient vitals","Ward management","View prescriptions","Lab samples"]},
          ].map(r => (
            <Card key={r.role} style={{ padding:"20px 22px" }}>
              <div style={{ fontFamily:C.serif, fontSize:16, color:C.amber, fontWeight:700, marginBottom:12 }}>{r.role}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {r.perms.map(p => (
                  <div key={p} style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ color:C.green, fontSize:12 }}>✓</span>
                    <span style={{ fontSize:12, color:C.muted }}>{p}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "services" && (
        <Card style={{ padding:"22px 26px" }}>
          <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:16 }}>Pricing & Services</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[["Consultation - General","$50"],["Consultation - Specialist","$120–$200"],["ECG","$60"],["X-Ray","$100"],["MRI","$350"],["Blood Test - CBC","$30"],["Urinalysis","$20"],["Bed / Day - General Ward","$80"],["Bed / Day - ICU","$250"]].map(([s,p]) => (
              <div key={s} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"rgba(255,255,255,0.03)", borderRadius:10 }}>
                <span style={{ fontSize:13, color:C.text }}>{s}</span>
                <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                  <span style={{ fontFamily:C.mono, fontSize:13, color:C.green, fontWeight:700 }}>{p}</span>
                  <GhostBtn color={C.amber} small>Edit</GhostBtn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "notifications" && (
        <Card style={{ padding:"22px 28px" }}>
          <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:20 }}>Notification Settings</div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {[
              ["Low stock alerts","Send when medicine stock below minimum","on"],
              ["Appointment reminders","Notify 24h before scheduled appointments","on"],
              ["Lab result notifications","Alert when urgent lab results arrive","on"],
              ["Unpaid bill reminders","Remind on overdue invoices > 3 days","on"],
              ["Emergency alerts","Real-time ER triage updates","on"],
              ["Daily reports","Summary email at end of day","off"],
            ].map(([title, desc, state]) => (
              <div key={title} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", background:"rgba(255,255,255,0.03)", borderRadius:12 }}>
                <div>
                  <div style={{ fontSize:13, color:C.text, fontWeight:500 }}>{title}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{desc}</div>
                </div>
                <div style={{ width:40, height:22, borderRadius:11, background: state==="on" ? C.amber : "rgba(255,255,255,0.1)", cursor:"pointer", position:"relative" }}>
                  <div style={{ position:"absolute", top:3, left: state==="on" ? 20 : 3, width:16, height:16, borderRadius:"50%", background:"white", transition:"left .2s" }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:16 }}><AmberBtn>Save Settings</AmberBtn></div>
        </Card>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
//  USER APPROVALS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function UserApprovalsPage() {
  const ROLE_OPTIONS = [
    { value:"staff", label:"Staff" },
    { value:"doctor", label:"Doctor" },
    { value:"nurse", label:"Nurse" },
    { value:"receptionist", label:"Receptionist" },
    { value:"admin", label:"Admin" },
  ];

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/users");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load users");
      }

      setUsers(Array.isArray(data) ? data : []);
      setRoles((current) => {
        const next = { ...current };
        (Array.isArray(data) ? data : []).forEach((u) => {
          if (!next[u._id]) next[u._id] = u.role && u.role !== "pending" && u.role !== "rejected" ? u.role : "staff";
        });
        return next;
      });
    } catch (err) {
      setError(err.message || "Unable to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateRole = (userId, role) => {
    setRoles((r) => ({ ...r, [userId]: role }));
  };

  const submitAction = async (userId, action) => {
    setBusyId(`${action}-${userId}`);
    setMessage("");
    setError("");

    try {
      const body = {
        userId,
        action,
        role: action === "approve" ? (roles[userId] || "staff") : "staff",
      };

      const response = await fetch("/api/approve-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Action failed");
      }

      setMessage(data.message || (action === "approve" ? "User approved successfully" : "User rejected successfully"));
      await loadUsers();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusyId("");
    }
  };

  const normalizedSearch = search.trim().toLowerCase();

  const filteredUsers = users.filter((u) => {
    const matchesSearch = !normalizedSearch || [u.fullName, u.email, u.phone, u.role, u.status]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(normalizedSearch));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && u.status === "Pending Approval") ||
      (statusFilter === "active" && u.status === "Active") ||
      (statusFilter === "rejected" && u.status === "Rejected");

    return matchesSearch && matchesStatus;
  });

  const pendingCount = users.filter((u) => u.status === "Pending Approval").length;
  const activeCount = users.filter((u) => u.status === "Active").length;
  const rejectedCount = users.filter((u) => u.status === "Rejected").length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <SectionHeader
        title="User Approvals"
        subtitle="Review staff registration requests, approve users, reject users, and assign roles."
        action={<AmberBtn onClick={loadUsers}>Refresh Users</AmberBtn>}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        {[
          { label:"Pending Approval", value:pendingCount, icon:"⏳", color:C.amber },
          { label:"Active Users", value:activeCount, icon:"✅", color:C.green },
          { label:"Rejected", value:rejectedCount, icon:"⛔", color:C.red },
        ].map((s) => (
          <Card key={s.label} style={{ padding:"20px 22px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:16, right:18, fontSize:24, opacity:.42 }}>{s.icon}</div>
            <div style={{ fontFamily:C.mono, fontSize:10, color:C.muted, letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>{s.label}</div>
            <div style={{ fontFamily:C.serif, fontSize:30, fontWeight:700, color:C.text, lineHeight:1 }}>{s.value}</div>
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${s.color}66,transparent)` }} />
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontFamily:C.mono, fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:".06em" }}>Registered Users</div>
            <div style={{ fontSize:12, color:C.faint, marginTop:4 }}>Passwords are hidden. Only approval status and role are shown.</div>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search users..." width={240} />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value:"all", label:"All Statuses" },
                { value:"pending", label:"Pending" },
                { value:"active", label:"Active" },
                { value:"rejected", label:"Rejected" },
              ]}
            />
          </div>
        </div>

        {message && (
          <div style={{ margin:"14px 20px 0", background:"rgba(52,211,153,0.12)", border:"1px solid rgba(52,211,153,0.35)", color:C.green, padding:"10px 14px", borderRadius:10, fontFamily:C.mono, fontSize:12 }}>
            ✅ {message}
          </div>
        )}

        {error && (
          <div style={{ margin:"14px 20px 0", background:"rgba(248,113,113,0.12)", border:"1px solid rgba(248,113,113,0.35)", color:C.red, padding:"10px 14px", borderRadius:10, fontFamily:C.mono, fontSize:12 }}>
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding:48, textAlign:"center", color:C.muted, fontFamily:C.mono, fontSize:13 }}>Loading registered users...</div>
        ) : (
          <DataTable
            columns={["Name", "Contact", "Requested", "Status", "Role", "Action"]}
            rows={filteredUsers}
            pageSize={10}
            renderRow={(u, i) => {
              const isPending = u.status === "Pending Approval";
              const created = u.createdAt ? new Date(u.createdAt).toLocaleString() : "—";
              return (
                <tr key={u._id}>
                  <td style={td(i)}>
                    <div style={{ color:C.text, fontSize:13, fontWeight:600 }}>{u.fullName || "Unnamed User"}</div>
                    <div style={{ color:C.faint, fontSize:10, fontFamily:C.mono, marginTop:3 }}>ID: {u._id}</div>
                  </td>
                  <td style={td(i)}>
                    <div style={{ color:C.blue, fontSize:12, fontFamily:C.mono }}>{u.email || "—"}</div>
                    <div style={{ color:C.muted, fontSize:11, marginTop:3 }}>{u.phone || "—"}</div>
                  </td>
                  <td style={{ ...td(i), color:C.muted, fontSize:11, fontFamily:C.mono }}>{created}</td>
                  <td style={td(i)}><Badge status={u.status || "Pending"} /></td>
                  <td style={td(i)}>
                    {isPending ? (
                      <Select
                        value={roles[u._id] || "staff"}
                        onChange={(role) => updateRole(u._id, role)}
                        options={ROLE_OPTIONS}
                        style={{ minWidth:145 }}
                      />
                    ) : (
                      <span style={{ color:C.text, fontFamily:C.mono, fontSize:12, textTransform:"capitalize" }}>{u.role || "—"}</span>
                    )}
                  </td>
                  <td style={td(i)}>
                    {isPending ? (
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        <button
                          onClick={() => submitAction(u._id, "approve")}
                          disabled={Boolean(busyId)}
                          style={{ background:C.green, border:"none", borderRadius:8, padding:"7px 12px", color:"#06281D", fontFamily:C.mono, fontSize:11, fontWeight:800, cursor:busyId ? "not-allowed" : "pointer" }}
                        >
                          {busyId === `approve-${u._id}` ? "Approving..." : "Approve"}
                        </button>
                        <button
                          onClick={() => submitAction(u._id, "reject")}
                          disabled={Boolean(busyId)}
                          style={{ background:"rgba(248,113,113,0.14)", border:"1px solid rgba(248,113,113,0.35)", borderRadius:8, padding:"7px 12px", color:C.red, fontFamily:C.mono, fontSize:11, fontWeight:800, cursor:busyId ? "not-allowed" : "pointer" }}
                        >
                          {busyId === `reject-${u._id}` ? "Rejecting..." : "Reject"}
                        </button>
                      </div>
                    ) : (
                      <span style={{ color:C.faint, fontFamily:C.mono, fontSize:11 }}>No action needed</span>
                    )}
                  </td>
                </tr>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  NAV CONFIG + RBAC
// ═══════════════════════════════════════════════════════════════════════════════
const ALL_NAV = [
  { id:"dashboard",     label:"Dashboard",       icon:"⬡", roles:["admin","doctor","receptionist","nurse","staff"] },
  { id:"emergency",     label:"Emergency",        icon:"🚨", roles:["admin","doctor","nurse","staff"] },
  { id:"patients",      label:"Patients",         icon:"👥", roles:["admin","doctor","receptionist","nurse","staff"] },
  { id:"appointments",  label:"Appointments",     icon:"📅", roles:["admin","doctor","receptionist","staff"] },
  { id:"inpatients",    label:"Inpatients",       icon:"🏥", roles:["admin","doctor","nurse","staff"] },
  { id:"prescriptions", label:"Prescriptions",    icon:"💊", roles:["admin","doctor"] },
  { id:"laboratory",    label:"Laboratory",       icon:"🔬", roles:["admin","doctor","nurse","staff"] },
  { id:"pharmacy",      label:"Pharmacy",         icon:"💉", roles:["admin","receptionist","nurse","staff"] },
  { id:"staff",         label:"Staff",            icon:"👔", roles:["admin"] },
  { id:"approvals",     label:"User Approvals",   icon:"✅", roles:["admin"] },
  { id:"doctors",       label:"Doctors",          icon:"🩺", roles:["admin","receptionist"] },
  { id:"billing",       label:"Billing",          icon:"💳", roles:["admin","receptionist"] },
  { id:"reports",       label:"Reports",          icon:"📊", roles:["admin"] },
  { id:"notifications", label:"Notifications",    icon:"🔔", roles:["admin","doctor","receptionist","nurse","staff"] },
  { id:"settings",      label:"Settings",         icon:"⚙️", roles:["admin"] },
];

const PAGE_TITLES = {
  dashboard:"Operations Overview", patients:"Patient Registry", doctors:"Medical Staff",
  appointments:"Appointment Schedule", billing:"Billing & Invoices", pharmacy:"Pharmacy & Inventory",
  laboratory:"Laboratory", inpatients:"Inpatient Management", staff:"Staff & Nurses",
  prescriptions:"Prescriptions", emergency:"Emergency Triage", reports:"Reports & Analytics",
  notifications:"Notification Center", settings:"Settings", approvals:"User Approvals", patient_profile:"Patient Profile",
};



// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function PublicLoginPage({ onLogin, onShowRegister }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (!data.user) {
        throw new Error("Login succeeded but user information was missing");
      }

      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(circle at top, rgba(245,158,11,0.10), transparent 34%), ${C.bg}`,
      color: C.text,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: C.sans,
    }}>
      <Card style={{
        width: "100%",
        maxWidth: 500,
        padding: 32,
        boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 58,
            height: 58,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${C.amber}, ${C.amberD})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
            color: "#0F172A",
            fontSize: 26,
            fontWeight: 800,
          }}>
            H
          </div>

          <h1 style={{
            fontFamily: C.serif,
            fontSize: 30,
            margin: 0,
            color: C.text,
          }}>
            Hargeisa Group Hospital
          </h1>

          <p style={{
            margin: "8px 0 0",
            color: C.muted,
            fontFamily: C.mono,
            fontSize: 12,
          }}>
            Authorized Staff Login
          </p>
        </div>

        <form onSubmit={submitLogin}>
          <FormField label="Email">
            <TextInput
              value={form.email}
              onChange={(v) => update("email", v)}
              placeholder="name@example.com"
            />
          </FormField>

          <FormField label="Password">
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Enter your password"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                color: C.text,
                fontFamily: C.mono,
                fontSize: 12,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </FormField>

          {error && (
            <div style={{
              background: "rgba(248,113,113,0.12)",
              border: "1px solid rgba(248,113,113,0.35)",
              color: C.red,
              padding: "10px 14px",
              borderRadius: 10,
              fontFamily: C.mono,
              fontSize: 12,
              marginBottom: 14,
            }}>
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? C.faint : C.amber,
              border: "none",
              borderRadius: 12,
              padding: "12px 18px",
              color: "#0F172A",
              fontFamily: C.mono,
              fontSize: 13,
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: ".04em",
            }}
          >
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>

        <div style={{
          marginTop: 20,
          textAlign: "center",
          color: C.muted,
          fontFamily: C.mono,
          fontSize: 11,
          lineHeight: 1.7,
        }}>
          Not registered yet?{" "}
          <button
            onClick={onShowRegister}
            style={{
              background: "transparent",
              border: "none",
              color: C.amber,
              fontFamily: C.mono,
              fontSize: 11,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Request account access
          </button>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC REGISTER PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function PublicRegisterPage() {
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setMessage(data.message || "Registration successful. Waiting for admin approval.");
      setForm({
        fullName: "",
        phone: "",
        email: "",
        password: "",
      });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.text,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: C.sans,
    }}>
      <Card style={{
        width: "100%",
        maxWidth: 520,
        padding: 32,
        boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 58,
            height: 58,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${C.amber}, ${C.amberD})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
            color: "#0F172A",
            fontSize: 26,
            fontWeight: 800,
          }}>
            H
          </div>

          <h1 style={{
            fontFamily: C.serif,
            fontSize: 28,
            margin: 0,
            color: C.text,
          }}>
            Hargeisa Group Hospital
          </h1>

          <p style={{
            margin: "8px 0 0",
            color: C.muted,
            fontFamily: C.mono,
            fontSize: 12,
          }}>
            Staff Registration Request
          </p>
        </div>

        <form onSubmit={submitRegister}>
          <FormField label="Full Name">
            <TextInput
              value={form.fullName}
              onChange={(v) => update("fullName", v)}
              placeholder="Enter your full name"
            />
          </FormField>

          <FormField label="Phone">
            <TextInput
              value={form.phone}
              onChange={(v) => update("phone", v)}
              placeholder="0634000000"
            />
          </FormField>

          <FormField label="Email">
            <TextInput
              value={form.email}
              onChange={(v) => update("email", v)}
              placeholder="name@example.com"
            />
          </FormField>

          <FormField label="Password">
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Minimum 6 characters"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                color: C.text,
                fontFamily: C.mono,
                fontSize: 12,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </FormField>

          {message && (
            <div style={{
              background: "rgba(52,211,153,0.12)",
              border: "1px solid rgba(52,211,153,0.35)",
              color: C.green,
              padding: "10px 14px",
              borderRadius: 10,
              fontFamily: C.mono,
              fontSize: 12,
              marginBottom: 14,
            }}>
              ✅ {message}
            </div>
          )}

          {error && (
            <div style={{
              background: "rgba(248,113,113,0.12)",
              border: "1px solid rgba(248,113,113,0.35)",
              color: C.red,
              padding: "10px 14px",
              borderRadius: 10,
              fontFamily: C.mono,
              fontSize: 12,
              marginBottom: 14,
            }}>
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? C.faint : C.amber,
              border: "none",
              borderRadius: 12,
              padding: "12px 18px",
              color: "#0F172A",
              fontFamily: C.mono,
              fontSize: 13,
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: ".04em",
            }}
          >
            {loading ? "REGISTERING..." : "REGISTER"}
          </button>
        </form>

        <div style={{
          marginTop: 20,
          textAlign: "center",
          color: C.muted,
          fontFamily: C.mono,
          fontSize: 11,
          lineHeight: 1.6,
        }}>
          Your account will be reviewed by the hospital admin before access is approved.
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  APP SHELL
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const getInitials = (name = "User") =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  const normalizeSessionUser = (rawUser) => {
    if (!rawUser) return null;
    const name = rawUser.fullName || rawUser.name || "Hospital User";
    return {
      ...rawUser,
      name,
      fullName: name,
      role: rawUser.role || "staff",
      avatar: rawUser.avatar || getInitials(name),
      dept: rawUser.dept || "Hospital Staff",
    };
  };

  const [authUser, setAuthUser] = useState(() => {
    try {
      return normalizeSessionUser(JSON.parse(localStorage.getItem("hgh_auth_user") || "null"));
    } catch {
      return null;
    }
  });

  const [page, setPage] = useState("dashboard");
  const [collapsed, setSidebarCollapsed] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [notifications, setNotifications] = useState(NOTIFICATIONS_DATA);

  const query = new URLSearchParams(window.location.search);
  const isPublicRegister = window.location.pathname === "/register" || query.get("register") === "1";
  const isPublicLogin = window.location.pathname === "/login" || query.get("login") === "1";

  const handleLogin = (loggedInUser) => {
    const sessionUser = normalizeSessionUser(loggedInUser);
    localStorage.setItem("hgh_auth_user", JSON.stringify(sessionUser));
    setAuthUser(sessionUser);
    setPage("dashboard");
    window.history.replaceState({}, "", window.location.pathname === "/login" ? "/" : window.location.pathname);
  };

  const handleLogout = () => {
    localStorage.removeItem("hgh_auth_user");
    setAuthUser(null);
    setPage("dashboard");
    window.history.replaceState({}, "", "/");
  };

  if (isPublicRegister) {
    return <PublicRegisterPage />;
  }

  if (!authUser || isPublicLogin) {
    return (
      <PublicLoginPage
        onLogin={handleLogin}
        onShowRegister={() => {
          window.history.pushState({}, "", "/?register=1");
          window.location.reload();
        }}
      />
    );
  }

  const user = authUser;

  const unreadCount = notifications.filter(n => !n.read).length;

  const visibleNav = ALL_NAV.filter(n => n.roles.includes(user.role));

  const handleViewPatient = (p) => { setSelectedPatient(p); setPage("patient_profile"); };
  const handleBack = () => { setSelectedPatient(null); setPage("patients"); };

  const renderPage = () => {
    if (page === "patient_profile" && selectedPatient) return <PatientProfile patient={selectedPatient} onBack={handleBack} />;
    switch (page) {
      case "dashboard":     return <Dashboard role={user.role} />;
      case "patients":      return <PatientsPage onViewPatient={handleViewPatient} />;
      case "doctors":       return <DoctorsPage />;
      case "appointments":  return <AppointmentsPage />;
      case "billing":       return <BillingPage />;
      case "pharmacy":      return <PharmacyPage />;
      case "laboratory":    return <LaboratoryPage />;
      case "inpatients":    return <InpatientsPage />;
      case "staff":         return <StaffPage />;
      case "approvals":     return <UserApprovalsPage />;
      case "prescriptions": return <PrescriptionsPage />;
      case "emergency":     return <EmergencyPage />;
      case "reports":       return <ReportsPage />;
      case "notifications": return <NotificationsPage notifications={notifications} setNotifications={setNotifications} />;
      case "settings":      return <SettingsPage />;
      default:              return <Dashboard role={user.role} />;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { background:#080F1A; color:#E2E8F0; font-family:'DM Sans',sans-serif; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#0F172A; }
        ::-webkit-scrollbar-thumb { background:#1E3A5F; border-radius:4px; }
        input::placeholder, textarea::placeholder { color:#334155; }
        select option { background:#0D1B2E; color:#E2E8F0; }
        tr { transition: background .12s; }
        tr:hover td { background:rgba(245,158,11,0.04) !important; }
      `}</style>

      <div style={{ display:"flex", height:"100vh", background:"#080F1A", overflow:"hidden" }}>
        {/* ── SIDEBAR ── */}
        <aside style={{ width: collapsed ? 60 : 224, background:`linear-gradient(180deg,#0D1B2E 0%,#080F1A 100%)`, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", transition:"width .22s", flexShrink:0, zIndex:20 }}>
          {/* Logo */}
          <div style={{ padding: collapsed ? "20px 0" : "20px 18px", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid rgba(255,255,255,0.05)`, marginBottom:4 }}>
            <div style={{ width:34, height:34, background:`linear-gradient(135deg,${C.amber},${C.amberD})`, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:15 }}>⬡</div>
            {!collapsed && <div><div style={{ fontFamily:C.serif, fontSize:14, color:C.text, lineHeight:1.1 }}>HargeisaHospital</div><div style={{ fontFamily:C.mono, fontSize:8, color:C.muted, letterSpacing:".1em", textTransform:"uppercase" }}>HMS · v3.0</div></div>}
          </div>

          {/* Signed-in user */}
          {!collapsed && (
            <div style={{ padding:"10px 14px", marginBottom:2 }}>
              <div style={{ background:"rgba(245,158,11,0.08)", border:`1px solid rgba(245,158,11,0.2)`, borderRadius:8, padding:"8px 10px" }}>
                <div style={{ color:C.amber, fontFamily:C.mono, fontSize:10, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {user.name}
                </div>
                <div style={{ color:C.muted, fontFamily:C.mono, fontSize:9, marginTop:3, textTransform:"capitalize" }}>
                  {user.role} · {user.status || "Active"}
                </div>
                <button onClick={handleLogout} style={{ marginTop:8, width:"100%", background:"rgba(248,113,113,0.10)", border:"1px solid rgba(248,113,113,0.25)", borderRadius:7, color:C.red, fontFamily:C.mono, fontSize:10, fontWeight:700, cursor:"pointer", padding:"6px 8px" }}>
                  Logout
                </button>
              </div>
            </div>
          )}

          {/* Nav */}
          <nav style={{ flex:1, padding:"4px 0", overflowY:"auto", overflowX:"hidden" }}>
            {visibleNav.map(n => {
              const active = page === n.id;
              const isNotif = n.id === "notifications";
              return (
                <button key={n.id} onClick={() => setPage(n.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding: collapsed ? "11px 0" : "10px 16px", justifyContent: collapsed ? "center" : "flex-start", background: active ? C.amberBg : "transparent", borderLeft:`2px solid ${active ? C.amber : "transparent"}`, border:"none", borderLeft:`2px solid ${active ? C.amber : "transparent"}`, cursor:"pointer", color: active ? C.amber : C.muted, fontSize:13, fontFamily:C.sans, fontWeight: active ? 600 : 400, transition:"all .12s", position:"relative" }}>
                  <span style={{ fontSize:15, flexShrink:0 }}>{n.icon}</span>
                  {!collapsed && <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{n.label}</span>}
                  {isNotif && unreadCount > 0 && (
                    <div style={{ position:"absolute", top:8, left: collapsed ? 30 : "auto", right: collapsed ? "auto" : 14, background:C.red, color:"white", fontFamily:C.mono, fontSize:9, fontWeight:700, width:16, height:16, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {unreadCount}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Collapse */}
          <button onClick={() => setSidebarCollapsed(!collapsed)} style={{ margin:"12px", background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, cursor:"pointer", fontFamily:C.mono, fontSize:11, padding:"8px" }}>
            {collapsed ? "→" : "← Collapse"}
          </button>
        </aside>

        {/* ── MAIN ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {/* Header */}
          <header style={{ padding:"13px 28px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(8,15,26,0.9)", backdropFilter:"blur(14px)", flexShrink:0 }}>
            <div>
              <div style={{ fontFamily:C.mono, fontSize:10, color:C.faint, letterSpacing:".1em", textTransform:"uppercase" }}>Thursday, 23 April 2026</div>
              <div style={{ fontFamily:C.serif, fontSize:17, color:C.text, marginTop:1 }}>
                {PAGE_TITLES[page] || "Hopital HGH"}
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {/* ER badge */}
              <div style={{ fontFamily:C.mono, fontSize:10, color:C.red, background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.25)", borderRadius:7, padding:"5px 12px", cursor:"pointer" }} onClick={() => setPage("emergency")}>
                🚨 ER: 5 patients
              </div>
              {/* Online */}
              <div style={{ fontFamily:C.mono, fontSize:10, color:C.muted, background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, borderRadius:7, padding:"5px 12px" }}>
                🟢 Online
              </div>
              {/* Notif bell */}
              <div onClick={() => setPage("notifications")} style={{ position:"relative", cursor:"pointer", width:34, height:34, borderRadius:9, background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                🔔
                {unreadCount > 0 && <div style={{ position:"absolute", top:-3, right:-3, background:C.red, color:"white", fontFamily:C.mono, fontSize:9, fontWeight:700, width:16, height:16, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>{unreadCount}</div>}
              </div>
              {/* Avatar */}
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 12px 5px 5px", background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:22 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${C.amberD},#92400E)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:C.mono, fontSize:11, fontWeight:700, color:"white" }}>{user.avatar}</div>
                <div>
                  <div style={{ fontFamily:C.mono, fontSize:10, color:C.text, lineHeight:1 }}>{user.name}</div>
                  <div style={{ fontFamily:C.mono, fontSize:9, color:C.amber, lineHeight:1, marginTop:1, textTransform:"capitalize" }}>{user.role}</div>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
            {renderPage()}
          </main>
        </div>
      </div>
    </>
  );
}
