export const INQUIRY_LIMITS = Object.freeze({
  name: 120,
  email: 254,
  phone: 40,
  city: 120,
  projectType: 120,
  budget: 120,
  timeline: 120,
  details: 5000,
  website: 200,
  submissionId: 128,
});

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function hasOnlyKeys(value, allowed) {
  return isObject(value) && Object.keys(value).every((key) => allowed.includes(key));
}

export function validateInquiry(body) {
  if (!hasOnlyKeys(body, [...Object.keys(INQUIRY_LIMITS), 'consent'])) {
    return { error: { ok: false, message: 'Send a JSON object containing only the supported inquiry fields.' } };
  }
  if (body.website !== undefined && (typeof body.website !== 'string' || body.website.length > INQUIRY_LIMITS.website)) {
    return { error: { ok: false, message: 'Please check the form and try again.', fields: { website: 'Invalid field.' } } };
  }
  // Deliberately indistinguishable success for a filled spam trap; nothing is saved.
  if (body.website?.trim()) return { honeypot: true };

  const fields = {};
  const data = {};
  for (const [key, max] of Object.entries(INQUIRY_LIMITS)) {
    if (key === 'website') continue;
    const value = body[key] === undefined ? '' : body[key];
    if (typeof value !== 'string') {
      fields[key] = 'Use text for this field.';
      continue;
    }
    data[key] = value.trim().normalize('NFC');
    const controls = key === 'details' ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/;
    if (value.length > max || data[key].length > max) fields[key] = `Use ${max} characters or fewer.`;
    else if (controls.test(value)) fields[key] = 'Remove unsupported characters.';
  }
  for (const key of ['name', 'city', 'projectType', 'details']) {
    if (!data[key] && !fields[key]) fields[key] = 'This field is required.';
  }
  if (!data.email && !data.phone) {
    fields.email ||= 'Provide an email address or phone number.';
    fields.phone ||= 'Provide an email address or phone number.';
  }
  if (data.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email)) {
    fields.email = 'Enter a valid email address.';
  }
  if (data.phone) {
    const digits = data.phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 20 || !/^[+\d()\s.\-xet#]+$/i.test(data.phone)) {
      fields.phone = 'Enter a valid phone number.';
    }
  }
  if (data.submissionId && !/^[A-Za-z0-9._:-]{8,128}$/.test(data.submissionId)) {
    fields.submissionId = 'Use an 8–128 character submission ID containing letters, numbers, dots, hyphens, colons, or underscores.';
  }
  if (body.consent !== true) fields.consent = 'Please agree to being contacted about your inquiry.';
  if (Object.keys(fields).length) {
    return { error: { ok: false, message: 'Please check the highlighted fields.', fields } };
  }
  data.consent = true;
  return { data };
}
