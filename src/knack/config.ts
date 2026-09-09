// Values below come from the Knack MCP server at setup time. They are not secrets:
// the app id and OAuth client id are public identifiers. The app's private REST API
// key is deliberately absent — it must never reach the browser.

export const KNACK_API_BASE = "https://api.knack.com";
export const KNACK_API = `${KNACK_API_BASE}/v1`;
export const KNACK_APP_ID = "6aa04444b6577f098d9dae6e";
export const KNACK_OAUTH_CLIENT_ID = "6aa0c5a72f97ed92438f4232";
export const REDIRECT_PATH = "/auth/callback";

export const OBJ = {
  accounts: "object_1",
  patients: "object_4",
  providers: "object_5",
  appointments: "object_6",
  documents: "object_7",
  clinicAdmins: "object_8",
} as const;

export const F = {
  patient: {
    name: "field_30", email: "field_31", status: "field_33",
    dob: "field_41", phone: "field_42", insurance: "field_43",
    contact: "field_44", intake: "field_45", active: "field_58",
  },
  provider: {
    name: "field_46", email: "field_47", status: "field_49",
    specialty: "field_57", accepting: "field_59",
  },
  appointment: {
    date: "field_60", visitType: "field_61", status: "field_62",
    notes: "field_63", duration: "field_64",
    patient: "field_81", provider: "field_82",
  },
  document: {
    title: "field_71", file: "field_72", uploaded: "field_73",
    docType: "field_74", patient: "field_83",
  },
  admin: { name: "field_84", email: "field_85", status: "field_87" },
} as const;

// Copied verbatim from each field's format.options. Knack matches multiple_choice
// values case-sensitively, so these must never be retyped, capitalised or guessed.
export const CHOICES = {
  visitType: ["Annual Physical", "Follow-Up", "Telehealth", "Urgent"],
  apptStatus: ["Cancelled", "Completed", "No-Show", "Scheduled"],
  docType: ["Imaging", "Insurance", "Lab Result", "Referral"],
  insurance: ["Aetna", "Blue Cross", "Cigna", "Self-Pay", "United"],
  contactMethod: ["Email", "Phone", "Text"],
  specialty: ["Cardiology", "Dermatology", "Pediatrics", "Primary Care"],
  userStatus: ["active", "inactive", "pending approval"],
} as const;

export const PROFILE = {
  patient: "profile_4",
  provider: "profile_5",
  admin: "profile_8",
  generic: "all_users",
} as const;

// profileKey -> the user-role object holding that role's record.
// session.user.id is the *account* id (object_1) and is rejected by connection
// fields pointing at a role object, so we resolve a per-role record id after login.
export const profileToObject: Record<string, string> = {
  [PROFILE.patient]: OBJ.patients,
  [PROFILE.provider]: OBJ.providers,
  [PROFILE.admin]: OBJ.clinicAdmins,
};

export const roleRoutes: Record<string, string> = {
  [PROFILE.generic]: "/welcome",
  [PROFILE.patient]: "/patient",
  [PROFILE.provider]: "/provider",
  [PROFILE.admin]: "/admin",
};

export const roleLabels: Record<string, string> = {
  [PROFILE.generic]: "Pending approval",
  [PROFILE.patient]: "Patient",
  [PROFILE.provider]: "Provider",
  [PROFILE.admin]: "Clinic Admin",
};
