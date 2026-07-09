export function slugify(...parts) {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function donorDocId(donor) {
  const phone = (donor.phone || '').replace(/\D/g, '');
  if (phone) return `seed-donor-${phone}`;
  return `seed-donor-${slugify(donor.name, donor.blood, donor.location)}`;
}

export function requestDocId(req) {
  return `seed-req-${slugify(req.hospital, req.blood, req.date, req.time)}`;
}

export function notificationDocId(notif) {
  return `seed-notif-${slugify(notif.type, notif.title)}`;
}

export function donorKey(data) {
  if (data.uid) return `uid:${data.uid}`;
  const phone = (data.phone || '').replace(/\D/g, '');
  if (phone) return `phone:${phone}`;
  return `name:${data.name}|${data.blood}|${data.location}`;
}

export function requestKey(data) {
  return `${data.hospital}|${data.blood}|${data.date}|${data.time}|${data.location}`;
}

export function notificationKey(data) {
  return `${data.type}|${data.title}|${data.msg}`;
}
