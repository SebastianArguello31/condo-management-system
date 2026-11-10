const pad2 = (value) => String(value).padStart(2, "0");

const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const SOLO_HORA = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

export function parseLocalDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string") return null;

  const raw = value.trim();
  if (!raw) return null;

  const match = SOLO_FECHA.exec(raw);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);

    if (year < 1 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }

    return date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
  const date = parseLocalDate(value);
  if (!date) return "";

  return [
    pad2(date.getDate()),
    pad2(date.getMonth() + 1),
    String(date.getFullYear()).padStart(4, "0"),
  ].join("/");
}

export function formatTime(value) {
  if (typeof value === "string") {
    const match = SOLO_HORA.exec(value.trim());

    if (match) {
      return `${match[1]}:${match[2]}`;
    }
  }

  const date = parseLocalDate(value);
  if (!date) return "";

  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatDateTime(value) {
  const date = parseLocalDate(value);
  if (!date) return "";

  return `${formatDate(date)} ${formatTime(date)}`;
}

export function displayDateToISO(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return "";

  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  return parseLocalDate(iso) ? iso : "";
}