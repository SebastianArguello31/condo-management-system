import parsePhoneNumber from "libphonenumber-js/max";

export function parsePhone(value, country = "PY") {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  try {
    return parsePhoneNumber(value.trim(), {
      defaultCountry: country,
      extract: false,
    });
  } catch {
    return undefined;
  }
}

export function isValidPhone(value, country = "PY") {
  const phone = parsePhone(value, country);

  return Boolean(
    phone &&
    !phone.ext &&
    phone.isValid()
  );
}

export function formatPhone(value, country = "PY") {
  if (!value) return "";

  const phone = parsePhone(value, country);

  return phone?.isValid()
    ? phone.formatInternational()
    : String(value);
}

export function phoneHref(value, country = "PY") {
  const phone = parsePhone(value, country);

  if (!phone || phone.ext || !phone.isValid()) {
    return undefined;
  }

  return phone.getURI();
}